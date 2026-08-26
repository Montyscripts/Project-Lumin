"""
LUMIN Model Manager Service.
Provides centralized lifecycle, discovery, inspection, and resource governance
for installed and resident LLM models across providers.
Integrates with BaseModelProvider and ResourceGovernor.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple

from llm.providers.base import BaseModelProvider, ModelCapabilities
from llm.providers import get_provider
from core.resource_governor import ResourceGovernor, MODEL_SIZE_GB
from core.diagnostics import get_logger

logger = get_logger("model_manager")


class ModelManager:
    """
    Service for managing model state, discovery, runtime inspection,
    and metadata reporting across providers.
    """

    def __init__(
        self,
        provider: Optional[BaseModelProvider] = None,
        resource_governor: Optional[ResourceGovernor] = None,
        config_path: Optional[str] = None
    ):
        self.provider = provider or get_provider("ollama")
        self.resource_governor = resource_governor or ResourceGovernor()
        self.config_path = config_path or os.path.join(
            os.path.abspath(os.path.dirname(os.path.dirname(__file__))),
            "agent_config.json"
        )

    def list_installed_models(self) -> List[str]:
        """Returns the list of all installed model tags from the active provider."""
        if self.provider and hasattr(self.provider, "list_models"):
            try:
                return self.provider.list_models() or []
            except Exception as e:
                logger.debug(f"Error listing installed models from provider: {e}")
        return []

    def list_running_models(self) -> List[str]:
        """Returns the list of models currently loaded/resident in VRAM/memory."""
        if self.provider and hasattr(self.provider, "get_loaded_models"):
            try:
                return self.provider.get_loaded_models() or []
            except Exception as e:
                logger.debug(f"Error listing running models from provider: {e}")
        return []

    def get_model_metadata(self, model_name: str) -> Dict[str, Any]:
        """
        Returns rich metadata for a given model: name, approximate size (GB),
        VRAM residency status, governance admissibility, and capabilities.
        """
        clean_name = (model_name or "").strip()
        mod_key = clean_name.lower().split(":")[0] if clean_name else ""
        
        # Approximate size in GB
        size_gb = MODEL_SIZE_GB.get(clean_name, MODEL_SIZE_GB.get(mod_key, 3.0))

        # Admissibility under current resource governor constraints
        is_allowed, reason = True, "Allowed"
        if self.resource_governor and hasattr(self.resource_governor, "is_model_allowed"):
            is_allowed, reason = self.resource_governor.is_model_allowed(clean_name)

        # Capabilities
        caps = None
        if self.provider and hasattr(self.provider, "get_capabilities"):
            try:
                caps = self.provider.get_capabilities(clean_name)
            except Exception:
                caps = None

        running_list = self.list_running_models()
        is_running = any(
            r == clean_name or clean_name.startswith(r) or r.startswith(clean_name)
            for r in running_list
        )

        return {
            "name": clean_name,
            "approximate_size_gb": size_gb,
            "is_running": is_running,
            "is_governor_allowed": is_allowed,
            "governor_reason": reason,
            "capabilities": {
                "modalities": caps.modalities if caps else ["text"],
                "supports_vision": caps.supports_vision if caps else False,
                "supports_code": caps.supports_code if caps else False,
                "supports_embeddings": caps.supports_embeddings if caps else False,
                "max_context_length": caps.max_context_length if caps else 16384,
            } if caps else {
                "modalities": ["text"],
                "supports_vision": False,
                "supports_code": False,
                "supports_embeddings": False,
                "max_context_length": 16384
            }
        }

    def get_all_models_status(self) -> Dict[str, Any]:
        """
        Returns a comprehensive snapshot of installed models, running models,
        active model configuration, and resource governor metrics.
        """
        installed = self.list_installed_models()
        running = self.list_running_models()
        active_config = self.get_active_model_setting()

        model_details = [self.get_model_metadata(m) for m in installed]

        gov_caps = self.resource_governor.active_constraints if self.resource_governor else {}

        return {
            "provider": getattr(self.provider, "name", "unknown"),
            "provider_healthy": self.provider.is_healthy() if self.provider and hasattr(self.provider, "is_healthy") else False,
            "active_model": active_config,
            "active_model_setting": active_config,
            "is_auto_routing": active_config == "auto",
            "installed_count": len(installed),
            "running_count": len(running),
            "installed_models": installed,
            "running_models": running,
            "models_metadata": model_details,
            "governor_caps": gov_caps
        }

    def get_active_model_setting(self) -> str:
        """Reads the currently configured active/forced model setting from agent_config.json."""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    forced = cfg.get("active_model") or cfg.get("force_model")
                    if forced and isinstance(forced, str):
                        f_clean = forced.strip().lower()
                        if f_clean not in ("auto", "router", "auto-router", "smart router"):
                            return forced.strip()
            return "auto"
        except Exception as e:
            logger.debug(f"Failed to read active model setting from {self.config_path}: {e}")
            return "auto"

    def set_active_model_setting(self, model_name: str) -> bool:
        """Persists the user's chosen active model or 'auto' into agent_config.json."""
        try:
            cfg = {}
            if os.path.exists(self.config_path):
                with open(self.config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)

            raw = (model_name or "").strip().lower()
            is_auto = not raw or raw in ("auto", "router", "auto-router", "smart router")
            val = None if is_auto else model_name.strip()
            cfg["force_model"] = val
            cfg["active_model"] = "auto" if is_auto else model_name.strip()

            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to save active model setting to {self.config_path}: {e}")
            return False

    def is_model_installed(self, model_name: str) -> bool:
        """Checks if a model is installed by checking provider installed models list."""
        if not model_name:
            return False
        clean = model_name.strip()
        installed = self.list_installed_models()
        return any(
            i == clean or clean.startswith(i) or i.startswith(clean)
            for i in installed
        )

    def is_model_running(self, model_name: str) -> bool:
        """Checks if a model is currently loaded in memory."""
        if not model_name:
            return False
        clean = model_name.strip()
        running = self.list_running_models()
        return any(
            r == clean or clean.startswith(r) or r.startswith(clean)
            for r in running
        )

    def load_model(self, model_name: str) -> bool:
        """Preloads a model into memory/VRAM via the active provider."""
        if not model_name:
            return False
        if self.provider and hasattr(self.provider, "load_model"):
            try:
                return self.provider.load_model(model_name)
            except Exception as e:
                logger.debug(f"Error preloading model {model_name}: {e}")
        return False

    def unload_model(self, model_name: str) -> bool:
        """Unloads a model from memory/VRAM via the active provider."""
        if not model_name:
            return False
        if self.provider and hasattr(self.provider, "unload_model"):
            try:
                return self.provider.unload_model(model_name)
            except Exception as e:
                logger.debug(f"Error unloading model {model_name}: {e}")
        return False

    def stop_model(self, model_name: str) -> bool:
        """Alias for unload_model."""
        return self.unload_model(model_name)

    def get_missing_model_info(self, model_name: str) -> Dict[str, Any]:
        """
        Returns structured missing-model metadata for UI prompts and automated downloads.
        """
        clean_name = (model_name or "llama3.2:3b").strip()
        mod_key = clean_name.lower().split(":")[0] if clean_name else "llama3.2"
        size_gb = MODEL_SIZE_GB.get(clean_name, MODEL_SIZE_GB.get(mod_key, 2.0))
        size_str = f"{size_gb:.1f} GB"

        display_name = clean_name
        if "llama3.2:3b" in clean_name.lower():
            display_name = "Llama 3.2 3B (Fast Baseline)"
        elif "deepseek-r1" in clean_name.lower():
            display_name = "DeepSeek-R1 (Reasoning)"
        elif "qwen2.5-coder" in clean_name.lower():
            display_name = "Qwen 2.5 Coder (Engineering)"
        elif "phi4" in clean_name.lower():
            display_name = "Phi-4 (Logic & Reasoning)"
        elif "minicpm" in clean_name.lower() or "llava" in clean_name.lower():
            display_name = "Vision Multi-Modal Model"

        return {
            "model": clean_name,
            "display_name": display_name,
            "size_gb": size_gb,
            "size_str": size_str,
            "is_installed": self.is_model_installed(clean_name),
            "reason": f"Model '{clean_name}' ({size_str}) is not currently installed in Ollama."
        }

    def check_model_readiness(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Evaluates overall Ollama and target model readiness, determining if a user
        download prompt or first-run starter model installation is needed.
        """
        installed = self.list_installed_models()
        healthy = self.provider.is_healthy() if self.provider and hasattr(self.provider, "is_healthy") else False
        target = (model_name or self.get_active_model_setting() or "llama3.2:3b").strip()
        if target in ("auto", "router", "auto-router"):
            target = "llama3.2:3b"

        is_target_installed = any(
            i == target or target.startswith(i) or i.startswith(target)
            for i in installed
        ) if installed else False

        is_first_run = len(installed) == 0

        needs_prompt = not is_target_installed or is_first_run

        return {
            "healthy": healthy,
            "is_first_run": is_first_run,
            "target_model": target,
            "is_installed": is_target_installed,
            "installed_count": len(installed),
            "installed_models": installed,
            "needs_download_prompt": needs_prompt,
            "missing_info": self.get_missing_model_info(target) if needs_prompt else None
        }

