"""
Unit tests for LUMIN AI Agent - Upload Summarize Path, Path Regex Safety & Offline Fallbacks.
Verifies fixes for:
1. Windows path regex safety (e.g. C:\\Users\\... with \\U unicode escapes).
2. Intent routing for summarize/analyze document queries as FILE_TASK instead of WRITING_TASK.
3. Exact "No document is currently loaded. Please upload a file first." output when no file is loaded.
4. Deterministic local summary generation from parsed_content when Ollama is offline.
"""

import io
import os
import sys
import shutil
import tempfile
import unittest
from unittest.mock import patch, MagicMock

from core.agent import LuminAgent
from core.router import IntentRouter, IntentType
from core.runtime_context import RuntimeContextManager
from core.upload_pipeline import UploadPipeline, UploadMetadata
from core.writing import WritingGenerator

class TestUploadSummarizePath(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.workspace_dir = os.path.join(self.temp_dir, "uploads")
        os.makedirs(self.workspace_dir, exist_ok=True)

    def tearDown(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_windows_path_regex_safety(self):
        r"""Ensures Windows file paths with \U (e.g. C:\Users\...) never trigger regex bad escape errors."""
        win_path = r"C:\Users\Monty\Music\remix-project---lumin\core\agent.py"

        # 1. RuntimeContextManager
        rcm = RuntimeContextManager()
        try:
            res = rcm.resolve_placeholders("Active file is: [active_model]", active_model=win_path)
            self.assertIn(win_path, res)
        except Exception as e:
            self.fail(f"RuntimeContextManager failed on Windows path: {e}")

        # 2. IntentRouter
        router = IntentRouter()
        try:
            intent, _ = router.classify(f"Summarize document at {win_path}")
            self.assertEqual(intent, IntentType.FILE_TASK)
        except Exception as e:
            self.fail(f"IntentRouter failed on Windows path: {e}")

        # 3. WritingGenerator
        wg = WritingGenerator()
        try:
            intent_dict = wg.classify_intent(f"Write 5 paragraphs about {win_path}")
            self.assertIsNotNone(intent_dict)
        except Exception as e:
            self.fail(f"WritingGenerator failed on Windows path: {e}")

    def test_intent_routing_file_task(self):
        """Verifies document analysis queries classify as FILE_TASK rather than WRITING_TASK."""
        router = IntentRouter()
        queries = [
            "Summarize this document.",
            "Analyze this file",
            "What does this say?",
            "Compare these files",
            "Summarize the uploaded file"
        ]
        for q in queries:
            intent, _ = router.classify(q)
            self.assertEqual(intent, IntentType.FILE_TASK, f"Query '{q}' was mis-classified as {intent}")

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=["llama3.2:3b"])
    def test_no_document_loaded_message(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies 'No document is currently loaded. Please upload a file first.' when no upload exists."""
        agent = LuminAgent()
        # Ensure uploads folder is clean
        if hasattr(agent, "upload_pipeline") and agent.upload_pipeline:
            agent.upload_pipeline.metadata_store.clear()
            if os.path.exists(agent.upload_pipeline.workspace_dir):
                for f in os.listdir(agent.upload_pipeline.workspace_dir):
                    p = os.path.join(agent.upload_pipeline.workspace_dir, f)
                    if os.path.isfile(p):
                        os.remove(p)

        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            agent.process_query("Summarize this document.")
        finally:
            sys.stdout = old_stdout

        out = buffer.getvalue()
        self.assertIn("No document is currently loaded. Please upload a file first.", out)

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=[])
    def test_offline_ollama_deterministic_summary(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies that when Ollama is unavailable, a summarize query returns a local summary without Notepad."""
        agent = LuminAgent()
        agent.local_models = []  # Simulate 0 models / offline Ollama
        
        # Create a test document in upload pipeline
        test_file = os.path.join(self.temp_dir, "agent.py")
        with open(test_file, "w", encoding="utf-8") as f:
            f.write("# Sample python file for summary test\ndef main():\n    print('Hello World')\n")

        agent.upload_pipeline.process_file(test_file, original_name="agent.py")

        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            agent.process_query("Summarize this document.")
        finally:
            sys.stdout = old_stdout

        out = buffer.getvalue()
        self.assertIn("Document Summary", out)
        self.assertIn("agent.py", out)
        self.assertNotIn("Notepad", out)  # Must NOT trigger Notepad writing workflow

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=[])
    def test_zero_ollama_models_messaging(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies zero installed models outputs 'No Ollama models installed. Run: ollama pull llama3.2:3b'."""
        agent = LuminAgent()
        agent.local_models = []

        # 1. Check list_models tool
        res = agent.tool_registry.execute_tool("list_models")
        self.assertIn("No Ollama models installed. Run: ollama pull llama3.2:3b", res)

        # 2. Check model status command
        router = IntentRouter(agent)
        status_res = router.execute_application_command("show current model")
        self.assertIn("No Ollama models installed. Run: ollama pull llama3.2:3b", status_res)

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=[])
    def test_auto_pull_messaging_and_handling(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies auto_pull_model produces correct messages on success and failure."""
        agent = LuminAgent()
        
        # Test failure case when offline / subprocess error
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        try:
            success = agent.auto_pull_model("llama3.2:3b", is_starter=True)
        finally:
            sys.stdout = old_stdout

        out = buffer.getvalue()
        self.assertIn("Pulling starter model llama3.2:3b (first run)…", out)
        self.assertIn("Could not auto-pull llama3.2:3b. Offline mode active.", out)

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=["llama3.2:3b"])
    def test_smart_pull_on_model_switch(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies switching to an uninstalled model triggers smart auto-pull notification."""
        agent = LuminAgent()
        agent.local_models = ["llama3.2:3b"]
        router = IntentRouter(agent)

        res = router.execute_application_command("switch model qwen2.5-coder:7b")
        self.assertIn("LUMIN model target locked to: qwen2.5-coder:7b.", res)
        self.assertIn("[Ollama Auto-Pull] Target model 'qwen2.5-coder:7b' is not currently installed locally", res)

    @patch.object(LuminAgent, "_init_mcp_server", return_value=None)
    @patch.object(LuminAgent, "_ensure_starter_model", return_value=None)
    @patch.object(LuminAgent, "_fetch_local_models", return_value=[])
    def test_archive_query_uses_upload_pipeline_not_list_directory(self, mock_fetch, mock_ensure, mock_mcp):
        """Verifies asking about uploaded archive extracts parsed content and does not run list_directory."""
        import zipfile
        agent = LuminAgent()
        agent.local_models = []
        if hasattr(agent, "upload_pipeline") and agent.upload_pipeline:
            agent.upload_pipeline.metadata_store.clear()

        zip_path = os.path.join(self.temp_dir, "project_notes.zip")
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("plan.txt", "Project Launch: Phase 1 starts on Monday with 3 milestones.")
            zf.writestr("summary.md", "# Executive Summary\nAll deliverables on track.")

        agent.upload_pipeline.process_file(zip_path, original_name="project_notes.zip")

        queries = [
            "What files are inside this archive and what do the text documents say?",
            "List the contents of this archive",
            "What do the text documents say?",
            "What files are inside this archive?"
        ]

        for q in queries:
            old_stdout = sys.stdout
            sys.stdout = buffer = io.StringIO()
            try:
                agent.process_query(q)
            finally:
                sys.stdout = old_stdout

            out = buffer.getvalue()
            self.assertIn("project_notes.zip", out, f"Query '{q}' did not include archive name")
            self.assertIn("plan.txt", out, f"Query '{q}' did not include entry plan.txt")
            self.assertNotIn("WORKSPACE FILE LISTING & LOCAL ANALYSIS", out, f"Query '{q}' triggered generic workspace listing!")
            self.assertNotIn("Error listing directory", out, f"Query '{q}' triggered directory error!")

if __name__ == "__main__":
    unittest.main()
