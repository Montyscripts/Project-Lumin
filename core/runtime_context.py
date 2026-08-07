"""
Runtime Context Injection Layer for LUMIN AI Agent.

This module guarantees that dynamic application runtime variables
(Current Date, Current Time, Operating System, Active Model, Available Capabilities, User Session Information)
are dynamically compiled, placeholders are resolved, and context is injected into
all system instructions and LLM prompts before generation.
"""

import os
import re
import platform
import datetime
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger("lumin.runtime_context")


class RuntimeContextManager:
    """
    Manages runtime context generation, template placeholder replacement,
    and automatic context injection into LLM prompts and system instructions.
    """

    def __init__(self, agent=None):
        self.agent = agent

    def get_current_date(self) -> str:
        """Returns current date formatted clearly (e.g., 'July 31, 2026')."""
        return datetime.datetime.now().strftime("%B %d, %Y")

    def get_current_time(self) -> str:
        """Returns current time formatted clearly (e.g., '03:27:48 PM')."""
        now = datetime.datetime.now()
        tz_name = now.astimezone().tzname() or ""
        time_str = now.strftime("%I:%M:%S %p")
        if tz_name:
            time_str += f" {tz_name}"
        return time_str

    def get_operating_system(self) -> str:
        """Returns operating system and platform details."""
        sys_name = platform.system() or "Linux"
        plat_str = platform.platform() or sys_name
        return f"{sys_name} ({plat_str})"

    def get_active_model(self, model_override: Optional[str] = None) -> str:
        """Determines active LLM model."""
        if model_override:
            return model_override
        if self.agent:
            if getattr(self.agent, "force_model", None):
                return self.agent.force_model
            if getattr(self.agent, "active_model", None):
                return self.agent.active_model
        return "llama3.2:3b"

    def get_capabilities_summary(self) -> str:
        """Generates structured summary of available capabilities."""
        if self.agent and hasattr(self.agent, "capabilities") and self.agent.capabilities:
            try:
                self.agent.capabilities.refresh()
                caps_map = self.agent.capabilities.get_all()
                active_caps = [
                    f"{info.get('name', cap)}"
                    for cap, info in caps_map.items()
                    if info.get('status') == 'Active' or info.get('active', True)
                ]
                if active_caps:
                    return ", ".join(active_caps)
            except Exception as e:
                logger.debug(f"Error fetching capabilities: {e}")

        return (
            "Document & File Processing (PDF, DOCX, XLSX, Images), Multimodal Vision Analysis, "
            "Text-to-Speech (TTS/STT), Local Automation & Script Execution, Web Search & Browsing, "
            "ReAct Multi-Step Reasoning Engine, Dual-Role MCP Protocol, Protected Sandboxing"
        )

    def get_user_session_info(self) -> str:
        """Returns structured user session information."""
        user_email = os.environ.get("USER_EMAIL", "passtheaux20@gmail.com")
        session_id = os.environ.get("SESSION_ID", "ssn_active_session")
        workspace = os.getcwd()
        return f"User Email: {user_email} | Session ID: {session_id} | Workspace: {workspace}"

    def build_context_dict(self, active_model: Optional[str] = None) -> Dict[str, str]:
        """Builds a complete key-value dictionary of runtime context variables."""
        date_val = self.get_current_date()
        time_val = self.get_current_time()
        os_val = self.get_operating_system()
        model_val = self.get_active_model(active_model)
        cap_val = self.get_capabilities_summary()
        session_val = self.get_user_session_info()

        return {
            "current_date": date_val,
            "date": date_val,
            "today_date": date_val,
            "current_time": time_val,
            "time": time_val,
            "operating_system": os_val,
            "os": os_val,
            "active_model": model_val,
            "model": model_val,
            "available_capabilities": cap_val,
            "capabilities": cap_val,
            "user_session": session_val,
            "user_session_information": session_val,
            "session_info": session_val,
            "user_session_info": session_val,
        }

    def format_runtime_context_block(self, active_model: Optional[str] = None) -> str:
        """Generates formatted runtime environment header block to inject into prompts."""
        ctx = self.build_context_dict(active_model)
        return (
            "### RUNTIME ENVIRONMENT CONTEXT ###\n"
            f"- Current Date: {ctx['current_date']}\n"
            f"- Current Time: {ctx['current_time']}\n"
            f"- Operating System: {ctx['operating_system']}\n"
            f"- Active Model: {ctx['active_model']}\n"
            f"- Available Capabilities: {ctx['available_capabilities']}\n"
            f"- User Session Information: {ctx['user_session']}\n"
            "==================================="
        )

    def resolve_placeholders(self, text: str, active_model: Optional[str] = None) -> str:
        """
        Replaces all unresolved placeholders in text with runtime context values.
        Supports bracketed ([current_date]), curly ({current_date}), double curly ({{current_date}}) syntax.
        """
        if not text or not isinstance(text, str):
            return text

        ctx = self.build_context_dict(active_model)

        # 1. Exact variable mappings replacement
        for var_name, var_value in ctx.items():
            safe_val = str(var_value)
            # Bracket pattern: [current_date], [CURRENT_DATE]
            text = re.sub(
                rf'\[\s*{re.escape(var_name)}\s*\]',
                lambda m, v=safe_val: v,
                text,
                flags=re.IGNORECASE
            )
            # Curly pattern: {current_date}, {{current_date}}
            text = re.sub(
                rf'\{{\s*{{?\s*{re.escape(var_name)}\s*}}?\s*\}}',
                lambda m, v=safe_val: v,
                text,
                flags=re.IGNORECASE
            )

        # 2. General regex fallback for any remaining unresolved variables like [current_date], [current_time]
        def fallback_replacer(match):
            var = match.group(1).strip().lower()
            if var in ctx:
                return ctx[var]
            if "date" in var:
                return ctx["current_date"]
            if "time" in var:
                return ctx["current_time"]
            if "model" in var:
                return ctx["active_model"]
            if "os" in var or "system" in var:
                return ctx["operating_system"]
            if "capab" in var:
                return ctx["available_capabilities"]
            if "session" in var or "user" in var:
                return ctx["user_session"]
            return match.group(0)

        text = re.sub(r'\[([a-zA-Z0-9_\-\s]+)\]', fallback_replacer, text)
        text = re.sub(r'\{([a-zA-Z0-9_\-\s]+)\}', fallback_replacer, text)

        return text

    def inject_context(
        self,
        system_prompt: str,
        user_prompt: str = "",
        active_model: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Injects runtime context into system instructions and user prompts,
        ensuring all placeholders are resolved before sending to LLM.
        """
        resolved_sys = self.resolve_placeholders(system_prompt or "", active_model)
        resolved_user = self.resolve_placeholders(user_prompt or "", active_model)

        if "### RUNTIME ENVIRONMENT CONTEXT ###" not in resolved_sys:
            ctx_block = self.format_runtime_context_block(active_model)
            resolved_sys = f"{resolved_sys}\n\n{ctx_block}".strip()

        return resolved_sys, resolved_user
