"""
Unit test suite for LUMIN AI Agent's File Upload / Summarize Pipeline.
Tests:
1. "Summarize this document" with no upload present -> returns fallback message.
2. Attachment upload + "Summarize this document" -> retrieves parsed content and formats context.
3. Multi-file comparison ("Compare these files") -> formats context for all uploaded files.
4. Upload pipeline sandbox and Protected Mode validation.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import patch, MagicMock
from core.agent import LuminAgent
from core.upload_pipeline import UploadPipeline, UploadMetadata

class TestUploadPipelineSummarize(unittest.TestCase):
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

    def test_process_file_sandboxing(self):
        test_file = os.path.join(self.temp_dir, "sample.txt")
        with open(test_file, "w", encoding="utf-8") as f:
            f.write("This is a sample text file stored in uploads.")

        meta = self.pipeline.process_file(test_file, original_name="sample.txt")
        self.assertTrue(meta.file_path.startswith(os.path.abspath(self.workspace_dir)))
        self.assertIn("This is a sample text file", meta.parsed_content)

    def test_format_ai_context(self):
        meta1 = UploadMetadata(
            "up_1", "doc1.txt", "doc1.txt",
            os.path.join(self.workspace_dir, "doc1.txt"),
            100, "text/plain", "text", "2026-08-04T12:00:00", "hash1",
            permission_valid=True, status="parsed", error=None,
            parsed_content="Content of document 1.", parsed_summary="Summary 1"
        )
        meta2 = UploadMetadata(
            "up_2", "doc2.txt", "doc2.txt",
            os.path.join(self.workspace_dir, "doc2.txt"),
            150, "text/plain", "text", "2026-08-04T12:00:00", "hash2",
            permission_valid=True, status="parsed", error=None,
            parsed_content="Content of document 2.", parsed_summary="Summary 2"
        )

        ctx = self.pipeline.format_ai_context([meta1, meta2])
        self.assertIn("2 ATTACHED FILE(S)", ctx)
        self.assertIn("doc1.txt", ctx)
        self.assertIn("Content of document 1.", ctx)
        self.assertIn("doc2.txt", ctx)
        self.assertIn("Content of document 2.", ctx)

    def test_get_recent_uploads(self):
        test_file1 = os.path.join(self.temp_dir, "file1.txt")
        with open(test_file1, "w", encoding="utf-8") as f:
            f.write("First file content.")
        self.pipeline.process_file(test_file1, original_name="file1.txt")

        recent = self.pipeline.get_recent_uploads(limit=5)
        self.assertEqual(len(recent), 1)
        self.assertEqual(recent[0].original_name, "file1.txt")

    def test_agent_no_doc_loaded_message(self):
        import io, sys
        agent = LuminAgent()
        # Ensure uploads folder clean
        if hasattr(agent, "upload_pipeline") and agent.upload_pipeline:
            agent.upload_pipeline.metadata_store.clear()
            if os.path.exists(agent.upload_pipeline.workspace_dir):
                for f in os.listdir(agent.upload_pipeline.workspace_dir):
                    if not f.startswith("."):
                        p = os.path.join(agent.upload_pipeline.workspace_dir, f)
                        if os.path.isfile(p):
                            os.remove(p)

        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        agent.process_query("Summarize this document.")
        sys.stdout = old_stdout
        out = buffer.getvalue()
        self.assertIn("No document is currently loaded. Please upload a file first.", out)

    def test_large_file_chunking_and_partial_status(self):
        # Create a large text file exceeding max character budget
        large_file = os.path.join(self.temp_dir, "large_text.txt")
        with open(large_file, "w", encoding="utf-8") as f:
            f.write("Line of content " * 3000)

        meta = self.pipeline.process_file(large_file, original_name="large_text.txt")
        self.assertEqual(meta.status, "partial")
        self.assertIn("[PARTIAL PARSE NOTICE", meta.parsed_content)
        self.assertIn("[PARTIAL PARSE]", meta.parsed_summary)

    def test_corrupted_pdf_rejection(self):
        corrupt_pdf = os.path.join(self.temp_dir, "broken.pdf")
        with open(corrupt_pdf, "wb") as f:
            f.write(b"NOT_A_VALID_PDF_HEADER_DATA_STREAM")

        meta = self.pipeline.process_file(corrupt_pdf, original_name="broken.pdf")
        self.assertEqual(meta.status, "corrupted")
        self.assertIn("Corrupted File", meta.error)

    def test_corrupted_docx_rejection(self):
        corrupt_docx = os.path.join(self.temp_dir, "broken.docx")
        with open(corrupt_docx, "wb") as f:
            f.write(b"PK\x03\x04INVALID_ZIP_STREAM")

        meta = self.pipeline.process_file(corrupt_docx, original_name="broken.docx")
        self.assertEqual(meta.status, "corrupted")
        self.assertIn("Corrupted File", meta.error)

    def test_unsupported_format_rejection(self):
        unsupported_file = os.path.join(self.temp_dir, "data.xyz")
        with open(unsupported_file, "w", encoding="utf-8") as f:
            f.write("Some unsupported data format.")

        meta = self.pipeline.process_file(unsupported_file, original_name="data.xyz")
        self.assertEqual(meta.status, "rejected")
        self.assertFalse(meta.permission_valid)
        self.assertIn("Unsupported Format", meta.error)

    def test_nested_archive_quarantine(self):
        import zipfile
        # Create inner zip
        inner_zip_path = os.path.join(self.temp_dir, "inner.zip")
        with zipfile.ZipFile(inner_zip_path, "w") as z_inner:
            z_inner.writestr("test.txt", "hello inner")

        # Create outer zip containing inner zip
        outer_zip_path = os.path.join(self.temp_dir, "outer.zip")
        with zipfile.ZipFile(outer_zip_path, "w") as z_outer:
            z_outer.write(inner_zip_path, arcname="inner.zip")

        meta = self.pipeline.process_file(outer_zip_path, original_name="outer.zip")
        self.assertEqual(meta.status, "quarantined")
        self.assertIn("Quarantined", meta.parsed_content)

    def test_resource_governor_structural_map_cap(self):
        from core.resource_governor import ResourceGovernor
        gov = ResourceGovernor()
        gov.is_feature_permitted = lambda feature: (False, "Memory pressure high") if feature == "large_structural_mapping" else (True, "")
        
        pipeline = UploadPipeline(workspace_dir=self.workspace_dir, resource_governor=gov)
        code_file = os.path.join(self.temp_dir, "large_code.py")
        with open(code_file, "w", encoding="utf-8") as f:
            f.write("def foo(): pass\n" * 500)

        struct_map = pipeline.generate_structural_map(code_file)
        self.assertIn("RESOURCE GOVERNANCE NOTICE", struct_map)
        self.assertIn("Memory pressure high", struct_map)

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=["llama3.2:3b"])
    def test_pdf_analysis_success_path(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies PDF analysis returns main claims, numerical data, and page references on a text-extractable PDF."""
        agent = LuminAgent()
        pdf_path = os.path.join(self.temp_dir, "sample_text.pdf")
        
        # Minimal valid PDF stream with extractable text and numerical data
        pdf_bytes = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 178 >>
stream
BT
/F1 12 Tf
100 700 Td
(In-Situ Resource Utilization ISRU is a critical capability. Electrolysis operates at 800 degrees Celsius with 98.5 percent efficiency yielding $15.4M savings.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000222 00000 n 
0000000295 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
523
%%EOF"""
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        res = agent._analyze_pdf(pdf_path, max_pages=10)
        self.assertIn("Main Claims & Key Findings", res)
        self.assertIn("Numerical Data & Metrics", res)
        self.assertIn("Page References & Detailed Content", res)
        self.assertIn("[Page 1]", res)

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=["llama3.2:3b"])
    def test_pdf_analysis_image_only_honest_failure(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies image-only or streamless PDF returns honest 'no extractable text' failure."""
        agent = LuminAgent()
        pdf_path = os.path.join(self.temp_dir, "image_only.pdf")
        
        # Minimal valid PDF structure with no Tj/TJ text streams
        pdf_bytes = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 12 >>
stream
BI /W 1 endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000166 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
230
%%EOF"""
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        res = agent._analyze_pdf(pdf_path, max_pages=10)
        self.assertIn("No extractable text found", res)

    def test_multi_file_comparison_context_and_simple_mode(self):
        """Verifies multi-file comparison formats context properly and respects simple mode."""
        f1 = os.path.join(self.temp_dir, "v1.py")
        with open(f1, "w", encoding="utf-8") as f:
            f.write("def calculate(a, b):\n    return a + b\n")

        f2 = os.path.join(self.temp_dir, "v2.py")
        with open(f2, "w", encoding="utf-8") as f:
            f.write("def calculate(a, b, mode='add'):\n    if mode == 'add':\n        return a + b\n    return a * b\n")

        m1 = self.pipeline.process_file(f1, original_name="v1.py")
        m2 = self.pipeline.process_file(f2, original_name="v2.py")

        recent = self.pipeline.get_recent_uploads(limit=2)
        self.assertEqual(len(recent), 2)

        # Verify compare_files simple mode
        report_simple = self.pipeline.compare_files([m1, m2], simple_mode=True)
        self.assertIn("Simple Plain-English Summary", report_simple)

        # Verify format_ai_context builds multi-file context for LLM
        ctx = self.pipeline.format_ai_context([m1, m2])
        self.assertIn("v1.py", ctx)
        self.assertIn("v2.py", ctx)
        self.assertIn("def calculate", ctx)

    def test_pptx_upload_and_extraction(self):
        """Verifies .pptx upload extracts slides, titles, and body content into parsed_content."""
        import zipfile
        pptx_path = os.path.join(self.temp_dir, "quarterly_review.pptx")
        with zipfile.ZipFile(pptx_path, "w") as z:
            z.writestr("ppt/slides/slide1.xml", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>Executive Summary</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Net profit increased by 18%</a:t></a:r></a:p>
          <a:p><a:r><a:t>New user acquisition grew 45%</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>""")
            z.writestr("ppt/slides/slide2.xml", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>Roadmap Deliverables</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Migrate database to cloud cluster</a:t></a:r></a:p>
          <a:p><a:r><a:t>Deploy mobile app in Q4</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>""")

        meta = self.pipeline.process_file(pptx_path, original_name="quarterly_review.pptx")
        self.assertEqual(meta.status, "parsed")
        self.assertEqual(meta.file_type, "presentation")
        self.assertIn("PowerPoint Presentation (2 slides)", meta.parsed_summary)
        self.assertIn("--- Slide 1: Executive Summary ---", meta.parsed_content)
        self.assertIn("Net profit increased by 18%", meta.parsed_content)
        self.assertIn("--- Slide 2: Roadmap Deliverables ---", meta.parsed_content)
        self.assertIn("Deploy mobile app in Q4", meta.parsed_content)

    def test_video_upload_and_keyframe_parsing(self):
        """Verifies video upload routes to parse_video and extracts stream metadata/keyframes."""
        # Generate a small 1-second test video using ffmpeg if available
        import shutil, subprocess
        video_path = os.path.join(self.temp_dir, "sample_clip.mp4")
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            # Create a 2-second test MP4 with testsrc
            cmd = [
                ffmpeg_bin, "-y", "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=10",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", video_path
            ]
            res = subprocess.run(cmd, capture_output=True)
            if res.returncode == 0 and os.path.exists(video_path):
                meta = self.pipeline.process_file(video_path, original_name="sample_clip.mp4")
                self.assertEqual(meta.status, "parsed")
                self.assertEqual(meta.file_type, "video")
                self.assertIn("Video Media Analysis:", meta.parsed_content)
                self.assertIn("320x240", meta.parsed_content)
                self.assertIn("Keyframes Analyzed", meta.parsed_content)
                self.assertIn("--- Keyframe 1", meta.parsed_content)
                self.assertIn("Video Media (sample_clip.mp4", meta.parsed_summary)
                return

        # Fallback test with dummy video file
        with open(video_path, "wb") as f:
            f.write(b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42")
        meta = self.pipeline.process_file(video_path, original_name="sample_clip.mp4")
        self.assertEqual(meta.file_type, "video")
        self.assertIn("Video Media", meta.parsed_summary)

    def test_video_missing_tools_honest_fallback(self):
        """Verifies that when ffmpeg and OpenCV are missing, an honest notice with install instructions is returned without hallucinated descriptions."""
        from unittest.mock import patch
        video_path = os.path.join(self.temp_dir, "dummy_video.mp4")
        with open(video_path, "wb") as f:
            f.write(b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00isommp42")

        with patch.object(self.pipeline, "_find_ffmpeg_binaries", return_value=(None, None)), patch.dict("sys.modules", {"cv2": None}):
            msg, summary = self.pipeline.parse_video(video_path)
            self.assertIn("Video keyframe analysis requires ffmpeg (recommended) or OpenCV", msg)
            self.assertIn("https://www.gyan.dev/ffmpeg/builds/", msg)
            self.assertIn("add the bin folder to your system PATH", msg)
            self.assertIn("Then upload the video again and I will describe it.", msg)
            self.assertIn("not installed", summary)
            # Ensure no hallucinated scenes or fake descriptions are present
            self.assertNotIn("Keyframe Breakdown", msg)
            self.assertNotIn("--- Keyframe", msg)

    def test_video_size_limit_raised_and_type_aware(self):
        """Verifies type-aware size limits: 1GB for video/media, 20MB for documents."""
        # 500 MB video inside workspace should be accepted
        movie_path = os.path.join(self.pipeline.workspace_dir, "movie.mp4")
        valid, err = self.pipeline.validate_permissions(movie_path, "movie.mp4", 500 * 1024 * 1024)
        self.assertTrue(valid)
        self.assertIsNone(err)

        # 2.5 GB video should be rejected with 2048MB limit message
        valid, err = self.pipeline.validate_permissions(movie_path, "movie.mp4", int(1.5 * 1024 * 1024 * 1024))
        self.assertFalse(valid)
        self.assertIn("1024MB limit for video/media", err)

        # 25 MB document should be rejected with 20MB limit message
        doc_path = os.path.join(self.pipeline.workspace_dir, "report.pdf")
        valid, err = self.pipeline.validate_permissions(doc_path, "report.pdf", 25 * 1024 * 1024)
        self.assertFalse(valid)
        self.assertIn("20MB limit for document", err)

    def test_long_video_adaptive_sampling_and_degradation(self):
        """Verifies long video (e.g. 3 hours) produces capped adaptive keyframes and includes degradation note."""
        from unittest.mock import patch, MagicMock
        video_path = os.path.join(self.temp_dir, "long_movie.mp4")
        with open(video_path, "wb") as f:
            f.write(b"dummy long video bytes")

        def mock_subp_run(cmd, *args, **kwargs):
            m = MagicMock()
            m.returncode = 0
            if "-show_entries" in cmd:
                # 3 hour duration (10800s)
                m.stdout = '{"format": {"duration": "10800.0"}, "streams": [{"codec_type": "video", "width": 1920, "height": 1080, "codec_name": "h264", "r_frame_rate": "30/1"}]}'
            else:
                m.stdout = ""
                out_path = cmd[-1]
                with open(out_path, "wb") as f:
                    f.write(b"framejpg")
            return m

        with patch.object(self.pipeline, "_find_ffmpeg_binaries", return_value=("/usr/bin/ffmpeg", "/usr/bin/ffprobe")), \
             patch("subprocess.run", side_effect=mock_subp_run):
            content, summary = self.pipeline.parse_video(video_path)
            self.assertIn("Video Media Analysis: long_movie.mp4", content)
            self.assertIn("3:00:00 (10800.00 seconds)", content)
            self.assertIn("48 representative frames", content)
            self.assertIn("Note on Long Video Duration", content)
            self.assertIn("over 2 hours", content)

    def test_portable_ffmpeg_discovery_and_caching(self):
        """Verifies _find_ffmpeg_binaries finds portable binaries, falls back properly, and caches paths."""
        from unittest.mock import patch
        
        # Test portable discovery fallback
        def mock_isfile(p):
            return "/mock/project" in str(p)

        with patch.object(self.pipeline, "config", {}), \
             patch("shutil.which", return_value=None), \
             patch("utils.ffmpeg_bootstrap.find_portable_binaries", return_value=("/mock/project/bin/ffmpeg/ffmpeg", "/mock/project/bin/ffmpeg/ffprobe")), \
             patch("os.path.isfile", side_effect=mock_isfile):
            if hasattr(self.pipeline, "_cached_ffmpeg_paths"):
                delattr(self.pipeline, "_cached_ffmpeg_paths")
            ffmpeg, ffprobe = self.pipeline._find_ffmpeg_binaries()
            self.assertEqual(ffmpeg, "/mock/project/bin/ffmpeg/ffmpeg")
            self.assertEqual(ffprobe, "/mock/project/bin/ffmpeg/ffprobe")
            self.assertEqual(self.pipeline._cached_ffmpeg_paths, ("/mock/project/bin/ffmpeg/ffmpeg", "/mock/project/bin/ffmpeg/ffprobe"))

    def test_audio_upload_and_transcription(self):
        """Verifies audio upload routes to parse_audio, extracts metadata, and falls back or transcribes."""
        import wave, struct
        audio_path = os.path.join(self.temp_dir, "speech.wav")
        with wave.open(audio_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(struct.pack('<h', 0) * 16000)

        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "Speech recognition sample content."}
        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = False
        with patch.dict("sys.modules", {"whisper": MagicMock(load_model=MagicMock(return_value=mock_model)), "faster_whisper": None, "torch": mock_torch}):
            meta = self.pipeline.process_file(audio_path, original_name="speech.wav")
            self.assertEqual(meta.file_type, "audio")
            self.assertEqual(meta.status, "parsed")
            self.assertIn("Audio Media Analysis: speech.wav", meta.parsed_content)
            self.assertIn("speech.wav", meta.parsed_summary)

    def test_audio_empty_stt_honest_message(self):
        """Verifies that when Whisper or STT yields empty transcript, an honest failure message is returned instead of hallucinations."""
        import wave, struct
        audio_path = os.path.join(self.temp_dir, "silence.wav")
        with wave.open(audio_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(struct.pack('<h', 0) * 16000)

        # Mock whisper transcribe returning empty text
        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "   "}
        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = False
        with patch.dict("sys.modules", {"whisper": MagicMock(load_model=MagicMock(return_value=mock_model)), "faster_whisper": None, "torch": mock_torch}):
            content, summary = self.pipeline.parse_audio(audio_path)
            self.assertIn("No reliable speech or lyrics could be transcribed from this audio", content)
            self.assertIn("no reliable speech detected", content)

    def test_audio_whisper_success_transcription(self):
        """Verifies that Whisper transcribes speech cleanly with anti-hallucination settings."""
        import wave, struct
        audio_path = os.path.join(self.temp_dir, "clear_voice.wav")
        with wave.open(audio_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(struct.pack('<h', 0) * 16000)

        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "Hello, this is a clear recording of speech."}
        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = False
        with patch.dict("sys.modules", {"whisper": MagicMock(load_model=MagicMock(return_value=mock_model)), "faster_whisper": None, "torch": mock_torch}):
            content, summary = self.pipeline.parse_audio(audio_path)
            self.assertIn("Hello, this is a clear recording of speech.", content)
            self.assertIn("OpenAI Whisper base (Local)", content)
            mock_model.transcribe.assert_called_once_with(
                audio_path,
                beam_size=1,
                temperature=0.0,
                condition_on_previous_text=False,
                no_speech_threshold=0.6,
                fp16=False
            )

    def test_video_audio_extraction_and_transcription(self):
        """Verifies that parse_video extracts audio and includes transcription when speech/lyrics intent is present."""
        video_path = os.path.join(self.temp_dir, "music_clip.mp4")
        with open(video_path, "wb") as f:
            f.write(b"\x00\x00\x00 ftypmp42\x00\x00\x00\x00")

        # Mock extract_audio_track and parse_audio
        with patch.object(self.pipeline, "_find_ffmpeg_binaries", return_value=("/usr/bin/ffmpeg", "/usr/bin/ffprobe")), \
             patch.object(self.pipeline, "extract_audio_track", return_value=os.path.join(self.temp_dir, "mock_extracted.wav")), \
             patch.object(self.pipeline, "parse_audio", return_value=("Audio Media Analysis: mock_extracted.wav\n\n### Audio Transcription:\nThese are the lyrics to the song.\n\n### Audio Summary:\nDone.", "Summary")):
            
            # Create dummy temp file so cleanup does not fail
            with open(os.path.join(self.temp_dir, "mock_extracted.wav"), "w") as f:
                f.write("audio_data")

            content, summary = self.pipeline.parse_video(video_path, query_hint="What are the lyrics to this video?")
            self.assertIn("### Video Audio Transcription:", content)
            self.assertIn("These are the lyrics to the song.", content)

if __name__ == "__main__":
    unittest.main()
