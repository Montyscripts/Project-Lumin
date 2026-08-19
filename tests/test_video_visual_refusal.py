"""
Unit tests for visual content refusal elimination on uploaded videos and images.

Tests verify:
1. parse_video keyframe extraction uses strengthened technical visual query.
2. Canned visual content refusal strings from vision models are rejected and fallback to visual feature extractor.
3. describe_image tool uses strengthened technical visual prompt and filters canned refusals.
4. Final agent response path intercepts visual content refusals and outputs real chronological keyframe descriptions.
5. Inquiries like 'Describe this video' return extracted keyframe content when video context exists.
"""

import io
import os
import sys
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from core.agent import LuminAgent
from core.upload_pipeline import UploadPipeline
from tools.registry import ToolRegistry

class TestVideoVisualRefusal(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.workspace_dir = os.path.join(self.temp_dir, "uploads")
        os.makedirs(self.workspace_dir, exist_ok=True)

    def tearDown(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_describe_image_rejects_canned_refusal(self):
        """Ensures describe_image filters out model refusals and falls back to visual features."""
        registry = ToolRegistry(base_dir=self.workspace_dir)
        img_path = os.path.join(self.workspace_dir, "test_img.png")
        with open(img_path, "wb") as f:
            # Minimal 1x1 valid PNG
            f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7V\x01\x00\x00\x00\x00IEND\xaeB`\x82')

        # Mock Ollama returning a canned visual refusal
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"response": "I\'m sorry, but as per our guidelines, I cannot provide a description of any visual content or media."}'
        mock_resp.__enter__.return_value = mock_resp

        with patch("urllib.request.urlopen", return_value=mock_resp), \
             patch("urllib.request.Request"):
            result = registry.execute_tool("describe_image", img_path)
            res_str = result.output if hasattr(result, "output") else str(result)
            self.assertNotIn("cannot provide a description", res_str.lower())
            self.assertNotIn("as per our guidelines", res_str.lower())
            self.assertIn("Visual Overview", res_str)

    def test_parse_video_filters_refusal_and_uses_technical_prompt(self):
        """Ensures parse_video passes technical prompt to describe_image and handles frame refusals."""
        pipeline = UploadPipeline(workspace_dir=self.workspace_dir)
        
        # Test query passed in parse_video
        registry = MagicMock()
        # Returns refusal on first call, fallback to visual feature extractor
        registry.execute_tool.return_value = "I am sorry, but as per our guidelines, I cannot provide a description of any visual content."
        registry._analyze_image_visual_features.return_value = "Visual Content: Dominant hue is dark blue with high contrast scene objects."
        pipeline.tool_registry = registry

        video_path = os.path.join(self.workspace_dir, "sample.mp4")
        with open(video_path, "wb") as f:
            f.write(b"fake video content")

        frame1 = os.path.join(self.temp_dir, "frame1.jpg")
        frame2 = os.path.join(self.temp_dir, "frame2.jpg")
        with open(frame1, "wb") as f:
            f.write(b"jpgdata1")
        with open(frame2, "wb") as f:
            f.write(b"jpgdata2")

        def mock_subp_run(cmd, *args, **kwargs):
            m = MagicMock()
            m.returncode = 0
            if "-show_entries" in cmd:
                m.stdout = '{"format": {"duration": "4.0"}, "streams": [{"codec_type": "video", "width": 640, "height": 480, "codec_name": "h264", "r_frame_rate": "24/1"}]}'
            else:
                m.stdout = ""
                # frame extract command
                out_path = cmd[-1]
                with open(out_path, "wb") as f:
                    f.write(b"framejpg")
            return m

        with patch.object(pipeline, "_find_ffmpeg_binaries", return_value=("/usr/bin/ffmpeg", "/usr/bin/ffprobe")), \
             patch("subprocess.run", side_effect=mock_subp_run):
            full_content, summary = pipeline.parse_video(video_path)
            self.assertIn("Video Media Analysis", full_content)
            self.assertIn("--- Keyframe 1", full_content)
            self.assertNotIn("cannot provide a description", full_content.lower())
            self.assertIn("Dominant hue is dark blue", full_content)

            # Check that execute_tool was called with technical visual prompt
            call_kwargs = registry.execute_tool.call_args[1]
            self.assertIn("Technical visual analysis task", call_kwargs.get("query", ""))

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=["llama3.2:3b"])
    def test_agent_final_response_path_overrides_model_refusal_for_video(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies that if the LLM emits a visual refusal when asked 'Describe this video', the agent overrides it with extracted keyframes."""
        agent = LuminAgent()
        
        # Setup session with parsed video
        sample_video_content = (
            "Video Media Analysis: sample_clip.mp4\n"
            "- **Format**: MP4\n"
            "- **Duration**: 4.00s\n"
            "- **Resolution**: 640x480\n\n"
            "### Chronological Keyframe Breakdown:\n"
            "--- Keyframe 1 [Time: 00:01.2 (~30%)] ---\n"
            "Visual Content: A person walking across a modern office lobby wearing a blue jacket.\n\n"
            "--- Keyframe 2 [Time: 00:02.8 (~70%)] ---\n"
            "Visual Content: The person sitting at a glass desk typing on a silver laptop.\n"
        )
        agent.last_analyzed_file = "/fake/path/sample_clip.mp4"
        agent.last_analyzed_content = sample_video_content
        agent.last_analyzed_video = "/fake/path/sample_clip.mp4"
        agent.last_analyzed_video_description = sample_video_content

        # Simulate LLM returning a canned safety refusal
        with patch.object(agent.ollama_client, "generate_content", return_value="I'm sorry, but as per our guidelines, I cannot provide a description of any visual content or media."):
            old_stdout = sys.stdout
            sys.stdout = buffer = io.StringIO()
            try:
                res = agent.process_query("Describe this video")
            finally:
                sys.stdout = old_stdout

            output_text = buffer.getvalue()
            # Assert refusal is NOT in final response
            self.assertNotIn("cannot provide a description of any visual content", output_text.lower())
            self.assertNotIn("as per our guidelines", output_text.lower())
            # Assert real chronological keyframe breakdown IS in the output
            self.assertIn("Keyframe 1", output_text)
            self.assertIn("Keyframe 2", output_text)
            self.assertIn("person walking across a modern office lobby", output_text)
            self.assertIn("silver laptop", output_text)

if __name__ == "__main__":
    unittest.main()
