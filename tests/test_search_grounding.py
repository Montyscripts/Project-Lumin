import unittest
from unittest.mock import MagicMock, patch
from tools.registry import ToolRegistry, ToolResult
from core.agent import Agent

class TestSearchGrounding(unittest.TestCase):
    def setUp(self):
        self.registry = ToolRegistry()

    def test_web_search_execution(self):
        result = self.registry.execute_tool("web_search", "flights from Tulsa to Tokyo")
        self.assertIn(result.status, ["success", "failed"])
        if result.status == "success":
            self.assertIn("Retrieved", result.succeeded)
            self.assertTrue("Google" in result.succeeded or "KAYAK" in result.succeeded or "Expedia" in result.succeeded or "Skyscanner" in result.succeeded)

    def test_grounded_research_query_flow_success(self):
        agent = Agent()
        res = agent.process_query("Flight research Tulsa → Tokyo")
        self.assertTrue(len(res) > 20)
        # Verify no hallucinated flight numbers like "JL 061" or "NH 105"
        self.assertNotIn("JL 061", res)
        self.assertNotIn("NH 105", res)
        # Verify presence of grounded sources or honest search notice
        has_sources = any(term in res for term in ["Google Flights", "KAYAK", "Expedia", "Skyscanner", "Grounded Web Search", "Factual Search Notice"])
        self.assertTrue(has_sources)

    def test_grounded_research_query_flow_failure_notice(self):
        agent = Agent()
        # Mock search tool failure
        agent.tool_registry.execute_tool = MagicMock(return_value=ToolResult(
            status="failed",
            tool="web_search",
            error="No results returned"
        ))
        res = agent._handle_grounded_research_query("Flight research Tulsa → Tokyo", "llama3.2:3b")
        self.assertIn("Factual Search Notice", res)
        self.assertIn("Grounding Policy", res)
        self.assertIn("Google Flights", res)

if __name__ == "__main__":
    unittest.main()
