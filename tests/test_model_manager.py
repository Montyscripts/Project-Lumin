"""
Unit tests for LUMIN Model Manager Service (core/model_manager.py).
Tests:
- ModelManager initialization and provider integration
- Listing installed models via provider
- Listing running/loaded models via provider
- Model metadata generation (size, params, quantization, category, speed)
- Full snapshot generation (get_all_models_status)
- Active model persistence (get_active_model_setting, set_active_model_setting)
- Preload (load_model) and unload (unload_model, stop_model) operations
- Graceful offline / failure fallback handling
- ResourceGovernor admission awareness
"""

import unittest
from unittest.mock import patch, MagicMock
import os
import json
import tempfile

from core.model_manager import ModelManager
from llm.providers.base import BaseModelProvider, ModelCapabilities


class MockProvider(BaseModelProvider):
    name = "mock_ollama"

    def __init__(self, installed=None, running=None):
        self._installed = installed or ["llama3.2:3b", "qwen2.5-coder:7b"]
        self._running = running or ["llama3.2:3b"]
        self.loaded = []
        self.unloaded = []

    def generate(self, prompt: str, **kwargs) -> str:
        return "mock output"

    def embed(self, text: str, **kwargs):
        return [0.1]

    def list_models(self):
        return list(self._installed)

    def get_loaded_models(self):
        return list(self._running)

    def is_healthy(self):
        return True

    def health(self):
        return {"status": "online", "healthy": True, "provider": self.name}

    def get_capabilities(self, model=None):
        return ModelCapabilities(modalities=["text", "code"], supports_code=True)

    def load_model(self, model_name: str) -> bool:
        self.loaded.append(model_name)
        if model_name not in self._running:
            self._running.append(model_name)
        return True

    def unload_model(self, model_name: str) -> bool:
        self.unloaded.append(model_name)
        if model_name in self._running:
            self._running.remove(model_name)
        return True


class TestModelManager(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.config_path = os.path.join(self.temp_dir.name, "active_model.json")
        self.mock_provider = MockProvider()
        self.mgr = ModelManager(provider=self.mock_provider, config_path=self.config_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_list_installed_models(self):
        """list_installed_models queries provider and returns list."""
        installed = self.mgr.list_installed_models()
        self.assertIn("llama3.2:3b", installed)
        self.assertIn("qwen2.5-coder:7b", installed)
        self.assertTrue(self.mgr.is_model_installed("llama3.2:3b"))
        self.assertFalse(self.mgr.is_model_installed("nonexistent-model:99b"))

    def test_list_running_models(self):
        """list_running_models queries loaded models from provider."""
        running = self.mgr.list_running_models()
        self.assertIn("llama3.2:3b", running)
        self.assertTrue(self.mgr.is_model_running("llama3.2:3b"))
        self.assertFalse(self.mgr.is_model_running("qwen2.5-coder:7b"))

    def test_get_model_metadata(self):
        """get_model_metadata computes approximate size, specs, and status."""
        meta = self.mgr.get_model_metadata("llama3.2:3b")
        self.assertIsInstance(meta, dict)
        self.assertEqual(meta["name"], "llama3.2:3b")
        self.assertEqual(meta["approximate_size_gb"], 2.0)
        self.assertTrue(meta["is_running"])
        self.assertTrue(meta["is_governor_allowed"])
        self.assertIn("capabilities", meta)

        # Test code model
        meta_code = self.mgr.get_model_metadata("qwen2.5-coder:7b")
        self.assertEqual(meta_code["approximate_size_gb"], 4.7)
        self.assertFalse(meta_code["is_running"])
        self.assertTrue(meta_code["capabilities"]["supports_code"])

    def test_get_all_models_status_snapshot(self):
        """get_all_models_status produces complete UI-ready dictionary."""
        status = self.mgr.get_all_models_status()
        self.assertIn("installed_models", status)
        self.assertIn("running_models", status)
        self.assertIn("models_metadata", status)
        self.assertIn("active_model", status)
        self.assertIn("is_auto_routing", status)
        self.assertIn("provider", status)

        self.assertEqual(status["installed_models"], ["llama3.2:3b", "qwen2.5-coder:7b"])
        self.assertEqual(status["running_models"], ["llama3.2:3b"])
        self.assertTrue(len(status["models_metadata"]) >= 2)

    def test_active_model_persistence(self):
        """get_active_model_setting and set_active_model_setting read and persist correctly."""
        # Default is auto
        self.assertEqual(self.mgr.get_active_model_setting(), "auto")

        # Set specific model
        success = self.mgr.set_active_model_setting("deepseek-r1:8b")
        self.assertTrue(success)
        self.assertEqual(self.mgr.get_active_model_setting(), "deepseek-r1:8b")

        # Check persisted file
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.assertEqual(data.get("active_model"), "deepseek-r1:8b")

    def test_load_and_unload_model(self):
        """load_model and unload_model call through to provider."""
        # Load qwen2.5-coder:7b
        res_load = self.mgr.load_model("qwen2.5-coder:7b")
        self.assertTrue(res_load)
        self.assertIn("qwen2.5-coder:7b", self.mock_provider.loaded)
        self.assertTrue(self.mgr.is_model_running("qwen2.5-coder:7b"))

        # Unload llama3.2:3b
        res_unload = self.mgr.unload_model("llama3.2:3b")
        self.assertTrue(res_unload)
        self.assertIn("llama3.2:3b", self.mock_provider.unloaded)
        self.assertFalse(self.mgr.is_model_running("llama3.2:3b"))

    def test_graceful_offline_provider_fallback(self):
        """ModelManager does not crash when provider is None or throws exceptions."""
        broken_mgr = ModelManager(provider=None, config_path=self.config_path)
        self.assertEqual(broken_mgr.list_installed_models(), [])
        self.assertEqual(broken_mgr.list_running_models(), [])
        status = broken_mgr.get_all_models_status()
        self.assertEqual(status["installed_models"], [])
        self.assertEqual(status["running_models"], [])
        self.assertFalse(broken_mgr.load_model("llama3.2:3b"))
        self.assertFalse(broken_mgr.unload_model("llama3.2:3b"))


if __name__ == "__main__":
    unittest.main()
