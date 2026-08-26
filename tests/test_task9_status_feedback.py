"""Unit tests for Task 9: Real-time UI feedback for agent state, tool execution, and system/model status."""

import unittest
from unittest.mock import patch, MagicMock
from io import StringIO
import json
import tempfile
import os

from tools.registry import ToolRegistry, ToolResult
from core.agent import Agent


class TestTask9StatusFeedback(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.registry = ToolRegistry(base_dir=self.temp_dir)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_emit_progress_event_stdout_format(self):
        """Verify Agent._emit_progress_event outputs structured JSON prefixed with [PROGRESS]."""
        with patch('core.agent.flush_stdout'):
            agent = Agent.__new__(Agent)
            with patch('sys.stdout', new=StringIO()) as fake_out:
                agent._emit_progress_event({
                    "type": "agent_thinking",
                    "status": "thinking",
                    "model": "deepseek-r1:7b",
                    "step": 1,
                    "max_steps": 5,
                    "message": "Analyzing prompt plan"
                })
                output = fake_out.getvalue()
                self.assertIn("[PROGRESS]", output)
                json_str = output.split("[PROGRESS]")[1].strip()
                data = json.loads(json_str)
                self.assertEqual(data["type"], "agent_thinking")
                self.assertEqual(data["status"], "thinking")
                self.assertEqual(data["model"], "deepseek-r1:7b")
                self.assertEqual(data["step"], 1)
                self.assertEqual(data["max_steps"], 5)
                self.assertEqual(data["message"], "Analyzing prompt plan")

    def test_tool_start_and_end_event_emission(self):
        """Verify ToolRegistry.execute_tool emits [TOOL START] and [TOOL END] lifecycle signals."""
        test_file = os.path.join(self.temp_dir, "test_file.txt")
        with open(test_file, "w") as f:
            f.write("Lumin test content")

        with patch('sys.stdout', new=StringIO()) as fake_out:
            result = self.registry.execute_tool("read_file", test_file)
            output = fake_out.getvalue()
            
            # Verify lifecycle signals in stdout
            self.assertIn(">>> [TOOL START]: read_file", output)
            self.assertIn(">>> [TOOL END]: read_file (Status: SUCCESS)", output)
            self.assertIn("Lumin test content", str(result))

    def test_tool_error_event_emission(self):
        """Verify ToolRegistry.execute_tool emits [TOOL START] and [TOOL END] lifecycle signals on missing tool."""
        with patch('sys.stdout', new=StringIO()) as fake_out:
            result = self.registry.execute_tool("nonexistent_tool_xyz")
            output = fake_out.getvalue()
            
            self.assertIn(">>> [TOOL START]: nonexistent_tool_xyz", output)
            self.assertIn(">>> [TOOL ERROR]: Tool 'nonexistent_tool_xyz' not found in registry.", output)
            self.assertIn(">>> [TOOL END]: nonexistent_tool_xyz (Status: FAILED)", output)


if __name__ == '__main__':
    unittest.main()
