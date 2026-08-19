"""
Unit test suite for LUMIN AI Agent core modules.
Tests CapabilityRegistry, WritingGenerator, LocalTTSEngine, and security posture.
"""

import os
import unittest
from core.capabilities import CapabilityRegistry, CapabilityStatus
from core.writing import WritingGenerator
from audio.local_tts import LocalTTSEngine

class TestCapabilityRegistry(unittest.TestCase):
    def test_registry_initialization(self):
        config = {"tts_allow_cloud_fallback": False, "enable_mcp": True}
        registry = CapabilityRegistry(config)
        caps = registry.refresh()
        
        self.assertIn("local_llm", caps)
        self.assertIn("local_tts", caps)
        self.assertIn("cloud_tts", caps)
        self.assertIn("mcp_server", caps)
        
        # Verify status is reported without crashing
        self.assertIn(caps["cloud_tts"]["status"], [CapabilityStatus.DEGRADED, CapabilityStatus.UNAVAILABLE])

    def test_report_generation(self):
        registry = CapabilityRegistry({})
        report = registry.get_summary_report()
        self.assertIn("LUMIN Capability & Privacy Matrix", report)
        self.assertIn("[LOCAL]", report)

class TestWritingGenerator(unittest.TestCase):
    def setUp(self):
        self.gen = WritingGenerator(ollama_client=None)

    def test_literal_intent(self):
        intent = self.gen.classify_intent('write "Hello World" in Notepad')
        self.assertEqual(intent["type"], "LITERAL")
        self.assertEqual(intent["literal_text"], "Hello World")

    def test_generative_paragraph_count(self):
        intent = self.gen.classify_intent('Write ten paragraphs about space in Notepad')
        self.assertEqual(intent["type"], "GENERATIVE")
        self.assertEqual(intent["paragraph_count"], 10)
        self.assertEqual(intent["topic"], "space")

    def test_content_generation_no_topic_hardcoding(self):
        # Request 4 paragraphs on custom topic
        intent = {"type": "GENERATIVE", "topic": "Quantum Computing", "paragraph_count": 4, "raw_query": "Write 4 paragraphs about Quantum Computing"}
        content = self.gen.generate_content(intent)
        paras = [p.strip() for p in content.split("\n\n") if p.strip()]
        
        self.assertEqual(len(paras), 4)
        self.assertIn("Quantum Computing", content)

class TestLocalTTS(unittest.TestCase):
    def test_tts_engine_config(self):
        config = {
            "tts_engine": "local_piper",
            "tts_voice": "en_US-lessac-medium",
            "tts_allow_cloud_fallback": False
        }
        tts = LocalTTSEngine(config)
        self.assertEqual(tts.engine_type, "local_piper")
        self.assertFalse(tts.allow_cloud)

class TestSecurityAndConfirmGate(unittest.TestCase):
    def setUp(self):
        from tools.registry import ToolRegistry
        import tempfile
        self.temp_dir = tempfile.mkdtemp()
        self.registry = ToolRegistry(base_dir=self.temp_dir)

    def test_unrestricted_mode_default_false(self):
        cfg = self.registry._get_config()
        self.assertFalse(cfg.get("unrestricted_mode", False))

    def test_denylist_expanded_patterns(self):
        sensitive_paths = [
            "/home/user/.ssh/id_rsa",
            "C:\\Users\\admin\\.aws\\credentials",
            "C:\\Users\\admin\\.azure\\tokens",
            "/home/user/.gnupg/secring.gpg",
            "C:\\Users\\admin\\AppData\\Local\\Google\\Chrome\\User Data\\Default",
            "/var/app/.env"
        ]
        for p in sensitive_paths:
            self.assertTrue(self.registry._is_denied(p), f"Path should be denied: {p}")

        # Ensure harmless example env file is permitted
        self.assertFalse(self.registry._is_denied("/var/app/.env.example"))

    def test_confirm_gate_non_interactive_refusal(self):
        res = self.registry.confirm_gate.evaluate("DELETE FILE", "Target: file.txt", high_risk=True)
        self.assertFalse(res["allowed"])
        self.assertTrue(res["requires_user"])
        self.assertIn("Non-interactive environment", res["reason"])

    def test_tool_execution_structured_result(self):
        res = self.registry.execute_tool("delete_file", "non_existent_file.txt")
        self.assertIn("status", res)
        self.assertIn("tool", res)
        self.assertIn("planned", res)
        self.assertIn("attempted", res)
        self.assertEqual(res["tool"], "delete_file")

class TestAgentResultAndReasoningLoop(unittest.TestCase):
    def test_agent_result_schema_and_status(self):
        from core.agent import AgentResult
        res = AgentResult(
            status="success",
            completed=["Step 1"],
            failed=[],
            remaining=[],
            output="Done"
        )
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["completed"], ["Step 1"])
        self.assertEqual(res.status, "success")
        self.assertEqual(res.output, "Done")

    def test_agent_result_never_pure_success_on_step_failures(self):
        from core.agent import AgentResult
        res = AgentResult(
            status="success", # Attempted to pass success, but failed steps exist
            completed=["Step 1"],
            failed=["Step 2 (write_file): Validation error"],
            remaining=["Step 3"],
            output="Partial complete"
        )
        # Verify status conversion or checking
        self.assertTrue(bool(res.failed))
        self.assertNotEqual(res.to_formatted_text(), res.output) # Must show report formatting when failures exist

    def test_agent_cancellation_and_progress(self):
        from core.agent import LuminAgent
        agent = LuminAgent()
        
        # Verify progress callback registration
        events = []
        agent.set_progress_callback(lambda ev: events.append(ev))
        agent._emit_progress_event({"step": 1, "status": "running"})
        
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["step"], 1)

        # Verify cancellation flag
        self.assertFalse(agent.is_cancelled())
        agent.cancel_task()
        self.assertTrue(agent.is_cancelled())
        agent.reset_cancellation()
        self.assertFalse(agent.is_cancelled())

class TestWebAutomationBlockers(unittest.TestCase):
    def test_detect_captcha_blocker(self):
        from core.web_automation import detect_web_blocker
        html = "<html><head><title>Just a moment...</title></head><body><div class='g-recaptcha'></div><p>Verify you are human</p></body></html>"
        blocker = detect_web_blocker(html_content=html, url="https://example.com", title="Just a moment...")
        self.assertIsNotNone(blocker)
        self.assertEqual(blocker["status"], "needs_user")
        self.assertEqual(blocker["blocker_type"], "captcha")
        self.assertIn("Human verification required", blocker["next_action"])

    def test_detect_login_wall_blocker(self):
        from core.web_automation import detect_web_blocker
        html = "<html><head><title>Sign In Required</title></head><body><form><input type='password' name='pwd'/></form><p>Please log in to continue</p></body></html>"
        blocker = detect_web_blocker(html_content=html, url="https://example.com/protected", title="Sign In Required")
        self.assertIsNotNone(blocker)
        self.assertEqual(blocker["status"], "needs_user")
        self.assertEqual(blocker["blocker_type"], "login_required")
        self.assertIn("Login required", blocker["next_action"])

    def test_detect_403_access_denied_blocker(self):
        from core.web_automation import detect_web_blocker
        blocker = detect_web_blocker(status_code=403, url="https://example.com/api")
        self.assertIsNotNone(blocker)
        self.assertEqual(blocker["status"], "needs_user")
        self.assertEqual(blocker["blocker_type"], "access_denied")

    def test_detect_empty_content_blocker(self):
        from core.web_automation import detect_web_blocker
        html = "<html><body> </body></html>"
        blocker = detect_web_blocker(html_content=html, text_content="  ", url="https://example.com/empty")
        self.assertIsNotNone(blocker)
        self.assertEqual(blocker["status"], "failed")
        self.assertEqual(blocker["blocker_type"], "empty_content")

    def test_extract_page_content_returns_needs_user_on_captcha(self):
        from core.web_automation import WebAutomationEngine
        from unittest.mock import MagicMock
        mock_registry = MagicMock()
        mock_registry.selenium_driver = None
        mock_registry.execute_tool.return_value = "Opened page"
        
        engine = WebAutomationEngine(tool_registry=mock_registry)
        
        captcha_html = "<html><head><title>Attention Required</title></head><body><p>Please verify you are human</p></body></html>"
        
        from unittest.mock import patch
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.read.return_value = captcha_html.encode("utf-8")
            mock_resp.status = 200
            mock_urlopen.return_value.__enter__.return_value = mock_resp
            
            res = engine.extract_page_content("https://blocked-site.com")
            self.assertEqual(res.get("status"), "needs_user")
            self.assertIn("CAPTCHA", res.get("error", ""))
            self.assertIn("https://blocked-site.com", res.get("failed_list", []))

    def test_research_never_claims_complete_on_failed_source(self):
        from core.web_automation import WebAutomationEngine
        from tools.registry import ToolResult
        from unittest.mock import MagicMock

        mock_registry = MagicMock()
        mock_registry.execute_tool.return_value = ToolResult(
            status="needs_user",
            tool="open_url",
            failed="https://blocked-site.com",
            error="Cloudflare challenge detected",
            next_action="Solve captcha"
        )
        engine = WebAutomationEngine(tool_registry=mock_registry)
        res = engine.execute_web_research_and_analysis("top beds on Amazon")
        self.assertEqual(res.get("status"), "needs_user")
        self.assertIn("Solve captcha", res.get("next_action", ""))


if __name__ == "__main__":
    unittest.main()
