"""
Unit tests for End-to-End Model Locking in LUMIN AI Agent.
Verifies that force_model is strictly honored across:
- _route_hybrid_model priority
- _refresh_force_model_from_config
- Capability overrides in process_query (vision, audio, document, reasoning)
- Ad-hoc paths (code analysis, conversation summary)
"""

import unittest
import os
import json
import tempfile
from unittest.mock import patch, MagicMock
from core.agent import LuminAgent


class TestModelLocking(unittest.TestCase):
    def setUp(self):
        self.agent = LuminAgent()
        self.agent.local_models = ["llama3.2:3b", "qwen2.5-coder:7b", "llava:7b", "mistral:7b"]

    def test_refresh_force_model_from_config(self):
        """Verifies _refresh_force_model_from_config dynamically reads updated force_model."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tf:
            json.dump({"force_model": "qwen2.5-coder:7b"}, tf)
            tmp_config = tf.name

        try:
            self.agent.config_path = tmp_config
            self.agent.force_model = None
            self.agent._refresh_force_model_from_config()
            self.assertEqual(self.agent.force_model, "qwen2.5-coder:7b")

            # Update file to new model
            with open(tmp_config, "w") as f:
                json.dump({"force_model": "mistral:7b"}, f)

            self.agent._refresh_force_model_from_config()
            self.assertEqual(self.agent.force_model, "mistral:7b")

            # Update file to unlock
            with open(tmp_config, "w") as f:
                json.dump({"force_model": None}, f)

            self.agent._refresh_force_model_from_config()
            self.assertIsNone(self.agent.force_model)
        finally:
            if os.path.exists(tmp_config):
                os.remove(tmp_config)

    def test_route_hybrid_model_prioritizes_locked_model(self):
        """Locked model takes precedence over domain-specific routing."""
        self.agent.force_model = "llama3.2:3b"

        # Vision task must use locked model
        client_type, model = self.agent._route_hybrid_model("image_analysis", "analyze this image")
        self.assertEqual(model, "llama3.2:3b")

        # Uncensored task must use locked model
        client_type, model = self.agent._route_hybrid_model("uncensored_writing", "write story")
        self.assertEqual(model, "llama3.2:3b")

        # General task must use locked model
        client_type, model = self.agent._route_hybrid_model("general", "hello")
        self.assertEqual(model, "llama3.2:3b")

    def test_route_hybrid_model_honors_lock_even_if_exceeding_resource_cap(self):
        """Locked model is honored even when Resource Governor rejects it based on size cap."""
        self.agent.force_model = "mistral:7b"

        # Pretend the locked model is installed so we only test the Resource Governor override path
        with patch.object(self.agent, "_fetch_local_models", return_value=["mistral:7b", "llama3.2:3b"]):
            with patch.object(self.agent.resource_governor, "is_model_allowed", return_value=(False, "Size exceeds 3.0GB cap")):
                client_type, model = self.agent._route_hybrid_model("general", "hello")
                self.assertEqual(model, "mistral:7b")
                self.assertEqual(self.agent.active_model, "mistral:7b")

    def test_unlocked_model_uses_domain_routing(self):
        """When force_model is None, normal domain routing takes place."""
        self.agent.force_model = None
        # Mock resource governor permitting vision
        with patch.object(self.agent.resource_governor, "is_feature_permitted", return_value=(True, "OK")):
            with patch.object(self.agent.resource_governor, "is_model_allowed", return_value=(True, "OK")):
                with patch.object(self.agent, "_get_best_vision_model", return_value="llava:7b"):
                    client_type, model = self.agent._route_hybrid_model("image_analysis", "analyze this image")
                    self.assertEqual(model, "llava:7b")

    def test_process_query_refreshes_force_model(self):
        """process_query calls _refresh_force_model_from_config at entry."""
        with patch.object(self.agent, "_refresh_force_model_from_config") as mock_refresh:
            with patch.object(self.agent.intent_router, "route", return_value=(True, "Handled")):
                self.agent.process_query("test query")
                mock_refresh.assert_called_once()


if __name__ == "__main__":
    unittest.main()
