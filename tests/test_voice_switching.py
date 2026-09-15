import unittest
import os
import json
import tempfile
import shutil
from unittest.mock import MagicMock, patch

from core.agent import Agent
from core.router import IntentRouter, IntentType


class TestVoiceSwitching(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.config_path = os.path.join(self.test_dir, "agent_config.json")
        self.mock_config = {"tts_voice": "en-US-JennyNeural"}
        with open(self.config_path, "w") as f:
            json.dump(self.mock_config, f)

        self.agent = Agent()
        # Mock tool_registry config get and save to isolate tests
        def mock_get_config():
            return dict(self.mock_config)
        def mock_save_config(cfg):
            self.mock_config.update(cfg)
            with open(self.config_path, "w") as f:
                json.dump(self.mock_config, f)

        self.agent.tool_registry._get_config = mock_get_config
        self.agent.tool_registry._save_config = mock_save_config

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_meta_command_voice_jenny(self):
        res = self.agent._handle_meta_command("voice en-US-JennyNeural")
        self.assertIn("Successfully switched default speech synthesis voice to: en-US-JennyNeural", res)
        with open(self.config_path, "r") as f:
            cfg = json.load(f)
        self.assertEqual(cfg.get("tts_voice"), "en-US-JennyNeural")

    def test_meta_command_voice_set_guy(self):
        res = self.agent._handle_meta_command("voice set en-US-GuyNeural")
        self.assertIn("Successfully switched default speech synthesis voice to: en-US-GuyNeural", res)
        with open(self.config_path, "r") as f:
            cfg = json.load(f)
        self.assertEqual(cfg.get("tts_voice"), "en-US-GuyNeural")

    def test_meta_command_change_voice_to_aria(self):
        res = self.agent._handle_meta_command("change voice to en-US-AriaNeural")
        self.assertIn("Successfully switched default speech synthesis voice to: en-US-AriaNeural", res)
        with open(self.config_path, "r") as f:
            cfg = json.load(f)
        self.assertEqual(cfg.get("tts_voice"), "en-US-AriaNeural")

    def test_meta_command_voice_case_insensitive(self):
        res = self.agent._handle_meta_command("voice guy")
        self.assertIn("Successfully switched default speech synthesis voice to: en-US-GuyNeural", res)
        with open(self.config_path, "r") as f:
            cfg = json.load(f)
        self.assertEqual(cfg.get("tts_voice"), "en-US-GuyNeural")

    def test_meta_command_voice_piper_mapping(self):
        res = self.agent._handle_meta_command("voice en_US-lessac-medium")
        self.assertIn("Successfully switched default speech synthesis voice to: en-US-GuyNeural", res)
        with open(self.config_path, "r") as f:
            cfg = json.load(f)
        self.assertEqual(cfg.get("tts_voice"), "en-US-GuyNeural")

    def test_router_voice_command_execution(self):
        router = IntentRouter(agent=self.agent)
        res = router.execute_application_command("switch voice to en-US-DavisNeural")
        self.assertIsNotNone(res)
        self.assertIn("Successfully switched default speech synthesis voice to: en-US-DavisNeural", res)
        with open(self.config_path, "r") as f:
            cfg = json.load(f)
        self.assertEqual(cfg.get("tts_voice"), "en-US-DavisNeural")


if __name__ == "__main__":
    unittest.main()
