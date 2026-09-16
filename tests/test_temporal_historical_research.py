import unittest
from unittest.mock import MagicMock, patch
import datetime

from core.router import IntentRouter, IntentType
from core.agent import LuminAgent
from tools.registry import ToolResult


class TestTemporalHistoricalResearch(unittest.TestCase):
    def setUp(self):
        self.router = IntentRouter()
        self.agent = LuminAgent()

    def test_router_detects_temporal_historical_queries(self):
        """Validates that natural language temporal & historical research queries are recognized."""
        sample_queries = [
            "Go throughout time and find a historical event that’s significant to today’s date",
            "What important historical event happened on this day?",
            "Tell me something significant that happened on today’s date in history",
            "What happened on this day in history?",
            "What historical event occurred today?",
            "Find a historical event significant to today's date",
            "Significant events on this day in history",
        ]
        for q in sample_queries:
            self.assertTrue(
                self.router.is_temporal_historical_query(q),
                f"Expected query to be identified as temporal/historical research: '{q}'"
            )
            intent, _ = self.router.classify(q)
            self.assertEqual(
                intent,
                IntentType.BROWSER_TASK,
                f"Expected BROWSER_TASK for query: '{q}'"
            )

    def test_simple_date_queries_not_routed_to_research(self):
        """Ensure standard current-date/time questions are direct context queries, not historical research."""
        simple_queries = [
            "What's today's date?",
            "What is the current date?",
            "What date is it?",
            "Today's date",
            "Current date",
        ]
        for q in simple_queries:
            self.assertFalse(
                self.router.is_temporal_historical_query(q),
                f"Simple date query should not be treated as historical research: '{q}'"
            )

    def test_agent_classifies_temporal_queries_as_research(self):
        """Ensures task domain classification marks historical queries as 'research'."""
        queries = [
            "What important historical event happened on this day?",
            "Tell me something significant that happened on today’s date in history",
            "Go throughout time and find a historical event that’s significant to today’s date",
        ]
        for q in queries:
            task = self.agent._classify_query_task(q)
            self.assertEqual(
                task,
                "research",
                f"Expected task domain 'research' for '{q}', got '{task}'"
            )

    def test_temporal_research_web_search_grounding_success(self):
        """Checks grounded historical research response using mock web search snippets."""
        mock_snippets = (
            "Retrieved 3 search snippet(s) for 'On this day in history September 15 historical events':\n"
            "• **Title**: On This Day in History - September 15 - History.com\n"
            "  **Source**: https://www.history.com/this-day-in-history/september-15\n"
            "  **Snippet**: On September 15, 1821, Costa Rica, El Salvador, Guatemala, Honduras, and Nicaragua declared independence from Spain.\n"
            "• **Title**: Historical Events on September 15 - On This Day\n"
            "  **Source**: https://www.onthisday.com/events/september/15\n"
            "  **Snippet**: In 1916, tanks were used for the first time in warfare during the Battle of the Somme in World War I."
        )

        with patch.object(self.agent.tool_registry, "execute_tool", return_value=ToolResult(
            status="success",
            tool="web_search",
            succeeded=mock_snippets
        )):
            res = self.agent._handle_temporal_historical_research_query(
                "What important historical event happened on this day?",
                active_model="llama3.2:3b"
            )
            self.assertIsNotNone(res)
            # Response must include current date
            current_year = str(datetime.datetime.now().year)
            self.assertTrue(current_year in res or "September 15" in res or "Today's date" in res)
            # Must contain historical content from the search result or milestones
            has_history_facts = any(fact in res for fact in ["1821", "1916", "Battle of the Somme", "independence", "Spain", "Historical Events"])
            self.assertTrue(has_history_facts, f"Result did not contain expected historical facts: {res}")

    def test_temporal_research_offline_model_and_offline_search_fallback(self):
        """Ensures the agent provides verified milestone history or clear notification rather than crashing."""
        with patch.object(self.agent.tool_registry, "execute_tool", return_value=ToolResult(
            status="failed",
            tool="web_search",
            error="Network disconnected"
        )):
            # Ensure local models return empty (offline)
            with patch.object(self.agent, "_fetch_local_models", return_value=[]):
                self.agent.local_models = []
                res = self.agent._handle_temporal_historical_research_query(
                    "Tell me something significant that happened on today’s date in history",
                    active_model="llama3.2:3b"
                )
                self.assertIsNotNone(res)
                self.assertTrue(len(res) > 30)
                self.assertIn("Today's date is", res)
                self.assertTrue("Historical Events" in res or "milestones" in res or "September 15" in res)

    def test_full_process_query_temporal_historical_flow(self):
        """Tests that full agent.process_query runs end-to-end on temporal queries."""
        mock_snippets = (
            "Retrieved 2 search snippet(s):\n"
            "• **Title**: This Day in History\n"
            "  **Snippet**: On September 15, 1963, the 16th Street Baptist Church bombing in Birmingham, Alabama occurred."
        )
        with patch.object(self.agent.tool_registry, "execute_tool", return_value=ToolResult(
            status="success",
            tool="web_search",
            succeeded=mock_snippets
        )):
            output = self.agent.process_query("Go throughout time and find a historical event that’s significant to today’s date")
            self.assertIsNotNone(output)
            self.assertTrue(len(output) > 20)
            self.assertTrue("Today's date" in output or "September 15" in output or "1963" in output or "Church" in output)


if __name__ == "__main__":
    unittest.main()
