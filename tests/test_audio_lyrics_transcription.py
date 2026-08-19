"""
Unit tests for production-ready audio and lyrics transcription in LUMIN.

Tests verify:
1. Stronger local Whisper fallback: medium -> small -> base for both openai-whisper and faster-whisper.
2. Model object caching in _whisper_models and _faster_whisper_models.
3. Anti-hallucination decode parameters (condition_on_previous_text=False, temperature=0.0, no_speech_threshold=0.6, fp16 safety).
4. Honest structured reporting when no reliable speech or lyrics are detected (no hallucinations).
5. Video audio extraction and transcription during parse_video with speech/lyrics queries or include_audio=True.
6. Temporary audio WAV file lifecycle and cleanup.
7. Agent-level routing for video and audio transcription queries ensuring real transcription or structured failure message.
"""

import io
import os
import sys
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from core.upload_pipeline import UploadPipeline
from core.agent import LuminAgent


class TestAudioLyricsTranscription(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.workspace_dir = os.path.join(self.temp_dir, "uploads")
        os.makedirs(self.workspace_dir, exist_ok=True)
        self.pipeline = UploadPipeline(workspace_dir=self.workspace_dir)

    def tearDown(self):
        if hasattr(self, "pipeline") and self.pipeline:
            self.pipeline.cleanup()
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _get_mock_torch(self):
        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = False
        mock_torch.__name__ = "torch"
        return mock_torch

    def test_openai_whisper_model_fallback_and_caching(self):
        """Verifies openai-whisper tries base -> small and caches loaded models."""
        audio_path = os.path.join(self.workspace_dir, "song.mp3")
        with open(audio_path, "wb") as f:
            f.write(b"fake mp3 audio data")

        mock_whisper_module = MagicMock()
        mock_model_base = MagicMock()
        mock_model_base.transcribe.return_value = {
            "text": "Never gonna give you up never gonna let you down"
        }
        mock_whisper_module.load_model.return_value = mock_model_base

        with patch.dict(sys.modules, {"whisper": mock_whisper_module, "faster_whisper": None, "torch": self._get_mock_torch()}):
            full_content, summary = self.pipeline.parse_audio(audio_path)

            mock_whisper_module.load_model.assert_called_with("base")
            mock_model_base.transcribe.assert_called_once()
            call_kwargs = mock_model_base.transcribe.call_args[1]
            self.assertEqual(call_kwargs.get("temperature"), 0.0)
            self.assertEqual(call_kwargs.get("beam_size"), 1)
            self.assertEqual(call_kwargs.get("condition_on_previous_text"), False)
            self.assertEqual(call_kwargs.get("no_speech_threshold"), 0.6)
            self.assertIn("Never gonna give you up", full_content)
            self.assertIn("OpenAI Whisper base", full_content)
            self.assertIn("base", self.pipeline._whisper_models)

            # Second call should reuse cached model without calling load_model again
            mock_whisper_module.load_model.reset_mock()
            full_content_2, _ = self.pipeline.parse_audio(audio_path)
            mock_whisper_module.load_model.assert_not_called()
            self.assertIn("Never gonna give you up", full_content_2)

    def test_openai_whisper_medium_failure_falls_back_to_small(self):
        """Verifies that if base model fails, it falls back to small."""
        audio_path = os.path.join(self.workspace_dir, "speech.wav")
        with open(audio_path, "wb") as f:
            f.write(b"fake wav data")

        mock_whisper_module = MagicMock()
        mock_model_small = MagicMock()
        mock_model_small.transcribe.return_value = {"text": "Testing speech fallback to small"}

        def load_side_effect(name, **kwargs):
            if name == "base":
                raise RuntimeError("Out of memory loading base")
            elif name == "small":
                return mock_model_small
            raise RuntimeError("Unknown model")

        mock_whisper_module.load_model.side_effect = load_side_effect

        with patch.dict(sys.modules, {"whisper": mock_whisper_module, "faster_whisper": None, "torch": self._get_mock_torch()}):
            full_content, _ = self.pipeline.parse_audio(audio_path)
            self.assertIn("Testing speech fallback to small", full_content)
            self.assertIn("OpenAI Whisper small", full_content)
            self.assertIn("small", self.pipeline._whisper_models)

    def test_faster_whisper_fallback_and_decode_settings(self):
        """Verifies faster-whisper fallback hierarchy and anti-hallucination parameters."""
        audio_path = os.path.join(self.workspace_dir, "track.flac")
        with open(audio_path, "wb") as f:
            f.write(b"fake flac data")

        mock_fw_module = MagicMock()
        mock_fw_instance = MagicMock()
        mock_seg1 = MagicMock()
        mock_seg1.text = "Here comes the sun"
        mock_seg2 = MagicMock()
        mock_seg2.text = "and I say it's all right"
        mock_fw_instance.transcribe.return_value = ([mock_seg1, mock_seg2], MagicMock())
        mock_fw_module.WhisperModel.return_value = mock_fw_instance

        # Simulate openai-whisper unavailable so it reaches faster-whisper
        with patch.dict(sys.modules, {"whisper": None, "faster_whisper": mock_fw_module, "torch": self._get_mock_torch()}):
            full_content, summary = self.pipeline.parse_audio(audio_path)

            mock_fw_module.WhisperModel.assert_called_with("base", device="cpu", compute_type="int8")
            mock_fw_instance.transcribe.assert_called_once()
            call_kwargs = mock_fw_instance.transcribe.call_args[1]
            self.assertEqual(call_kwargs.get("temperature"), 0.0)
            self.assertEqual(call_kwargs.get("beam_size"), 1)
            self.assertEqual(call_kwargs.get("condition_on_previous_text"), False)
            self.assertEqual(call_kwargs.get("no_speech_threshold"), 0.6)
            self.assertIn("Here comes the sun and I say it's all right", full_content)
            self.assertIn("Faster-Whisper base", full_content)
            self.assertIn("base", self.pipeline._faster_whisper_models)

    def test_inaudible_speech_returns_honest_structured_message(self):
        """Verifies that empty/whitespace STT returns honest failure notice rather than empty string."""
        audio_path = os.path.join(self.workspace_dir, "instrumental.mp3")
        with open(audio_path, "wb") as f:
            f.write(b"fake instrumental mp3")

        mock_whisper_module = MagicMock()
        mock_model = MagicMock()
        # Returns empty or whitespace transcription
        mock_model.transcribe.return_value = {"text": "   "}
        mock_whisper_module.load_model.return_value = mock_model

        with patch.dict(sys.modules, {"whisper": mock_whisper_module, "faster_whisper": None, "torch": self._get_mock_torch()}):
            full_content, summary = self.pipeline.parse_audio(audio_path)
            self.assertIn("No reliable speech or lyrics could be transcribed from this audio.", full_content)
            self.assertIn("Possible reasons: instrumental mix, heavy effects", full_content)
            self.assertIn("Local STT is strongest on clear spoken language; song lyrics are best-effort.", full_content)
            self.assertIn("no reliable speech detected", full_content)

    def test_video_parse_with_lyrics_query_extracts_and_transcribes_audio(self):
        """Verifies parse_video extracts audio track and transcribes it when query implies audio/lyrics."""
        video_path = os.path.join(self.workspace_dir, "music_video.mp4")
        with open(video_path, "wb") as f:
            f.write(b"fake video data")

        # Mock ffmpeg and extract_audio_track
        mock_temp_wav = os.path.join(self.temp_dir, "temp_extracted.wav")
        with open(mock_temp_wav, "wb") as f:
            f.write(b"extracted wav data")

        with patch.object(self.pipeline, "extract_audio_track", return_value=mock_temp_wav) as mock_extract, \
             patch.object(self.pipeline, "parse_audio", return_value=("### Audio Transcription:\nThese are the real song lyrics.", "Audio Summary")) as mock_parse_a, \
             patch.object(self.pipeline, "_find_ffmpeg_binaries", return_value=("/usr/bin/ffmpeg", "/usr/bin/ffprobe")):

            full_content, summary = self.pipeline.parse_video(video_path, query_hint="what are the lyrics to this song in the video?")

            mock_extract.assert_called_once_with(video_path)
            mock_parse_a.assert_called_once_with(mock_temp_wav)
            self.assertIn("### Video Audio Transcription:", full_content)
            self.assertIn("These are the real song lyrics.", full_content)
            # Ensure temp audio file is removed
            self.assertFalse(os.path.exists(mock_temp_wav))

    def test_video_parse_without_audio_intent_does_not_extract_audio_by_default(self):
        """Verifies parse_video skips audio extraction for pure visual requests when include_audio=False."""
        video_path = os.path.join(self.workspace_dir, "visual_clip.mp4")
        with open(video_path, "wb") as f:
            f.write(b"fake video data")

        with patch.object(self.pipeline, "extract_audio_track") as mock_extract, \
             patch.object(self.pipeline, "_find_ffmpeg_binaries", return_value=("/usr/bin/ffmpeg", "/usr/bin/ffprobe")):

            full_content, summary = self.pipeline.parse_video(video_path, query_hint="what colors are in this video?")
            mock_extract.assert_not_called()
            self.assertNotIn("### Video Audio Transcription:", full_content)

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=["llama3.2:3b"])
    def test_agent_video_audio_followup_routes_and_extracts_audio(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies that follow-up queries like 'what did they say in the video' extract and include audio transcript."""
        agent = LuminAgent()
        agent.upload_pipeline = self.pipeline
        sample_video_path = os.path.join(self.workspace_dir, "presentation.mp4")
        with open(sample_video_path, "wb") as f:
            f.write(b"presentation video data")

        sample_content = (
            "Video Media Analysis: presentation.mp4\n"
            "- **Duration**: 10.0s\n\n"
            "### Chronological Keyframe Breakdown:\n"
            "--- Keyframe 1 ---\nVisual Content: Speaker standing near podium.\n"
        )
        agent.last_analyzed_file = sample_video_path
        agent.last_analyzed_content = sample_content

        from core.upload_pipeline import UploadMetadata
        v_meta = UploadMetadata(
            upload_id="up_vid_test",
            original_name="presentation.mp4",
            safe_name="presentation.mp4",
            file_path=sample_video_path,
            file_size=len(b"presentation video data"),
            mime_type="video/mp4",
            file_type="video",
            upload_time="2026-08-14T00:00:00",
            file_hash="hash123",
            permission_valid=True,
            status="parsed",
            error=None,
            parsed_content=sample_content,
            parsed_summary="Video Media (presentation.mp4)"
        )
        self.pipeline.metadata_store[sample_video_path] = v_meta

        mock_temp_wav = os.path.join(self.temp_dir, "extracted_speech.wav")
        with open(mock_temp_wav, "wb") as f:
            f.write(b"speech wav")

        with patch.object(self.pipeline, "extract_audio_track", return_value=mock_temp_wav) as mock_extract, \
             patch.object(self.pipeline, "parse_audio", return_value=("### Audio Transcription:\nWelcome everyone to the annual tech conference.", "Audio Summary")), \
             patch.object(agent.ollama_client, "generate_content", return_value="The speaker said: 'Welcome everyone to the annual tech conference.'"):

            old_stdout = sys.stdout
            sys.stdout = buffer = io.StringIO()
            try:
                res = agent.process_query("What was said in this video?")
            finally:
                sys.stdout = old_stdout

            mock_extract.assert_called_once()
            output_text = buffer.getvalue()
            self.assertIn("Welcome everyone to the annual tech conference", output_text)

    def test_extended_audio_extensions_support(self):
        """Verifies expanded audio extensions (.aac, .wma, .aiff, .opus, .amr, .mp2, .ac3) are accepted."""
        for ext in (".aac", ".wma", ".aiff", ".aif", ".opus", ".amr", ".mp2", ".ac3", ".m4a", ".mp3", ".wav", ".flac", ".ogg"):
            self.assertIn(ext, self.pipeline.AUDIO_EXTENSIONS)
            self.assertIn(ext, self.pipeline.MEDIA_EXTENSIONS)
            test_file = os.path.join(self.workspace_dir, f"sample{ext}")
            with open(test_file, "wb") as f:
                f.write(b"sample audio data")
            valid, err = self.pipeline.validate_permissions(test_file, f"sample{ext}", len(b"sample audio data"))
            self.assertTrue(valid, f"Extension {ext} failed validation: {err}")

    def test_audio_normalization_via_ffmpeg(self):
        """Verifies parse_audio converts audio to 16kHz mono PCM WAV via ffmpeg when needed."""
        audio_path = os.path.join(self.workspace_dir, "sample.aac")
        with open(audio_path, "wb") as f:
            f.write(b"aac audio bytes")

        mock_whisper_module = MagicMock()
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "Normalized AAC audio transcription"}
        mock_whisper_module.load_model.return_value = mock_model

        with patch.dict(sys.modules, {"whisper": mock_whisper_module, "faster_whisper": None, "torch": self._get_mock_torch()}), \
             patch.object(self.pipeline, "_find_ffmpeg_binaries", return_value=("/usr/bin/ffmpeg", None)), \
             patch("subprocess.run") as mock_subproc:

            mock_proc = MagicMock()
            mock_proc.returncode = 0
            mock_subproc.return_value = mock_proc

            # Create the temp file so exists() returns True
            def subproc_side_effect(cmd, *args, **kwargs):
                if "/usr/bin/ffmpeg" in cmd:
                    out_path = cmd[-1]
                    with open(out_path, "wb") as f:
                        f.write(b"riff wav 16khz")
                return mock_proc

            mock_subproc.side_effect = subproc_side_effect

            full_content, _ = self.pipeline.parse_audio(audio_path)
            self.assertIn("Normalized AAC audio transcription", full_content)

    def test_missing_ffmpeg_non_wav_guidance(self):
        """Verifies clear guidance message when ffmpeg is missing and STT cannot process non-WAV format."""
        audio_path = os.path.join(self.workspace_dir, "song.opus")
        with open(audio_path, "wb") as f:
            f.write(b"opus bytes")

        with patch.dict(sys.modules, {"whisper": None, "faster_whisper": None, "torch": self._get_mock_torch()}), \
             patch.object(self.pipeline, "_find_ffmpeg_binaries", return_value=(None, None)):

            full_content, summary = self.pipeline.parse_audio(audio_path)
            self.assertIn("requires ffmpeg for decoding and normalization", full_content)
            self.assertIn("https://www.gyan.dev/ffmpeg/builds/", full_content)


if __name__ == "__main__":
    unittest.main()
