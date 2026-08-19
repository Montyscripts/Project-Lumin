"""
LUMIN Capability Registry & Feature Flags System.
Dynamically detects hardware, optional dependencies, local AI models, and tool readiness.
Provides transparent diagnostics to prevent silent degradation.
"""

import sys
import os
import shutil
import logging
from typing import Dict, Any, List

logger = logging.getLogger("LUMIN.Capabilities")

class CapabilityStatus:
    AVAILABLE = "available"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"

class CapabilityRegistry:
    """Central registry tracking feature availability and optional dependency status."""

    def __init__(self, config: Dict[str, Any] = None, resource_governor: Any = None):
        self.config = config or {}
        if resource_governor is not None:
            self.resource_governor = resource_governor
        else:
            from core.resource_governor import ResourceGovernor
            self.resource_governor = ResourceGovernor(config=self.config)
        self.capabilities: Dict[str, Dict[str, Any]] = {}
        self.refresh()

    def refresh(self) -> Dict[str, Dict[str, Any]]:
        """Re-scans environment and dependencies to build capability map."""
        if hasattr(self, "resource_governor") and self.resource_governor:
            self.resource_governor.sample_resources()
        self.capabilities = {
            "local_llm": self._check_local_llm(),
            "local_tts": self._check_local_tts(),
            "cloud_tts": self._check_cloud_tts(),
            "stt_speech": self._check_stt_speech(),
            "vision": self._check_vision(),
            "browser_automation": self._check_browser_automation(),
            "process_management": self._check_process_management(),
            "mcp_server": self._check_mcp_server(),
            "document_ocr": self._check_document_ocr(),
            "system_resources": self._check_system_resources(),
        }
        return self.capabilities

    def _check_local_llm(self) -> Dict[str, Any]:
        has_ollama = shutil.which("ollama") is not None
        daemon_online = False
        installed_models = []

        try:
            import urllib.request
            import json
            req = urllib.request.Request("http://localhost:11434/api/tags", headers={"User-Agent": "LUMIN-Check"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    daemon_online = True
                    data = json.loads(resp.read().decode("utf-8"))
                    installed_models = [m.get("name") for m in data.get("models", []) if m.get("name")]
        except Exception:
            daemon_online = False

        ctx_len = self.resource_governor.get_max_context_length() if hasattr(self, "resource_governor") else 4096
        cap_gb = self.resource_governor.active_constraints.get("max_model_size_gb", 3.0) if hasattr(self, "resource_governor") else 3.0

        if has_ollama and daemon_online and installed_models:
            status = CapabilityStatus.AVAILABLE
            details = f"Ollama daemon active on port 11434 with {len(installed_models)} model(s) installed ({', '.join(installed_models[:3])}). Max context: {ctx_len} tokens, Cap: {cap_gb}GB."
            recovery = None
        elif has_ollama and daemon_online and not installed_models:
            status = CapabilityStatus.DEGRADED
            details = "Ollama daemon is running, but zero local AI models are installed."
            recovery = "Run 'ollama pull llama3.2:3b' or 'ollama pull qwen2.5-coder:7b' in your terminal to download a starter model."
        elif has_ollama and not daemon_online:
            status = CapabilityStatus.DEGRADED
            details = "Ollama CLI detected, but background daemon is not responding on port 11434."
            recovery = "Run 'ollama serve' in a separate terminal window to start the Ollama background service."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Ollama executable not found in system PATH."
            recovery = "Download Ollama from https://ollama.com or run 'winget install Ollama.Ollama' (Windows) / 'curl -fsSL https://ollama.com/install.sh | sh' (Linux/macOS)."

        return {
            "status": status,
            "local_first": True,
            "provider": "Ollama / Local HTTP",
            "details": details,
            "recovery": recovery,
            "daemon_online": daemon_online,
            "installed_models": installed_models
        }

    def _check_local_tts(self) -> Dict[str, Any]:
        has_piper = shutil.which("piper") is not None
        try:
            import sounddevice  # type: ignore # noqa: F401
            has_sd = True
        except (ImportError, OSError):
            has_sd = False

        if has_piper and has_sd:
            status = CapabilityStatus.AVAILABLE
            details = "Piper ONNX local TTS engine and sounddevice ready."
            recovery = None
        elif has_piper or has_sd:
            status = CapabilityStatus.DEGRADED
            details = f"Partial local TTS setup: piper={'ok' if has_piper else 'missing'}, sounddevice={'ok' if has_sd else 'missing'}."
            recovery = "Install sounddevice via 'pip install sounddevice' for local audio playback."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Neither piper binary nor sounddevice installed. Local audio synthesis disabled."
            recovery = "Run 'pip install sounddevice edge-tts' for voice output support."

        return {
            "status": status,
            "local_first": True,
            "engine": "Piper ONNX",
            "details": details,
            "recovery": recovery
        }

    def _check_cloud_tts(self) -> Dict[str, Any]:
        try:
            import edge_tts  # type: ignore # noqa: F401
            has_edge = True
        except ImportError:
            has_edge = False

        allowed = self.config.get("tts_allow_cloud_fallback", True)
        if has_edge and allowed:
            status = CapabilityStatus.AVAILABLE
            details = "Edge-TTS package installed and cloud fallback enabled in config."
            recovery = None
        elif has_edge and not allowed:
            status = CapabilityStatus.DEGRADED
            details = "Edge-TTS installed but cloud fallback disabled in config (tts_allow_cloud_fallback: false)."
            recovery = "Set 'tts_allow_cloud_fallback: true' in agent_config.json if cloud voice is desired."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "edge-tts package not installed."
            recovery = "Run 'pip install edge-tts' for Microsoft Edge Neural TTS audio output."

        return {
            "status": status,
            "local_first": False,
            "engine": "Microsoft Edge Neural TTS (Cloud)",
            "details": details,
            "recovery": recovery
        }

    def _check_stt_speech(self) -> Dict[str, Any]:
        try:
            import speech_recognition  # type: ignore # noqa: F401
            has_sr = True
        except (ImportError, OSError):
            has_sr = False

        try:
            import pyaudio  # type: ignore # noqa: F401
            has_pa = True
        except (ImportError, OSError):
            has_pa = False

        if has_sr and has_pa:
            status = CapabilityStatus.AVAILABLE
            details = "SpeechRecognition and PyAudio active for local microphone input."
            recovery = None
        elif has_sr:
            status = CapabilityStatus.DEGRADED
            details = "SpeechRecognition present, but PyAudio missing (mic input disabled)."
            recovery = "Run 'pip install pyaudio' (or install portaudio system package) for microphone voice input."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Speech recognition dependencies not installed."
            recovery = "Run 'pip install SpeechRecognition pyaudio' to enable voice input mode."

        return {
            "status": status,
            "local_first": True,
            "details": details,
            "recovery": recovery
        }

    def _check_vision(self) -> Dict[str, Any]:
        try:
            import cv2  # type: ignore # noqa: F401
            has_cv2 = True
        except ImportError:
            has_cv2 = False

        try:
            from PIL import Image  # type: ignore # noqa: F401
            has_pil = True
        except ImportError:
            has_pil = False

        permitted, reason = (True, "")
        if hasattr(self, "resource_governor") and self.resource_governor:
            permitted, reason = self.resource_governor.is_feature_permitted("vision")

        if not permitted:
            status = CapabilityStatus.DEGRADED if (has_cv2 or has_pil) else CapabilityStatus.UNAVAILABLE
            details = f"Vision disabled by ResourceGovernor ({reason})"
            recovery = "Vision disabled due to system resource profile constraints. Free up RAM/VRAM to enable."
        elif has_cv2 and has_pil:
            status = CapabilityStatus.AVAILABLE
            details = "OpenCV and PIL available for local image/screen analysis."
            recovery = None
        elif has_pil:
            status = CapabilityStatus.DEGRADED
            details = "Pillow available, OpenCV missing (webcam capture disabled)."
            recovery = "Run 'pip install opencv-python' to enable webcam frame capture."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Vision dependencies missing."
            recovery = "Run 'pip install pillow opencv-python' for image and vision analysis tools."

        return {
            "status": status,
            "local_first": True,
            "details": details,
            "recovery": recovery
        }

    def _check_browser_automation(self) -> Dict[str, Any]:
        try:
            from selenium import webdriver  # type: ignore # noqa: F401
            has_selenium = True
        except ImportError:
            has_selenium = False

        has_chrome = shutil.which("chrome") or shutil.which("chromedriver") or shutil.which("google-chrome") or shutil.which("chrome.exe")

        permitted, reason = (True, "")
        if hasattr(self, "resource_governor") and self.resource_governor:
            permitted, reason = self.resource_governor.is_feature_permitted("heavy_tools")

        if not permitted:
            status = CapabilityStatus.DEGRADED if has_selenium else CapabilityStatus.UNAVAILABLE
            details = f"Browser automation disabled by ResourceGovernor ({reason})"
            recovery = "Browser automation paused under current system resource constraints. Close background apps to re-enable."
        elif has_selenium and has_chrome:
            status = CapabilityStatus.AVAILABLE
            details = "Selenium and ChromeDriver/Chrome ready."
            recovery = None
        elif has_selenium:
            status = CapabilityStatus.DEGRADED
            details = "Selenium installed, but Chrome or ChromeDriver executable not found in PATH."
            recovery = "Install Google Chrome from https://google.com/chrome or run 'pip install webdriver-manager'."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Selenium package not installed."
            recovery = "Run 'pip install selenium webdriver-manager' for automated browser interaction."

        return {
            "status": status,
            "local_first": True,
            "details": details,
            "recovery": recovery
        }

    def _check_process_management(self) -> Dict[str, Any]:
        try:
            import psutil  # type: ignore # noqa: F401
            has_psutil = True
        except ImportError:
            has_psutil = False

        status = CapabilityStatus.AVAILABLE if has_psutil else CapabilityStatus.DEGRADED
        details = "psutil available for OS process auditing." if has_psutil else "psutil missing; fallback process tools active."
        recovery = None if has_psutil else "Run 'pip install psutil' for high-precision OS process monitoring."

        return {
            "status": status,
            "local_first": True,
            "details": details,
            "recovery": recovery
        }

    def _check_mcp_server(self) -> Dict[str, Any]:
        enabled = self.config.get("enable_mcp", True)
        status = CapabilityStatus.AVAILABLE if enabled else CapabilityStatus.DEGRADED
        details = "MCP Server integrated locally." if enabled else "MCP Server disabled in configuration."
        recovery = None if enabled else "Set 'enable_mcp: true' in agent_config.json to enable the MCP tool server."

        return {
            "status": status,
            "local_first": True,
            "details": details,
            "recovery": recovery
        }

    def _check_document_ocr(self) -> Dict[str, Any]:
        has_pypdf = False
        has_renderer = False
        has_pytesseract = False
        has_tesseract_bin = shutil.which("tesseract") is not None or os.path.exists("C:\\Program Files\\Tesseract-OCR\\tesseract.exe")

        try:
            import pypdf  # type: ignore # noqa: F401
            has_pypdf = True
        except ImportError:
            pass

        try:
            import pymupdf  # type: ignore # noqa: F401
            has_renderer = True
        except ImportError:
            try:
                import fitz  # type: ignore # noqa: F401
                has_renderer = True
            except ImportError:
                try:
                    import pdf2image  # type: ignore # noqa: F401
                    has_renderer = True
                except ImportError:
                    pass

        try:
            import pytesseract  # type: ignore # noqa: F401
            has_pytesseract = True
        except ImportError:
            pass

        if has_renderer and has_pytesseract and has_tesseract_bin:
            status = CapabilityStatus.AVAILABLE
            details = "Full document ingestion pipeline ready: pypdf + page image renderer + Tesseract OCR binary."
            recovery = None
        elif has_renderer:
            status = CapabilityStatus.DEGRADED
            details = "PDF page renderer ready (PyMuPDF). Tesseract OCR binary not found in PATH — scanned PDFs will route directly to vision models (MiniCPM-V/Qwen2.5-VL)."
            recovery = "Install Tesseract OCR binary for text-based OCR: 'winget install UB-Mannheim.TesseractOCR' (Windows) or 'sudo apt install tesseract-ocr' (Linux)."
        elif has_pypdf:
            status = CapabilityStatus.DEGRADED
            details = "Native text PDF parser present (pypdf). Page image renderer missing."
            recovery = "Run 'pip install pymupdf pytesseract' for scanned & image-heavy PDF support."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "PDF parsing libraries missing."
            recovery = "Run 'pip install pypdf pymupdf pytesseract pdf2image' to enable document analysis."

        return {
            "status": status,
            "local_first": True,
            "details": details,
            "recovery": recovery
        }

    def _check_system_resources(self) -> Dict[str, Any]:
        hw = self.resource_governor.sample_resources() if hasattr(self, "resource_governor") else {}
        ram_avail = hw.get("ram_available_gb", 8.0)
        ram_total = hw.get("ram_total_gb", 16.0)
        disk_free = hw.get("disk_free_gb", 50.0)
        cpu_load = hw.get("cpu_load_pct", 10.0)
        sys_class = self.resource_governor.classify_system_class(hw) if hasattr(self, "resource_governor") else "Desktop"

        issues = []
        recoveries = []

        if ram_avail < 3.0 or ram_total < 4.0:
            issues.append(f"Low available RAM ({ram_avail:.1f} GB free of {ram_total:.1f} GB total)")
            recoveries.append("System low on RAM. LUMIN automatically applies low-resource routing policy (capping model sizes to <=3B). Close heavy background applications if higher model capacity is needed.")

        if disk_free < 5.0:
            issues.append(f"Low free disk space ({disk_free:.1f} GB free)")
            recoveries.append("Free up disk space before downloading larger LLM weights.")

        if cpu_load > 90.0:
            issues.append(f"High CPU load ({cpu_load:.1f}%)")
            recoveries.append("System is under heavy CPU load; inference speeds may be temporarily reduced.")

        if issues:
            status = CapabilityStatus.DEGRADED
            details = f"System Class: {sys_class}. Constraints: " + "; ".join(issues)
            recovery = " ".join(recoveries)
        else:
            status = CapabilityStatus.AVAILABLE
            details = f"Class: {sys_class} | RAM: {ram_avail:.1f}GB free / {ram_total:.1f}GB total | Disk: {disk_free:.1f}GB free | CPU Load: {cpu_load:.1f}%"
            recovery = None

        return {
            "status": status,
            "local_first": True,
            "details": details,
            "recovery": recovery
        }

    def get_actionable_recovery_report(self) -> str:
        """Returns a user-friendly report listing any degraded/unavailable features with exact recovery steps."""
        actions = []
        for cap, info in self.capabilities.items():
            if info["status"] in (CapabilityStatus.DEGRADED, CapabilityStatus.UNAVAILABLE) and info.get("recovery"):
                cap_title = cap.replace("_", " ").upper()
                actions.append(f"• [{cap_title}] - {info['details']}\n  ➜ RECOVERY ACTION: {info['recovery']}")
        
        if not actions:
            return "✅ All core capabilities, models, audio backends, drivers, and resources are healthy and operational!"
        
        header = "═══════════════════════════════════════════════════════════════════════\n" \
                 "  [LUMIN DIAGNOSTICS & ACTIONABLE RECOVERY ADVISORY]\n" \
                 "═══════════════════════════════════════════════════════════════════════"
        return header + "\n" + "\n\n".join(actions) + "\n═══════════════════════════════════════════════════════════════════════"

    def get_summary_report(self) -> str:
        """Returns a human-readable diagnostic report for logs and UI status commands."""
        lines = ["=== LUMIN Capability & Privacy Matrix ===", "Available capabilities:"]
        for cap, info in self.capabilities.items():
            sym = "✅" if info["status"] == CapabilityStatus.AVAILABLE else ("⚠️" if info["status"] == CapabilityStatus.DEGRADED else "❌")
            loc = "[LOCAL]" if info.get("local_first", True) else "[CLOUD]"
            lines.append(f"{sym} {cap.upper()} {loc}: {info['status'].upper()} - {info['details']}")
        if hasattr(self, "resource_governor") and self.resource_governor:
            lines.append("\n" + self.resource_governor.get_governance_report())
        return "\n".join(lines)
