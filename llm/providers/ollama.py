"""
LUMIN Ollama Model Provider.
Direct HTTP REST implementation for local Ollama daemon integration.
Preserves 100% of existing client behaviors, retry mechanisms, context injection, and options.
"""

import os
import sys
import json
import time
import shutil
import logging
import subprocess
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional

from llm.providers.base import BaseModelProvider, ModelCapabilities, ProviderHealth
from core.diagnostics import get_logger

logger = get_logger("llm.ollama")


def retry_api_call(max_retries=3, initial_backoff=1.0):
    """Decorator to retry an API call with exponential backoff."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            backoff = initial_backoff
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    # Do not retry on connection refused (daemon offline) or mock/unit test exceptions
                    is_conn_refused = (
                        isinstance(e, ConnectionRefusedError)
                        or (isinstance(e, urllib.error.URLError) and ("refused" in str(e).lower() or isinstance(e.reason, ConnectionRefusedError)))
                        or isinstance(e, RuntimeError)
                    )
                    if is_conn_refused or attempt == max_retries - 1:
                        if not is_conn_refused:
                            logger.error(f"All {max_retries} retry attempts failed for {func.__name__}: {e}")
                        raise e
                    logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {backoff:.1f}s...")
                    time.sleep(backoff)
                    backoff *= 2.0
            return None
        return wrapper
    return decorator


class OllamaProvider(BaseModelProvider):
    """
    Ollama LLM and embedding provider utilizing direct, dependency-free HTTP REST calls.
    Provides robust local intelligence execution, capability detection, and fallback matching.
    """

    name: str = "ollama"

    def __init__(self, base_url: str = "http://localhost:11434", resource_governor: Any = None):
        self.base_url = base_url.rstrip("/")
        self.resource_governor = resource_governor

    @retry_api_call(max_retries=3, initial_backoff=1.0)
    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: str = "llama3.2:3b",
        image_path: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generates content locally using Ollama, supporting multimodal vision and runtime context injection."""
        url = f"{self.base_url}/api/generate"

        # Inject runtime context layer (Date, Time, OS, Model, Capabilities, Session) & resolve placeholders
        try:
            from core.runtime_context import RuntimeContextManager
            rcm = RuntimeContextManager()
            sys_inst = system_instruction or ""
            system_instruction, prompt = rcm.inject_context(sys_inst, prompt, active_model=model)
        except Exception as rcm_err:
            logger.debug(f"Runtime context injection in provider failed: {rcm_err}")

        num_ctx = kwargs.get("num_ctx")
        if num_ctx is None and hasattr(self, "resource_governor") and self.resource_governor:
            num_ctx = self.resource_governor.get_max_context_length()
        if num_ctx is None:
            num_ctx = 16384

        temperature = kwargs.get("temperature", 0.3)
        num_predict = kwargs.get("num_predict", 8192)

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_ctx": num_ctx,
                "num_predict": num_predict
            }
        }
        if system_instruction:
            payload["system"] = system_instruction

        if image_path and os.path.exists(image_path):
            try:
                import base64
                with open(image_path, "rb") as img_file:
                    img_data = base64.b64encode(img_file.read()).decode("utf-8")
                    payload["images"] = [img_data]
                logger.info(f"Loaded image into Ollama payload: {image_path}")
            except Exception as e:
                logger.error(f"Failed to load image for Ollama: {e}")

        headers = {"Content-Type": "application/json"}
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=120) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                resp_text = res_data.get("response", "").strip()
                try:
                    from core.runtime_context import RuntimeContextManager
                    rcm = RuntimeContextManager()
                    resp_text = rcm.resolve_placeholders(resp_text, active_model=model)
                except Exception:
                    pass
                return resp_text
        except Exception as e:
            logger.error(f"Ollama local generation REST failure: {e}")
            raise e

    @retry_api_call(max_retries=3, initial_backoff=0.5)
    def embed(
        self,
        text: str,
        model: str = "nomic-embed-text"
    ) -> List[float]:
        """Generates a text embedding vector using Ollama."""
        url = f"{self.base_url}/api/embeddings"
        payload = {
            "model": model,
            "prompt": text
        }
        headers = {"Content-Type": "application/json"}
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data.get("embedding", [])
        except Exception as e:
            logger.debug(f"Ollama local embedding REST failure: {e}")
            raise e

    def list_models(self) -> List[str]:
        """Retrieves list of installed Ollama model tags."""
        url = f"{self.base_url}/api/tags"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LUMIN-Provider"})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    return [m.get("name") for m in data.get("models", []) if m.get("name")]
        except Exception as e:
            logger.debug(f"Ollama tags endpoint connection check failed on {url}: {e}")
        return []

    def get_loaded_models(self) -> List[str]:
        """Queries Ollama /api/ps to inspect active in-memory models."""
        url = f"{self.base_url}/api/ps"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LUMIN-Provider"})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    return [m.get("name") for m in data.get("models", []) if m.get("name")]
        except Exception as e:
            logger.debug(f"Ollama ps endpoint query failed on {url}: {e}")
        return []

    def is_healthy(self) -> bool:
        """Returns True if Ollama service is reachable and responding."""
        url = f"{self.base_url}/api/tags"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LUMIN-Health"})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                return resp.status == 200
        except Exception:
            return False

    def health(self) -> Dict[str, Any]:
        """Returns structured diagnostic health info for the Ollama provider."""
        online = self.is_healthy()
        installed = self.list_models() if online else []
        loaded = self.get_loaded_models() if online else []
        status = "online" if (online and installed) else ("degraded" if online else "offline")

        return {
            "healthy": online,
            "status": status,
            "provider": self.name,
            "base_url": self.base_url,
            "installed_models_count": len(installed),
            "installed_models": installed,
            "loaded_models": loaded,
            "details": f"Ollama daemon at {self.base_url} is {status} ({len(installed)} models installed, {len(loaded)} resident)."
        }

    def get_capabilities(self, model: Optional[str] = None) -> ModelCapabilities:
        """
        Inspects capabilities for the given model or general Ollama capabilities.
        Uses model naming conventions and resource governor limits to determine supported features.
        """
        target = (model or "llama3.2:3b").lower()

        is_vision = any(v in target for v in ("minicpm-v", "gemma4", "qwen2.5vl", "llava", "vision"))
        is_code = any(c in target for c in ("coder", "codegemma", "starcoder", "deepseek-coder"))
        is_embedding = any(e in target for e in ("embed", "nomic-embed", "bge", "all-minilm"))

        modalities = ["text"]
        if is_vision:
            modalities.append("image_vision")
        if is_code:
            modalities.append("code")
        if "phi" in target or "mistral" in target or "llama" in target or "qwen" in target:
            modalities.append("document")

        ctx_len = 16384
        if hasattr(self, "resource_governor") and self.resource_governor:
            ctx_len = self.resource_governor.get_max_context_length()

        estimated_vram = 3.0
        try:
            from core.resource_governor import MODEL_SIZE_GB
            for key, val in MODEL_SIZE_GB.items():
                if key in target:
                    estimated_vram = val
                    break
        except Exception:
            pass

        return ModelCapabilities(
            modalities=modalities,
            supports_vision=is_vision,
            supports_code=is_code,
            supports_embeddings=is_embedding or target.startswith("nomic-embed"),
            supports_streaming=False,
            max_context_length=ctx_len,
            estimated_vram_gb=estimated_vram,
            raw_details={"model": target, "provider": self.name}
        )

    def pull_model(self, model_name: str, is_starter: bool = False) -> bool:
        """Pulls an Ollama model using local CLI subprocess."""
        ollama_bin = shutil.which("ollama") or "ollama"
        try:
            proc = subprocess.Popen(
                [ollama_bin, "pull", model_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                errors="replace",
                bufsize=1
            )
            while True:
                line = proc.stdout.readline()
                if not line and proc.poll() is not None:
                    break
                if line:
                    sys.stdout.write(line)
                    sys.stdout.flush()
            return proc.poll() == 0
        except Exception as e:
            logger.debug(f"Error pulling model {model_name}: {e}")
            return False

    def load_model(self, model_name: str) -> bool:
        """Preloads a model into memory/VRAM via Ollama /api/generate with keep_alive."""
        if not model_name:
            return False
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model_name,
            "prompt": "",
            "keep_alive": "5m"
        }
        headers = {"Content-Type": "application/json"}
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.status == 200
        except Exception as e:
            logger.debug(f"Ollama load_model failed for {model_name}: {e}")
            return False

    def unload_model(self, model_name: str) -> bool:
        """Unloads a model from memory/VRAM via Ollama /api/generate with keep_alive: 0."""
        if not model_name:
            return False
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model_name,
            "prompt": "",
            "keep_alive": 0
        }
        headers = {"Content-Type": "application/json"}
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200
        except Exception as e:
            logger.debug(f"Ollama unload_model failed for {model_name}: {e}")
            return False

