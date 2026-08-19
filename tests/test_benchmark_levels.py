import unittest
import os
from core.agent import Agent

class TestBenchmarkLevels(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.agent = Agent()

    def test_level_1_theme_matrix(self):
        res = self.agent.process_query("Theme -> matrix")
        self.assertIn("matrix", res.lower())

    def test_level_1_hardware_profile(self):
        res = self.agent.process_query("Hardware profile")
        self.assertTrue(any(k in res.lower() for k in ("resource governor", "governor", "hardware", "ram", "vram")))

    def test_level_2_flight_research_grounding(self):
        res = self.agent.process_query("Flight research Tulsa -> Tokyo")
        self.assertNotIn("JAL", res)
        self.assertNotIn("ANA", res)
        self.assertTrue("Google Flights" in res or "Search" in res or "KAYAK" in res or "Tulsa" in res)

    def test_level_3_senior_engineer_architecture(self):
        res = self.agent.process_query("Senior-engineer architecture + top 3 risks + patches")
        self.assertIn("Architecture Review", res)
        self.assertIn("Top 3", res)

    def test_level_3_broad_except(self):
        res = self.agent.process_query("Find broad except + safer patterns")
        self.assertIn("Broad Exception", res)
        self.assertIn("Safer Exception Handling", res)

    def test_level_3_trace_theme(self):
        res = self.agent.process_query("Trace theme-change UI -> agent -> visualizer")
        self.assertIn("Trace", res)
        self.assertIn("App.tsx", res)

    def test_level_4_security_audit(self):
        res = self.agent.process_query("Security audit of registry + confirm/unrestricted + implement mitigations")
        self.assertIn("Security Audit", res)
        self.assertIn("Sandbox Governance", res)

    def test_level_4_large_file_limits(self):
        res = self.agent.process_query("Large-file upload memory limits + honest partial results")
        self.assertIn("Memory Limits", res)
        self.assertIn("upload_pipeline.py", res)

    def test_level_5_full_repo_audit(self):
        res = self.agent.process_query("Full repo audit -> plan -> implement -> test -> report")
        self.assertIn("Level 5 Comprehensive Repository Audit", res)
        self.assertIn("100% PASS", res)

if __name__ == "__main__":
    unittest.main()
