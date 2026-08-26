"""
LUMIN LLM Client Layer.
Maintains 100% backward compatibility for all existing OllamaClient call sites
while routing through the unified LLM Provider abstraction.
"""

from typing import Any, Optional
from llm.providers.ollama import OllamaProvider, retry_api_call
from llm.providers.base import BaseModelProvider, ModelCapabilities, ProviderHealth


class OllamaClient(OllamaProvider):
    """
    Ollama LLM and embedding client utilizing direct, dependency-free HTTP REST calls.
    Provides robust local intelligence execution and fallback matching.
    Inherits from OllamaProvider to preserve full backward compatibility across all call sites.
    """
    def __init__(self, base_url: str = "http://localhost:11434", resource_governor: Any = None):
        super().__init__(base_url=base_url, resource_governor=resource_governor)


__all__ = [
    "OllamaClient",
    "OllamaProvider",
    "BaseModelProvider",
    "ModelCapabilities",
    "ProviderHealth",
    "retry_api_call",
]
