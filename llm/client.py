import os
import json
import urllib.request
import urllib.error
import logging
import time

logger = logging.getLogger("lumin.llm")

def retry_api_call(max_retries=3, initial_backoff=1.0):
    """Decorator to retry a function call with exponential backoff."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            backoff = initial_backoff
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        logger.error(f"All {max_retries} retry attempts failed for {func.__name__}: {e}")
                        raise e
                    logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {backoff:.1f}s...")
                    time.sleep(backoff)
                    backoff *= 2.0
            return None
        return wrapper
    return decorator

class OllamaClient:
    """
    Ollama LLM and embedding client utilizing direct, dependency-free HTTP REST calls.
    Provides robust local intelligence execution and fallback matching.
    """
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url

    @retry_api_call(max_retries=3, initial_backoff=1.0)
    def generate_content(self, prompt, system_instruction=None, model="llama3.2:3b", image_path=None):
        """Generates content locally using Ollama, supporting multimodal vision and runtime context injection."""
        url = f"{self.base_url}/api/generate"
        
        # Inject runtime context layer (Date, Time, OS, Model, Capabilities, Session) & resolve placeholders
        try:
            from core.runtime_context import RuntimeContextManager
            rcm = RuntimeContextManager()
            sys_inst = system_instruction or ""
            system_instruction, prompt = rcm.inject_context(sys_inst, prompt, active_model=model)
        except Exception as rcm_err:
            logger.debug(f"Runtime context injection in client failed: {rcm_err}")

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_ctx": 16384,
                "num_predict": 8192
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
    def get_embedding(self, text, model="nomic-embed-text"):
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
