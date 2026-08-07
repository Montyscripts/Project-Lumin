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
        """Ensures Windows file paths with \\U (e.g. C:\\Users\\...) never trigger regex bad escape errors."""
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

    def test_no_document_loaded_message(self):
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

    def test_offline_ollama_deterministic_summary(self):
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

    def test_zero_ollama_models_messaging(self):
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

    def test_auto_pull_messaging_and_handling(self):
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

    def test_smart_pull_on_model_switch(self):
        """Verifies switching to an uninstalled model triggers smart auto-pull notification."""
        agent = LuminAgent()
        agent.local_models = ["llama3.2:3b"]
        router = IntentRouter(agent)

        res = router.execute_application_command("switch model qwen2.5-coder:7b")
        self.assertIn("LUMIN model target locked to: qwen2.5-coder:7b.", res)
        self.assertIn("[Ollama Auto-Pull] Target model 'qwen2.5-coder:7b' is not currently installed locally", res)

if __name__ == "__main__":
    unittest.main()
