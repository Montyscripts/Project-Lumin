"""
Unit tests for LUMIN Model Provider Abstraction Layer.
Covers:
- BaseModelProvider interface compliance
- OllamaProvider local HTTP REST execution, mock generate, and mock embeddings
- Backward-compatible aliases (generate_content, get_embedding)
- Model capability detection (vision, code, document, embeddings, context limits)
- Provider health diagnostics and loaded model querying
- Provider registry factory pattern (get_provider, register_provider)
- ResourceGovernor context propagation
"""

import unittest
from unittest.mock import patch, MagicMock
import json
import urllib.error

from llm.providers.base import BaseModelProvider, ModelCapabilities, ProviderHealth
from llm.providers.ollama import OllamaProvider, retry_api_call
from llm.providers import get_provider, register_provider
from llm.client import OllamaClient
from core.resource_governor import ResourceGovernor


class DummyCustomProvider(BaseModelProvider):
    name = "custom_mock"

    def generate(self, prompt: str, system_instruction: str = None, model: str = "custom", image_path: str = None, **kwargs) -> str:
        return f"Custom response to: {prompt}"

    def embed(self, text: str, model: str = "custom-embed"):
        return [0.1, 0.2, 0.3]

    def list_models(self):
        return ["custom:latest"]

    def get_loaded_models(self):
        return ["custom:latest"]

    def is_healthy(self):
        return True

    def health(self):
        return {"status": "online", "healthy": True, "provider": self.name}

    def get_capabilities(self, model=None):
        return ModelCapabilities(modalities=["text", "code"], supports_code=True)


class TestModelProviders(unittest.TestCase):
    def setUp(self):
        self.provider = OllamaProvider(base_url="http://localhost:11434")

    def test_provider_factory_and_registration(self):
        """get_provider returns default OllamaProvider and supports custom registration."""
        default_prov = get_provider("ollama")
        self.assertIsInstance(default_prov, OllamaProvider)
        self.assertEqual(default_prov.name, "ollama")

        # Register custom provider
        register_provider("custom_mock", DummyCustomProvider)
        custom_prov = get_provider("custom_mock")
        self.assertIsInstance(custom_prov, DummyCustomProvider)
        self.assertEqual(custom_prov.generate("test"), "Custom response to: test")
        self.assertEqual(custom_prov.embed("test"), [0.1, 0.2, 0.3])

    def test_ollama_client_backward_compatibility(self):
        """OllamaClient acts as an alias / subclass of OllamaProvider with all legacy methods."""
        client = OllamaClient(base_url="http://localhost:11434")
        self.assertIsInstance(client, OllamaProvider)
        self.assertIsInstance(client, BaseModelProvider)
        self.assertTrue(hasattr(client, "generate_content"))
        self.assertTrue(hasattr(client, "get_embedding"))
        self.assertTrue(hasattr(client, "list_models"))
        self.assertTrue(hasattr(client, "get_loaded_models"))
        self.assertTrue(hasattr(client, "get_capabilities"))

    def test_model_capabilities_detection(self):
        """get_capabilities accurately classifies vision, code, document, and embedding models."""
        # Vision model
        caps_vision = self.provider.get_capabilities("minicpm-v:8b")
        self.assertTrue(caps_vision.supports_vision)
        self.assertIn("image_vision", caps_vision.modalities)

        # Code model
        caps_code = self.provider.get_capabilities("qwen2.5-coder:7b")
        self.assertTrue(caps_code.supports_code)
        self.assertIn("code", caps_code.modalities)

        # Document model
        caps_doc = self.provider.get_capabilities("phi4-mini")
        self.assertIn("document", caps_doc.modalities)

        # Embedding model
        caps_embed = self.provider.get_capabilities("nomic-embed-text")
        self.assertTrue(caps_embed.supports_embeddings)

    def test_resource_governor_context_propagation(self):
        """Provider extracts max context length from ResourceGovernor if attached."""
        rg = ResourceGovernor(override_profile={"ram_total_gb": 64.0, "gpu_vram_gb": 16.0, "cpu_count": 16})
        prov = OllamaProvider(resource_governor=rg)
        caps = prov.get_capabilities("llama3.2:3b")
        self.assertEqual(caps.max_context_length, 32768)

    @patch("urllib.request.urlopen")
    def test_generate_mock_success(self, mock_urlopen):
        """generate successfully sends payload to Ollama and resolves content."""
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"response": "Hello from LUMIN!"}).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        result = self.provider.generate(
            prompt="Greet the user",
            system_instruction="You are LUMIN.",
            model="llama3.2:3b"
        )
        self.assertEqual(result, "Hello from LUMIN!")

        # Test compatibility alias
        alias_res = self.provider.generate_content(
            prompt="Greet the user",
            model="llama3.2:3b"
        )
        self.assertEqual(alias_res, "Hello from LUMIN!")

    @patch("urllib.request.urlopen")
    def test_embed_mock_success(self, mock_urlopen):
        """embed successfully sends text to Ollama and retrieves embedding vector."""
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"embedding": [0.05, -0.12, 0.88]}).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        emb = self.provider.embed("Sample semantic chunk")
        self.assertEqual(emb, [0.05, -0.12, 0.88])

        # Test compatibility alias
        emb_alias = self.provider.get_embedding("Sample semantic chunk")
        self.assertEqual(emb_alias, [0.05, -0.12, 0.88])

    @patch("urllib.request.urlopen")
    def test_list_and_loaded_models_mock(self, mock_urlopen):
        """list_models and get_loaded_models parse endpoint JSON arrays properly."""
        # /api/tags mock
        mock_tags_resp = MagicMock()
        mock_tags_resp.status = 200
        mock_tags_resp.read.return_value = json.dumps({
            "models": [{"name": "llama3.2:3b"}, {"name": "qwen2.5-coder:7b"}]
        }).encode("utf-8")

        mock_urlopen.return_value.__enter__.return_value = mock_tags_resp
        models = self.provider.list_models()
        self.assertEqual(models, ["llama3.2:3b", "qwen2.5-coder:7b"])
        self.assertTrue(self.provider.is_healthy())

        # Health info
        h = self.provider.health()
        self.assertTrue(h["healthy"])
        self.assertEqual(h["installed_models_count"], 2)


if __name__ == "__main__":
    unittest.main()
