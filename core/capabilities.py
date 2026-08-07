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

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.capabilities: Dict[str, Dict[str, Any]] = {}
        self.refresh()

    def refresh(self) -> Dict[str, Dict[str, Any]]:
        """Re-scans environment and dependencies to build capability map."""
        self.capabilities = {
            "local_llm": self._check_local_llm(),
            "local_tts": self._check_local_tts(),
            "cloud_tts": self._check_cloud_tts(),
            "stt_speech": self._check_stt_speech(),
            "vision": self._check_vision(),
            "browser_automation": self._check_browser_automation(),
            "process_management": self._check_process_management(),
            "mcp_server": self._check_mcp_server(),
        }
        return self.capabilities

    def _check_local_llm(self) -> Dict[str, Any]:
        has_ollama = shutil.which("ollama") is not None
        status = CapabilityStatus.AVAILABLE if has_ollama else CapabilityStatus.DEGRADED
        details = "Ollama CLI detected." if has_ollama else "Ollama binary not found in PATH; relying on fallback routing."
        return {
            "status": status,
            "local_first": True,
            "provider": "Ollama / Local HTTP",
            "details": details
        }

    def _check_local_tts(self) -> Dict[str, Any]:
        has_piper = shutil.which("piper") is not None
        try:
            import sounddevice  # type: ignore # noqa: F401
            has_sd = True
        except ImportError:
            has_sd = False

        if has_piper and has_sd:
            status = CapabilityStatus.AVAILABLE
            details = "Piper ONNX local TTS engine and sounddevice ready."
        elif has_piper or has_sd:
            status = CapabilityStatus.DEGRADED
            details = f"Partial local TTS setup: piper={'ok' if has_piper else 'missing'}, sounddevice={'ok' if has_sd else 'missing'}."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Neither piper binary nor sounddevice installed. Local TTS unavailable."

        return {
            "status": status,
            "local_first": True,
            "engine": "Piper ONNX",
            "details": details
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
        elif has_edge and not allowed:
            status = CapabilityStatus.DEGRADED
            details = "Edge-TTS installed but cloud fallback disabled in config (tts_allow_cloud_fallback: false)."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "edge-tts package not installed."

        return {
            "status": status,
            "local_first": False,
            "engine": "Microsoft Edge Neural TTS (Cloud)",
            "details": details
        }

    def _check_stt_speech(self) -> Dict[str, Any]:
        try:
            import speech_recognition  # type: ignore # noqa: F401
            has_sr = True
        except ImportError:
            has_sr = False

        try:
            import pyaudio  # type: ignore # noqa: F401
            has_pa = True
        except ImportError:
            has_pa = False

        if has_sr and has_pa:
            status = CapabilityStatus.AVAILABLE
            details = "SpeechRecognition and PyAudio active for local microphone input."
        elif has_sr:
            status = CapabilityStatus.DEGRADED
            details = "SpeechRecognition present, but PyAudio missing (mic input limited)."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Speech recognition dependencies not installed."

        return {
            "status": status,
            "local_first": True,
            "details": details
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

        if has_cv2 and has_pil:
            status = CapabilityStatus.AVAILABLE
            details = "OpenCV and PIL available for local image/screen analysis."
        elif has_pil:
            status = CapabilityStatus.DEGRADED
            details = "Pillow available, OpenCV missing (webcam capture disabled)."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Vision dependencies missing."

        return {
            "status": status,
            "local_first": True,
            "details": details
        }

    def _check_browser_automation(self) -> Dict[str, Any]:
        try:
            from selenium import webdriver  # type: ignore # noqa: F401
            has_selenium = True
        except ImportError:
            has_selenium = False

        has_chrome = shutil.which("chrome") or shutil.which("chromedriver") or shutil.which("google-chrome")

        if has_selenium and has_chrome:
            status = CapabilityStatus.AVAILABLE
            details = "Selenium and ChromeDriver/Chrome ready."
        elif has_selenium:
            status = CapabilityStatus.DEGRADED
            details = "Selenium installed, but Chrome executable not found in PATH."
        else:
            status = CapabilityStatus.UNAVAILABLE
            details = "Selenium package not installed."

        return {
            "status": status,
            "local_first": True,
            "details": details
        }

    def _check_process_management(self) -> Dict[str, Any]:
        try:
            import psutil  # type: ignore # noqa: F401
            has_psutil = True
        except ImportError:
            has_psutil = False

        status = CapabilityStatus.AVAILABLE if has_psutil else CapabilityStatus.DEGRADED
        details = "psutil available for OS process auditing." if has_psutil else "psutil missing; fallback process tools active."

        return {
            "status": status,
            "local_first": True,
            "details": details
        }

    def _check_mcp_server(self) -> Dict[str, Any]:
        enabled = self.config.get("enable_mcp", True)
        status = CapabilityStatus.AVAILABLE if enabled else CapabilityStatus.DEGRADED
        details = "MCP Server integrated locally." if enabled else "MCP Server disabled in configuration."

        return {
            "status": status,
            "local_first": True,
            "details": details
        }

    def get_summary_report(self) -> str:
        """Returns a human-readable diagnostic report for logs and UI status commands."""
        lines = ["=== LUMIN Capability & Privacy Matrix ==="]
        for cap, info in self.capabilities.items():
            sym = "✅" if info["status"] == CapabilityStatus.AVAILABLE else ("⚠️" if info["status"] == CapabilityStatus.DEGRADED else "❌")
            loc = "[LOCAL]" if info.get("local_first", True) else "[CLOUD]"
            lines.append(f"{sym} {cap.upper()} {loc}: {info['status'].upper()} - {info['details']}")
        return "\n".join(lines)
