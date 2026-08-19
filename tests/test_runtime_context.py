import os
import unittest
import datetime
import platform
from core.runtime_context import RuntimeContextManager
from core.agent import LuminAgent

class TestRuntimeContext(unittest.TestCase):
    def setUp(self):
        self.rcm = RuntimeContextManager()
        self.agent = LuminAgent()

    def test_current_date(self):
        date_str = self.rcm.get_current_date()
        today_formatted = datetime.datetime.now().strftime("%B %d, %Y")
        self.assertEqual(date_str, today_formatted)
        self.assertNotIn("[current_date]", date_str)

    def test_current_time(self):
        time_str = self.rcm.get_current_time()
        self.assertTrue("AM" in time_str or "PM" in time_str)
        self.assertNotIn("[current_time]", time_str)

    def test_operating_system(self):
        os_str = self.rcm.get_operating_system()
        self.assertIn(platform.system(), os_str)
        self.assertNotIn("[operating_system]", os_str)

    def test_active_model(self):
        model_str = self.rcm.get_active_model()
        self.assertIsInstance(model_str, str)
        self.assertTrue(len(model_str) > 0)
        self.assertNotIn("[active_model]", model_str)

    def test_capabilities_summary(self):
        cap_str = self.rcm.get_capabilities_summary()
        self.assertIn("Document", cap_str)
        self.assertNotIn("[available_capabilities]", cap_str)

    def test_user_session_info(self):
        session_str = self.rcm.get_user_session_info()
        self.assertIn("User Email", session_str)
        self.assertNotIn("[user_session]", session_str)

    def test_resolve_placeholders(self):
        prompt_with_placeholders = (
            "Today is [current_date] at [current_time] on OS [operating_system]. "
            "Model is [active_model] with capabilities [available_capabilities] "
            "and session [user_session_info]."
        )
        resolved = self.rcm.resolve_placeholders(prompt_with_placeholders)
        self.assertNotIn("[current_date]", resolved)
        self.assertNotIn("[current_time]", resolved)
        self.assertNotIn("[operating_system]", resolved)
        self.assertNotIn("[active_model]", resolved)
        self.assertNotIn("[available_capabilities]", resolved)
        self.assertNotIn("[user_session_info]", resolved)
        self.assertIn(datetime.datetime.now().strftime("%B %d, %Y"), resolved)

    def test_inject_context_block(self):
        sys_prompt = "You are LUMIN AI Agent."
        user_prompt = "What is the date?"
        sys_res, user_res = self.rcm.inject_context(sys_prompt, user_prompt)
        self.assertIn("### RUNTIME ENVIRONMENT CONTEXT ###", sys_res)
        self.assertIn("- Current Date:", sys_res)
        self.assertIn("- Current Time:", sys_res)
        self.assertIn("- Operating System:", sys_res)
        self.assertIn("- Active Model:", sys_res)
        self.assertIn("- Available Capabilities:", sys_res)

    def test_agent_direct_queries(self):
        # Test Date Query
        res_date = self.agent._execute_single_intent("What's today's date?")
        self.assertIsNotNone(res_date)
        self.assertIn("Today's date is", res_date)
        self.assertNotIn("[current_date]", res_date)

        # Test Time Query
        res_time = self.agent._execute_single_intent("What time is it?")
        self.assertIsNotNone(res_time)
        self.assertIn("The current time is", res_time)
        self.assertNotIn("[current_time]", res_time)

        # Test Capability Query
        res_cap = self.agent._execute_single_intent("What are your capabilities?")
        self.assertIsNotNone(res_cap)
        self.assertIn("Available capabilities:", res_cap)
        self.assertNotIn("[available_capabilities]", res_cap)

        # Test Model Query
        res_mod = self.agent._execute_single_intent("What model are you using?")
        self.assertIsNotNone(res_mod)
        self.assertIn("Active model:", res_mod)
        self.assertNotIn("[active_model]", res_mod)

    def test_lumin_context_files_loaded_and_injected(self):
        context_files = self.rcm.get_lumin_context_files()
        self.assertIn("USER.md", context_files)
        self.assertIn("IDENTITY.md", context_files)
        self.assertIn("RULES.md", context_files)
        self.assertIn("MEMORY.md", context_files)

        sys_res, _ = self.rcm.inject_context("Base system instruction.")
        self.assertIn("### LOCAL CONTEXT WORKSPACE (lumin_context/) ###", sys_res)
        self.assertIn("[USER.md]", sys_res)
        self.assertIn("[IDENTITY.md]", sys_res)
        self.assertIn("[RULES.md]", sys_res)
        self.assertIn("[MEMORY.md]", sys_res)

    def test_agent_build_system_prompt_has_context(self):
        sys_prompt = self.agent._get_effective_system_prompt()
        self.assertIn("### LOCAL CONTEXT WORKSPACE (lumin_context/) ###", sys_prompt)
        self.assertIn("[USER.md]", sys_prompt)
        self.assertIn("[IDENTITY.md]", sys_prompt)
        self.assertIn("[RULES.md]", sys_prompt)
        self.assertIn("[MEMORY.md]", sys_prompt)


if __name__ == "__main__":
    unittest.main()
