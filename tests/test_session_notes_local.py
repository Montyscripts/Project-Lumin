"""
Unit test verifying local note creation behavior:
- Skips web research entirely for local conversation summary notes.
- Generates note content from memory/discussion history.
- Writes file cleanly or returns needs_user structured result in non-interactive environment.
"""

import os
import unittest
from unittest.mock import MagicMock, patch
from core.writing import WritingGenerator
from tools.registry import ToolRegistry, ToolResult


class TestSessionNotesLocal(unittest.TestCase):
    def setUp(self):
        self.registry = ToolRegistry(base_dir=os.path.abspath("."))
        self.generator = WritingGenerator(ollama_client=None, tool_registry=self.registry)
        
        # Mock memory manager with discussion history
        mock_memory = MagicMock()
        mock_memory.get_recent_history.return_value = [
            {"role": "user", "content": "Let's review core/router.py"},
            {"role": "assistant", "content": "Reviewed router classification logic."},
            {"role": "user", "content": "Update write_file confirmation handling."}
        ]
        self.registry.memory_manager = mock_memory

        self.test_file = os.path.abspath("session_notes.md")
        if os.path.exists(self.test_file):
            os.remove(self.test_file)

    def tearDown(self):
        if os.path.exists(self.test_file):
            os.remove(self.test_file)

    def test_gather_web_research_skipped_for_local_note(self):
        query = "Create a short Markdown note summarizing the last three things we discussed and save it as session_notes.md."
        res = self.generator.gather_web_research_context("session notes", query)
        self.assertEqual(res, "", "Web research should be skipped for local note queries")

    def test_generate_content_uses_memory_without_web_research(self):
        query = "Create a short Markdown note summarizing the last three things we discussed and save it as session_notes.md."
        intent = {
            "type": "GENERATIVE",
            "topic": "last three things we discussed",
            "raw_query": query
        }

        with patch.object(self.generator, "gather_web_research_context") as mock_research:
            content = self.generator.generate_content(intent)
            mock_research.assert_not_called()
            self.assertIn("# Session Summary", content)
            self.assertIn("Let's review core/router.py", content)

    def test_write_file_workspace_non_interactive(self):
        content = "# Session Summary\n- Item 1\n- Item 2\n"
        res = self.registry.write_file("session_notes.md", content)

        if isinstance(res, ToolResult):
            self.assertIn(res["status"], ("success", "needs_user"))
        else:
            self.assertIn("Successfully wrote", str(res))
            self.assertIn("session_notes.md", str(res))
            self.assertTrue(os.path.exists(self.test_file))


if __name__ == "__main__":
    unittest.main()
