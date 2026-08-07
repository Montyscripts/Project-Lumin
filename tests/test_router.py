"""
Unit tests for LUMIN AI Agent Intent Router & Command Execution Layer.
"""

import unittest
from core.router import IntentRouter, IntentType
from core.agent import LuminAgent

class TestIntentRouter(unittest.TestCase):
    def setUp(self):
        self.agent = LuminAgent()
        self.router = IntentRouter(agent=self.agent)

    def test_intent_classification_categories(self):
        # 1. Application commands
        type_app1, _ = self.router.classify("Switch to another model")
        type_app2, _ = self.router.classify("Switch model to llama3.2:3b")
        type_app3, _ = self.router.classify("Show capabilities")
        type_app4, _ = self.router.classify("Turn off TTS")
        type_app5, _ = self.router.classify("Switch TTS engine to piper")
        type_app6, _ = self.router.classify("Show status")

        self.assertEqual(type_app1, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app2, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app3, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app4, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app5, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app6, IntentType.APPLICATION_COMMAND)

        # 2. Writing task
        type_write, _ = self.router.classify("Write three paragraphs about Japan in Notepad")
        self.assertEqual(type_write, IntentType.WRITING_TASK)

        # 3. File task
        type_file, _ = self.router.classify("List processes running")
        self.assertEqual(type_file, IntentType.FILE_TASK)

        # 4. Browser task
        type_browser, _ = self.router.classify("Search for weather in Tokyo")
        self.assertEqual(type_browser, IntentType.BROWSER_TASK)

        # 5. Normal conversation
        type_norm1, _ = self.router.classify("What is the capital of France?")
        type_norm2, _ = self.router.classify("Explain quantum entanglement step by step")
        self.assertEqual(type_norm1, IntentType.NORMAL_CONVERSATION)
        self.assertEqual(type_norm2, IntentType.NORMAL_CONVERSATION)

    def test_model_switching_command_execution(self):
        # Initial state
        self.agent.force_model = None
        
        # Test explicit model lock
        res = self.router.execute_application_command("Switch model to qwen2.5-coder:7b")
        self.assertEqual(self.agent.force_model, "qwen2.5-coder:7b")
        self.assertIn("LUMIN model target locked to: qwen2.5-coder:7b", res)

        # Test model unlock/auto
        res_auto = self.router.execute_application_command("Unlock model")
        self.assertIsNone(self.agent.force_model)
        self.assertIn("unlocked", res_auto)

        # Test "Switch to another model" rotation
        res_rot = self.router.execute_application_command("Switch to another model")
        self.assertIn("model target", res_rot.lower())

    def test_tts_engine_and_mode_execution(self):
        # Test TTS toggle off
        res_off = self.router.execute_application_command("Disable TTS")
        self.assertFalse(self.agent.tts_enabled)
        self.assertIn("OFF", res_off)

        # Test TTS toggle on
        res_on = self.router.execute_application_command("Enable TTS")
        self.assertTrue(self.agent.tts_enabled)
        self.assertIn("ON", res_on)

        # Test TTS engine change
        res_engine = self.router.execute_application_command("Change TTS engine to piper")
        self.assertEqual(self.agent.local_tts.engine_type, "local_piper")
        self.assertIn("local_piper", res_engine)

    def test_capabilities_and_status_command_execution(self):
        res_caps = self.router.execute_application_command("Show capabilities")
        self.assertIn("LUMIN Capability & Privacy Matrix", res_caps)

        res_model = self.router.execute_application_command("Show current model")
        self.assertIn("Active locked model:", res_model)

    def test_youtube_and_google_direct_actions(self):
        # YouTube search
        res1 = self.agent._execute_single_intent('open youtube and search "Gorillaz Demon Days Era Vibe"')
        self.assertIn("YouTube search for 'Gorillaz Demon Days Era Vibe'", res1)

        # YouTube autoplay 1st video
        res2 = self.agent._execute_single_intent('Open YouTube search "Gorillaz Demon Days Era Vibe" and click on the 1st video')
        self.assertIn("playing top YouTube result", res2)

        # Google search
        res3 = self.agent._execute_single_intent("open google an search for top vpn's of 2026")
        self.assertIn("Google Search executed for 'top vpn's of 2026'", res3)

if __name__ == "__main__":
    unittest.main()
