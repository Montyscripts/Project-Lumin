"""
LUMIN LLM Providers Package.
Exposes standard provider abstractions and implementations for LLM inference and embeddings.
"""

from typing import Optional, Dict, Any, Type
from llm.providers.base import BaseModelProvider, ModelCapabilities, ProviderHealth
from llm.providers.ollama import OllamaProvider, retry_api_call

_PROVIDER_REGISTRY: Dict[str, Type[BaseModelProvider]] = {
    "ollama": OllamaProvider,
}


def register_provider(name: str, provider_cls: Type[BaseModelProvider]) -> None:
    """Registers a new model provider class in the global registry."""
    _PROVIDER_REGISTRY[name.lower()] = provider_cls


def get_provider(
    name: str = "ollama",
    base_url: Optional[str] = None,
    resource_governor: Any = None,
    **kwargs
) -> BaseModelProvider:
    """
    Factory function to instantiate a model provider by name.
    Defaults to the local Ollama provider.
    """
    prov_name = (name or "ollama").lower()
    prov_cls = _PROVIDER_REGISTRY.get(prov_name, OllamaProvider)
    if prov_cls is OllamaProvider:
        url = base_url or "http://localhost:11434"
        return OllamaProvider(base_url=url, resource_governor=resource_governor)
    return prov_cls(**kwargs)


__all__ = [
    "BaseModelProvider",
    "ModelCapabilities",
    "ProviderHealth",
    "OllamaProvider",
    "retry_api_call",
    "get_provider",
    "register_provider",
]
