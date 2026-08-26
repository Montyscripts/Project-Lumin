"""
LUMIN Model Provider Abstraction Layer.
Defines abstract base interfaces and data models for local and remote LLM providers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class ModelCapabilities:
    """Model capabilities representation for intelligent routing and resource management."""
    modalities: List[str] = field(default_factory=lambda: ["text"])
    supports_vision: bool = False
    supports_code: bool = False
    supports_embeddings: bool = False
    supports_streaming: bool = False
    max_context_length: int = 16384
    estimated_vram_gb: float = 0.0
    raw_details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProviderHealth:
    """Standardized provider health status."""
    healthy: bool = False
    status: str = "offline"  # "online", "degraded", "offline"
    details: str = ""
    installed_models_count: int = 0
    raw_details: Dict[str, Any] = field(default_factory=dict)


class BaseModelProvider(ABC):
    """
    Abstract Base Class for LLM inference and embedding providers.
    Standardizes model discovery, capability detection, generation, and health checking.
    """

    name: str = "base"

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: str = "llama3.2:3b",
        image_path: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generates content from the model given a prompt and optional multimodal / system inputs."""
        pass

    @abstractmethod
    def embed(
        self,
        text: str,
        model: str = "nomic-embed-text"
    ) -> List[float]:
        """Generates an embedding vector for the given text."""
        pass

    @abstractmethod
    def list_models(self) -> List[str]:
        """Returns a list of all installed/available models from this provider."""
        pass

    @abstractmethod
    def get_loaded_models(self) -> List[str]:
        """Returns a list of models currently resident in memory/VRAM."""
        pass

    @abstractmethod
    def is_healthy(self) -> bool:
        """Returns True if the provider service is reachable and functional."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Returns diagnostic health information for the provider."""
        pass

    @abstractmethod
    def get_capabilities(self, model: Optional[str] = None) -> ModelCapabilities:
        """Returns capability metadata for a specific model or the default model."""
        pass

    def pull_model(self, model_name: str, is_starter: bool = False) -> bool:
        """Optional hook to download or pull a model."""
        return False

    def load_model(self, model_name: str) -> bool:
        """Optional hook to preload/load a model into memory/VRAM."""
        return False

    def unload_model(self, model_name: str) -> bool:
        """Optional hook to unload/stop a model from memory/VRAM."""
        return False

    # Compatibility aliases
    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: str = "llama3.2:3b",
        image_path: Optional[str] = None,
        **kwargs
    ) -> str:
        """Backward compatibility alias for generate()."""
        return self.generate(prompt, system_instruction=system_instruction, model=model, image_path=image_path, **kwargs)

    def get_embedding(
        self,
        text: str,
        model: str = "nomic-embed-text"
    ) -> List[float]:
        """Backward compatibility alias for embed()."""
        return self.embed(text, model=model)
