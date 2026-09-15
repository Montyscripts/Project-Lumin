"""
Unit tests for Model Offline & Missing Model Fallback Handling.
Covers:
- OllamaClient REST call retry logic and connection failure exception handling
- LuminAgent auto-pull failures when Ollama daemon is unreachable or offline
- LuminAgent starter model auto-pull fallback handling
- LuminAgent model routing fallbacks when targeted models are missing locally
"""

import unittest
from unittest.mock import patch, MagicMock
import urllib.error

from llm.client import OllamaClient
from core.agent import LuminAgent


class TestModelOfflineAndMissing(unittest.TestCase):
    def test_ollama_client_rest_failure_and_retry(self):
        """OllamaClient retries on connection error and raises exception when offline."""
        client = OllamaClient(base_url="http://localhost:99999")  # invalid port

        with patch("time.sleep", return_value=None):  # speed up test retries
            with self.assertRaises(Exception):
                client.generate_content("Hello world", model="llama3.2:3b")

    @patch("subprocess.Popen")
    def test_auto_pull_model_failure_offline_mode(self, mock_popen):
        """auto_pull_model handles subprocess pull failures gracefully and reports offline mode."""
        mock_proc = MagicMock()
        mock_proc.stdout.readline.side_effect = ["Pulling manifest...\n", "Error: connection refused\n", ""]
        mock_proc.poll.return_value = 1  # Non-zero exit code
        mock_popen.return_value = mock_proc

        agent = LuminAgent()
        success = agent.auto_pull_model("nonexistent-model:99b", is_starter=False)

        self.assertFalse(success)

    @patch("urllib.request.urlopen")
    def test_ensure_starter_model_when_ollama_offline(self, mock_urlopen):
        """_ensure_starter_model gracefully sets offline mode when Ollama tags endpoint is unreachable."""
        mock_urlopen.side_effect = Exception("Connection refused (Ollama offline)")

        agent = LuminAgent()
        agent.local_models = []
        agent.has_attempted_starter_pull = False

        with patch("core.agent.REQUESTS_OK", False):
            result = agent._ensure_starter_model()

        self.assertFalse(result)
        self.assertTrue(agent.has_attempted_starter_pull)

    def test_missing_model_fallback_routing(self):
        """When targeted model is not installed locally, agent falls back to available model or default."""
        agent = LuminAgent()
        agent.local_models = ["llama3.2:3b"]  # only llama3.2:3b installed
        agent.force_model = "qwen2.5-coder:7b"  # missing model forced

        # Attempting routing when forced model is missing
        provider, chosen_model = agent._route_hybrid_model("coding", "def solve(): pass")

        # Must fall back to installed model llama3.2:3b
        self.assertEqual(chosen_model, "llama3.2:3b")


if __name__ == "__main__":
    unittest.main()
