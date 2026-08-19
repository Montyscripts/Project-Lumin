"""
Runtime Context Injection Layer for LUMIN AI Agent.

This module guarantees that dynamic application runtime variables
(Current Date, Current Time, Operating System, Active Model, Available Capabilities, User Session Information)
are dynamically compiled, placeholders are resolved, and context is injected into
all system instructions and LLM prompts before generation.
"""

import os
import re
import json
import platform
import datetime
import logging
from typing import Dict, Any, Tuple, Optional, List

logger = logging.getLogger("lumin.runtime_context")

DEFAULT_USER_CONTEXT = """# USER.md — User Profile & Preferences
## Identity
- **Name**: User
- **Role**: Software Engineer & Creative Technologist
- **Primary Languages**: TypeScript, Python, Rust, Go
- **Environment**: Linux / Web Local-First Agent Runtime

## Goals & Workflows
- Building high-performance local AI agent workflows and creative interfaces.
- Prefers concise, direct responses with actionable code and minimal conversational filler.
- Appreciates proactive system health diagnostics, performance metrics, and clean architecture.

## Interaction Preferences
- Code Style: Modern TypeScript, modular functions, strict types, zero superfluous comments.
- Tone: Professional, competent, technical, sharp.
"""

DEFAULT_IDENTITY_CONTEXT = """# IDENTITY.md — LUMIN Personality & Directives
## Core Persona
You are **LUMIN** — an advanced local-first personal AI agent runtime.
You operate with senior-staff engineering precision, deep systems empathy, and creative visual elegance.

## Communication Philosophy
- **Direct & High-Agency**: Solve problems completely. Never give half-baked solutions or placeholder stubs.
- **Architectural Rigor**: Maintain clear boundaries between Model (brain), Context (identity & memory), Skills (jobs), and Harness (runtime).
- **Proactive & Grounded**: Acknowledge local execution context, hardware constraints, and active tools.

## Vocal & Conversational Nuance
- When speaking over TTS, keep spoken sentences natural, rhythmic, and punchy.
- Avoid reading out dense raw JSON, URLs, or long regexes aloud.
"""

DEFAULT_MEMORY_CONTEXT = f"""# MEMORY.md — Durable Knowledge & Learned Preferences
## System Milestones
- [{datetime.date.today().isoformat()}] LUMIN v9.0 personal agent architecture initialized.
- [Context Layer] User profile, identity guidelines, rules, and skills system configured.

## Active Projects & Notes
- Working on LUMIN local AI agent runtime enhancements.
- 3D Visualizer: Real-time WebGL audio-reactive geometry and shader pipeline active.
- Access Policy: Sandboxed local execution with Unrestricted mode available via system authorization.
"""

DEFAULT_RULES_CONTEXT = """# RULES.md — Hard Operational Constraints & Output Policies
## Safety & Boundaries
1. **Local-First Privacy**: Never exfiltrate private user context or memory to unauthorized third-party endpoints.
2. **Access Level Respect**: Adhere strictly to the active access policy (SANDBOXED vs UNRESTRICTED). In Sandboxed mode, confine file modifications to the allowed workspace paths.
3. **Idempotence & Reliability**: Ensure automation scripts and tool executions handle errors gracefully without crashing the agent harness.

## Output Formatting
- Use Markdown for structured text, tables, and bullet points.
- Highlight key parameters in **bold** or inline `code`.
- Keep voice-mode responses conversational and easy to synthesize.
"""

DEFAULT_CONTEXT_MAP = {
    "USER.md": DEFAULT_USER_CONTEXT,
    "IDENTITY.md": DEFAULT_IDENTITY_CONTEXT,
    "MEMORY.md": DEFAULT_MEMORY_CONTEXT,
    "RULES.md": DEFAULT_RULES_CONTEXT,
}


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

    def get_lumin_context_files(self) -> Dict[str, str]:
        """
        Reads markdown files from lumin_context/ workspace directory.
        If the directory or any context file is missing, automatically creates them
        from sensible default templates so disk remains the single source of truth.
        """
        context_files = {}
        workspace_dirs = [
            os.path.join(os.getcwd(), "lumin_context"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "lumin_context")
        ]
        
        target_dir = workspace_dirs[0]
        try:
            if not os.path.exists(target_dir):
                os.makedirs(target_dir, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not create lumin_context directory at {target_dir}: {e}")

        for fname, default_content in DEFAULT_CONTEXT_MAP.items():
            content = None
            for cdir in workspace_dirs:
                if os.path.exists(cdir) and os.path.isdir(cdir):
                    fpath = os.path.join(cdir, fname)
                    if os.path.exists(fpath) and os.path.isfile(fpath):
                        try:
                            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                                read_data = f.read().strip()
                                if read_data:
                                    content = read_data
                        except Exception as e:
                            logger.error(f"Error reading context file {fpath}: {e}")
                        break
            
            if content is None:
                content = default_content.strip()
                # Create on disk to maintain disk single source of truth
                fpath = os.path.join(target_dir, fname)
                try:
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(default_content)
                    logger.info(f"Initialized default context file: {fpath}")
                except Exception as e:
                    logger.warning(f"Could not auto-create context file {fpath}: {e}")
            
            context_files[fname] = content

        return context_files

    def get_lumin_skills(self) -> List[Dict[str, Any]]:
        """Reads registered skill capability packs from lumin_context/SKILLS/registry.json."""
        workspace_dirs = [
            os.path.join(os.getcwd(), "lumin_context", "SKILLS"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "lumin_context", "SKILLS")
        ]
        for sdir in workspace_dirs:
            rpath = os.path.join(sdir, "registry.json")
            if os.path.exists(rpath) and os.path.isfile(rpath):
                try:
                    with open(rpath, "r", encoding="utf-8", errors="ignore") as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            return data
                except Exception:
                    pass
        return []

    def format_runtime_context_block(self, active_model: Optional[str] = None) -> str:
        """Generates formatted runtime environment header block to inject into prompts."""
        ctx = self.build_context_dict(active_model)
        block = (
            "### RUNTIME ENVIRONMENT CONTEXT ###\n"
            f"- Current Date: {ctx['current_date']}\n"
            f"- Current Time: {ctx['current_time']}\n"
            f"- Operating System: {ctx['operating_system']}\n"
            f"- Active Model: {ctx['active_model']}\n"
            f"- Available Capabilities: {ctx['available_capabilities']}\n"
            f"- User Session Information: {ctx['user_session']}\n"
            "==================================="
        )
        l_ctx = self.get_lumin_context_files()
        if l_ctx:
            block += "\n\n### LOCAL CONTEXT WORKSPACE (lumin_context/) ###\n"
            for fname, content in l_ctx.items():
                block += f"\n[{fname}]\n{content}\n"
            block += "==============================================="

        skills = self.get_lumin_skills()
        active_skills = [s for s in skills if s.get("isEnabled", True)]
        if active_skills:
            block += "\n\n### REGISTERED SKILLS (lumin_context/SKILLS/registry.json) ###\n"
            for sk in active_skills:
                block += f"- [{sk.get('name', '')}] ({sk.get('category', '')}): {sk.get('description', '')}\n"
            block += "=============================================================="
        return block

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
