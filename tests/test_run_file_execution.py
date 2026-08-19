import os
import sys
import unittest
from pathlib import Path
from core.agent import LuminAgent
from core.router import IntentRouter, IntentType

class TestRunFileExecution(unittest.TestCase):
    def setUp(self):
        self.agent = LuminAgent()
        self.router = IntentRouter(agent=self.agent)
        self.desktop_dir = str(Path.home() / "Desktop")
        os.makedirs(self.desktop_dir, exist_ok=True)
        self.test_file = os.path.join(self.desktop_dir, "lumin_test.py")
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write('print("LUMIN works")\n')

    def tearDown(self):
        if os.path.exists(self.test_file):
            try:
                os.remove(self.test_file)
            except Exception:
                pass

    def test_run_desktop_python_file_intent(self):
        query = "Run the Python file lumin_test.py that is on my Desktop"
        intent_type, _ = self.router.classify(query)
        self.assertEqual(intent_type, IntentType.APPLICATION_COMMAND)

    def test_run_desktop_python_file_execution(self):
        query = "Run the Python file lumin_test.py that is on my Desktop"
        output = self.agent.process_query(query)
        self.assertIsNotNone(output)
        self.assertIn("LUMIN works", output)
        
        # Verify content was not overwritten by write_file
        with open(self.test_file, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertEqual(content.strip(), 'print("LUMIN works")')

    def test_run_desktop_with_backslash(self):
        query = r"Execute Desktop\lumin_test.py"
        output = self.agent.process_query(query)
        self.assertIsNotNone(output)
        self.assertIn("LUMIN works", output)

    def test_run_workspace_script(self):
        ws_script = os.path.join(os.getcwd(), "sample_exec.py")
        with open(ws_script, "w", encoding="utf-8") as f:
            f.write('print("Hello from workspace")\n')
        try:
            output = self.agent.process_query("Run sample_exec.py")
            self.assertIsNotNone(output)
            self.assertIn("Hello from workspace", output)
        finally:
            if os.path.exists(ws_script):
                os.remove(ws_script)

if __name__ == "__main__":
    unittest.main()
