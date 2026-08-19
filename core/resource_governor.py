"""
LUMIN Resource Governor System.
Monitors system hardware (RAM, VRAM, CPU load), maps system profiles to model constraints,
max context lengths, heavy tool concurrency, vision capabilities, and large file structural mapping.
Forces dynamic fallbacks when measured free memory is low.
"""

import os
import shutil
import platform
import logging
import subprocess
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger("LUMIN.ResourceGovernor")

try:
    import psutil
    PSUTIL_OK = True
except ImportError:
    PSUTIL_OK = False

MODEL_SIZE_GB = {
    "llama3.2:3b":           2.0,
    "phi4-mini":             2.5,
    "gemma3:4b":             2.5,
    "gemma4:e4b":            3.2,
    "gemma4:12b":            8.0,
    "gemma4":                4.0,
    "mistral:7b":            4.1,
    "qwen2.5:7b":            4.5,
    "llava:7b":              4.5,
    "qwen2.5-coder:7b":      4.7,
    "codegemma:7b":          5.0,
    "qwen2.5vl:7b":          4.7,
    "minicpm-v:8b":          5.5,
    "dolphin-llama3:8b":     4.9,
    "dolphin-mistral:7b-v2.6-dpo-laser": 4.1,
}

SYSTEM_CLASS_CAPS = {
    "Workstation Class": {
        "max_model_size_gb": 20.0,
        "max_context_length": 32768,
        "max_concurrent_heavy_tools": 4,
        "vision_permitted": True,
        "large_structural_mapping_permitted": True,
        "gpu_acceleration_permitted": True,
    },
    "High-End Desktop Class": {
        "max_model_size_gb": 10.0,
        "max_context_length": 16384,
        "max_concurrent_heavy_tools": 2,
        "vision_permitted": True,
        "large_structural_mapping_permitted": True,
        "gpu_acceleration_permitted": True,
    },
    "Mid-End Desktop Class": {
        "max_model_size_gb": 5.0,
        "max_context_length": 8192,
        "max_concurrent_heavy_tools": 1,
        "vision_permitted": True,
        "large_structural_mapping_permitted": True,
        "gpu_acceleration_permitted": True,
    },
    "Laptop / Low-Resource Class": {
        "max_model_size_gb": 3.0,
        "max_context_length": 4096,
        "max_concurrent_heavy_tools": 1,
        "vision_permitted": False,
        "large_structural_mapping_permitted": False,
        "gpu_acceleration_permitted": False,
    },
}

class ResourceGovernor:
    """
    Monitors host hardware resources and enforces dynamic capability & model constraints.
    Prevents Out-Of-Memory crashes, system thrashing, and silent failures by constraining
    model sizes, context lengths, concurrent heavy tools, vision/multimodal usage, and file mapping.
    """
    def __init__(self, config: Optional[Dict[str, Any]] = None, override_profile: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.override_profile = override_profile
        self.metrics: Dict[str, Any] = {}
        self.active_constraints: Dict[str, Any] = {}
        self.sample_resources()

    def set_override_profile(self, profile: Optional[Dict[str, Any]]):
        """Sets a mock hardware profile for testing or profiling."""
        self.override_profile = profile
        self.sample_resources()

    def sample_resources(self) -> Dict[str, Any]:
        """Samples hardware profile and updates dynamic operational constraints."""
        if self.override_profile:
            hw = dict(self.override_profile)
        else:
            hw = self._detect_hardware()

        self.metrics = hw
        self.active_constraints = self._evaluate_constraints(hw)
        return self.metrics

    def _detect_hardware(self) -> Dict[str, Any]:
        """Detects CPU, RAM, GPU, VRAM, disk free space, and CPU load."""
        cpu_name = "Unknown CPU"
        try:
            cpu_name = platform.processor() or "Unknown CPU"
        except Exception:
            cpu_name = "Unknown CPU"

        os_name = f"{platform.system()} {platform.release()}"
        try:
            os_name = f"{platform.system()} {platform.release()}"
        except Exception:
            os_name = "Linux"

        hw = {
            "cpu_name": cpu_name,
            "cpu_cores": os.cpu_count() or 4,
            "cpu_load_pct": 0.0,
            "ram_total_gb": 16.0,
            "ram_available_gb": 8.0,
            "disk_free_gb": 50.0,
            "os": os_name,
            "gpu_name": "None",
            "gpu_vram_gb": 0.0,
            "vram_free_gb": 0.0,
            "cuda_available": False,
        }

        if PSUTIL_OK:
            try:
                vm = psutil.virtual_memory()
                hw["ram_total_gb"] = round(vm.total / (1024**3), 1)
                hw["ram_available_gb"] = round(vm.available / (1024**3), 1)
                hw["cpu_load_pct"] = round(psutil.cpu_percent(interval=None), 1)
                total, used, free = shutil.disk_usage(".")
                hw["disk_free_gb"] = round(free / (1024**3), 1)
            except Exception as e:
                logger.debug(f"psutil sampling warning: {e}")

        # GPU detection via nvidia-smi query
        try:
            res = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
                capture_output=True,
                text=True,
                timeout=3,
                check=False
            )
            if res.returncode == 0 and res.stdout.strip():
                line = res.stdout.strip().split('\n')[0]
                if ',' in line:
                    parts = line.split(',')
                    gpu_name = parts[0].strip()
                    try:
                        vram_total_mb = float(parts[1].strip())
                        vram_free_mb = float(parts[2].strip())
                        hw["gpu_name"] = gpu_name
                        hw["gpu_vram_gb"] = round(vram_total_mb / 1024.0, 1)
                        hw["vram_free_gb"] = round(vram_free_mb / 1024.0, 1)
                        hw["cuda_available"] = True
                    except (ValueError, IndexError):
                        pass
        except Exception as e:
            logger.debug(f"nvidia-smi query failed: {e}")

        return hw

    def classify_system_class(self, hw: Optional[Dict[str, Any]] = None) -> str:
        """Classifies system class based on specs."""
        profile = hw or self.metrics
        ram = profile.get("ram_total_gb", 16.0)
        vram = profile.get("gpu_vram_gb", 0.0)

        if vram >= 12.0 and ram >= 64.0:
            return "Workstation Class"
        elif vram >= 8.0 and ram >= 32.0:
            return "High-End Desktop Class"
        elif vram >= 4.0 and ram >= 16.0:
            return "Mid-End Desktop Class"
        return "Laptop / Low-Resource Class"

    def _evaluate_constraints(self, hw: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates dynamic operational limits based on system class and real-time measurements."""
        sys_class = self.classify_system_class(hw)
        base = dict(SYSTEM_CLASS_CAPS.get(sys_class, SYSTEM_CLASS_CAPS["Laptop / Low-Resource Class"]))

        ram_free = hw.get("ram_available_gb", 8.0)
        cpu_load = hw.get("cpu_load_pct", 0.0)
        vram_free = hw.get("vram_free_gb", hw.get("gpu_vram_gb", 0.0))
        has_cuda = hw.get("cuda_available", False)

        overrides = []

        # Forced Low-Memory / High CPU Load Fallback Logic:
        if ram_free < 3.0 or cpu_load > 90.0:
            base["max_model_size_gb"] = min(base["max_model_size_gb"], 3.0)
            base["max_context_length"] = min(base["max_context_length"], 2048)
            base["max_concurrent_heavy_tools"] = 0
            base["vision_permitted"] = False
            base["large_structural_mapping_permitted"] = False
            overrides.append("CRITICAL LOW RAM / HIGH CPU: Model size forced <= 3.0GB, Context=2048, Heavy tools/Vision disabled")

        elif ram_free < 5.0:
            base["max_model_size_gb"] = min(base["max_model_size_gb"], 3.0)
            base["max_context_length"] = min(base["max_context_length"], 4096)
            base["max_concurrent_heavy_tools"] = min(base["max_concurrent_heavy_tools"], 1)
            base["vision_permitted"] = False
            base["large_structural_mapping_permitted"] = False
            overrides.append("LOW RAM (<5.0GB): Model size cap 3.0GB, Context=4096, Vision/Large Mapping disabled")

        if not has_cuda or vram_free < 2.0:
            base["gpu_acceleration_permitted"] = False
            if ram_free < 8.0:
                base["vision_permitted"] = False
                overrides.append("NO CUDA / LOW VRAM + RAM < 8GB: Vision models disabled to prevent system thrashing")

        base["system_class"] = sys_class
        base["active_overrides"] = overrides
        return base

    def is_model_allowed(self, model_name: str) -> Tuple[bool, str]:
        """Checks if a model name is permitted under current resource constraints."""
        if not model_name:
            return True, "Default model"

        mod_key = model_name.lower().split(":")[0]
        size_gb = MODEL_SIZE_GB.get(model_name, MODEL_SIZE_GB.get(mod_key, 3.0))

        cap_gb = self.active_constraints.get("max_model_size_gb", 3.0)
        if size_gb > cap_gb:
            return False, f"Model '{model_name}' size ({size_gb}GB) exceeds current resource cap ({cap_gb}GB)."
        return True, f"Model '{model_name}' size ({size_gb}GB) is within resource cap ({cap_gb}GB)."

    def filter_allowed_models(self, candidate_models: List[str]) -> List[str]:
        """Filters a list of candidate models to those allowed under current constraints."""
        allowed = []
        for m in candidate_models:
            ok, _ = self.is_model_allowed(m)
            if ok:
                allowed.append(m)
        return allowed

    def get_max_context_length(self) -> int:
        """Returns maximum allowed context length (num_ctx)."""
        return int(self.active_constraints.get("max_context_length", 4096))

    def is_feature_permitted(self, feature_name: str) -> Tuple[bool, str]:
        """Checks if high-cost feature is permitted ('vision', 'heavy_tools', 'large_structural_mapping', 'gpu_acceleration')."""
        if feature_name == "vision":
            permitted = self.active_constraints.get("vision_permitted", False)
            reason = "Vision permitted" if permitted else "Vision disabled due to resource constraints (low RAM/VRAM or Laptop class)."
            return permitted, reason
        elif feature_name == "heavy_tools":
            max_tools = self.active_constraints.get("max_concurrent_heavy_tools", 0)
            permitted = max_tools > 0
            reason = f"Max heavy tools = {max_tools}" if permitted else "Heavy tools disabled due to severe RAM/CPU constraints."
            return permitted, reason
        elif feature_name == "large_structural_mapping":
            permitted = self.active_constraints.get("large_structural_mapping_permitted", False)
            reason = "Large structural mapping permitted" if permitted else "Large file structural mapping disabled to prevent memory pressure."
            return permitted, reason
        elif feature_name == "gpu_acceleration":
            permitted = self.active_constraints.get("gpu_acceleration_permitted", False)
            reason = "GPU acceleration active" if permitted else "GPU acceleration disabled (CPU-only path active)."
            return permitted, reason
        return True, "Feature permitted"

    def get_governance_report(self) -> str:
        """Generates a human-readable diagnostic capability and constraint report."""
        self.sample_resources()
        hw = self.metrics
        c = self.active_constraints

        lines = [
            "=== LUMIN Resource Governor Matrix ===",
            f"• System Class: {c.get('system_class', 'Unknown')}",
            f"• Measured Specs: RAM: {hw.get('ram_available_gb', 0)}GB free / {hw.get('ram_total_gb', 0)}GB total | GPU: {hw.get('gpu_name', 'None')} ({hw.get('gpu_vram_gb', 0)}GB VRAM) | CPU Load: {hw.get('cpu_load_pct', 0)}%",
            f"• Model Size Cap: {c.get('max_model_size_gb', 3.0)} GB",
            f"• Max Context Length: {c.get('max_context_length', 4096)} tokens",
            f"• Max Concurrent Heavy Tools: {c.get('max_concurrent_heavy_tools', 1)}",
            "• Feature Policies:",
            f"  - Vision / Multimodal: {'✅ PERMITTED' if c.get('vision_permitted') else '❌ DISABLED'}",
            f"  - Large File Structural Mapping: {'✅ PERMITTED' if c.get('large_structural_mapping_permitted') else '❌ DISABLED'}",
            f"  - GPU Acceleration: {'✅ ACTIVE' if c.get('gpu_acceleration_permitted') else '❌ OFF (CPU-only path)'}"
        ]

        overrides = c.get("active_overrides", [])
        if overrides:
            lines.append("• Active Resource Overrides / Fallbacks:")
            for ov in overrides:
                lines.append(f"  ⚠️ {ov}")

        return "\n".join(lines)
