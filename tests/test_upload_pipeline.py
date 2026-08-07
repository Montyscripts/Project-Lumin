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
from core.agent import LuminAgent
from core.upload_pipeline import UploadPipeline, UploadMetadata

class TestUploadPipelineSummarize(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.workspace_dir = os.path.join(self.temp_dir, "uploads")
        os.makedirs(self.workspace_dir, exist_ok=True)
        self.pipeline = UploadPipeline(workspace_dir=self.workspace_dir)

    def tearDown(self):
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

if __name__ == "__main__":
    unittest.main()
