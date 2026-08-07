"""
LUMIN AI Agent - Intent Router & Command Execution Layer
Classifies user requests prior to LLM inference and intercepts application commands.
Ensures application-level control commands NEVER reach the LLM.
"""

from enum import Enum
import re
import os
import sys
import logging

logger = logging.getLogger("LUMIN")

class IntentType(str, Enum):
    APPLICATION_COMMAND = "APPLICATION_COMMAND"
    WRITING_TASK = "WRITING_TASK"
    FILE_TASK = "FILE_TASK"
    BROWSER_TASK = "BROWSER_TASK"
    VOICE_TTS_TASK = "VOICE_TTS_TASK"
    NORMAL_CONVERSATION = "NORMAL_CONVERSATION"

class IntentRouter:
    """
    Router layer that classifies user prompts into high-level intent categories
    and executes application commands directly without invoking LLM inference.
    """
    def __init__(self, agent=None):
        self.agent = agent

    def clean_input(self, user_input: str) -> str:
        """Strip input artifacts like 'You:', '[User]:' etc and trailing punctuation."""
        if not user_input:
            return ""
        clean_input = user_input.strip()
        while True:
            new_input = re.sub(r'^(?:[Uu]?You|[Uu]ser|\[User\])\s*[:>]\s*', '', clean_input, flags=re.IGNORECASE).strip()
            if new_input == clean_input:
                break
            clean_input = new_input
        return clean_input.strip(" .!?,;:")

    def is_large_pasted_input(self, query: str) -> bool:
        """
        Detects when the user pastes large amounts of code, long documents, or structured text
        directly into the chat input field instead of uploading a file.
        """
        if not query:
            return False
        clean = query.strip()
        if len(clean) < 350:
            return False

        # 1. Very long text (>1200 chars or >20 lines)
        if len(clean) > 1200 or len(clean.splitlines()) > 20:
            return True

        # 2. Contains code indicators or markdown code blocks
        code_indicators = (
            "```", "def ", "class ", "import ", "from ", "function ", "const ", "let ", "var ",
            "return ", "public ", "private ", "void ", "async ", "select ", "where ",
            "<div", "<html", "<script", "package ", "#include", "using ", "namespace ",
            "interface ", "type ", "export ", "defun ", "struct ", "impl "
        )
        if any(marker in clean for marker in code_indicators):
            return True

        # 3. High symbol density characteristic of source code
        symbols = set("{}[]();=<>+*&|#")
        symbol_count = sum(1 for c in clean if c in symbols)
        if symbol_count > 15 and len(clean) > 350:
            return True

        return False

    def classify(self, query: str) -> tuple[IntentType, dict]:
        """
        Classifies incoming user query into one of 6 core IntentTypes.
        Returns (IntentType, metadata_dict).
        """
        cleaned = self.clean_input(query)
        low = cleaned.lower()

        if not cleaned:
            return (IntentType.NORMAL_CONVERSATION, {"raw_query": query})

        # 0. Check for Large Pasted Code or Document Input FIRST
        if self.is_large_pasted_input(cleaned):
            return (IntentType.FILE_TASK, {"raw_query": cleaned, "is_pasted_code_text": True})

        # 1. Check for APPLICATION_COMMAND
        if self._is_application_command(low, cleaned):
            return (IntentType.APPLICATION_COMMAND, {"raw_query": cleaned})

        # 2. Check for VOICE_TTS_TASK
        if self._is_voice_tts_task(low, cleaned):
            return (IntentType.VOICE_TTS_TASK, {"raw_query": cleaned})

        # 3. Check for FILE_TASK
        if self._is_file_task(low, cleaned):
            return (IntentType.FILE_TASK, {"raw_query": cleaned})

        # 4. Check for WRITING_TASK
        if self._is_writing_task(low, cleaned):
            return (IntentType.WRITING_TASK, {"raw_query": cleaned})

        # 5. Check for BROWSER_TASK
        if self._is_browser_task(low, cleaned):
            return (IntentType.BROWSER_TASK, {"raw_query": cleaned})

        # Default fallback to NORMAL_CONVERSATION
        return (IntentType.NORMAL_CONVERSATION, {"raw_query": cleaned})

    def route(self, query: str) -> tuple[bool, str | None]:
        """
        Routes prompt queries and intercepts application control commands directly.
        Returns (is_intercepted: bool, result_output: str | None).
        """
        intent_type, metadata = self.classify(query)
        if intent_type == IntentType.APPLICATION_COMMAND:
            result = self.execute_application_command(query, metadata)
            return True, result
        return False, None


    def _is_application_command(self, low: str, raw: str) -> bool:
        """Determines if prompt is an administrative/application control command."""
        # Help & System commands
        if low in ("help", "?", "exit", "quit", "status", "show status", "agent status", "system status", "diagnostics"):
            return True

        # Capability reporting commands
        if low in ("capabilities", "show capabilities", "capability status", "capability report", "capabilities report", "list capabilities", "check capabilities"):
            return True
        if re.search(r'^\s*(?:show|check|get|list|display)\s+(?:the\s+)?capabilities\s*$', low):
            return True

        # Model commands
        if low in ("models", "list models", "show models", "available models", "get models", "list all models"):
            return True
        if low in ("show current model", "current model", "active model", "what model", "which model", "show model", "get model", "check model", "what model are you using"):
            return True
        if low in ("switch model", "change model", "switch to another model", "change to another model", "use another model", "next model", "swap model", "rotate model"):
            return True
        if low.startswith("model ") or low == "model" or low == "model auto":
            return True
        if re.search(r'\b(?:switch|change|set|toggle|rotate|swap|use)\b.*\bmodel\b', low):
            return True
        if re.search(r'\b(?:switch|change|set|lock)\s+(?:model\s+)?(?:to\s+)?([a-z0-9_.:\-]+)\b', low):
            return True
        if re.search(r'\b(?:switch\s+to|change\s+to|use)\s+(?:the\s+)?([a-z0-9_.:\-]+)\s+model\b', low):
            return True

        # TTS & Voice Engine commands
        if low in ("tts on", "tts off", "tts full", "tts short", "tts confirmations", "enable tts", "disable tts", "turn on tts", "turn off tts", "toggle tts"):
            return True
        if low.startswith("tts ") or low == "tts":
            return True
        if re.search(r'\b(?:enable|disable|turn\s+on|turn\s+off|toggle)\s+tts\b', low):
            return True
        if re.search(r'\b(?:change|switch|set|use)\s+tts\s+engine\b', low) or re.search(r'\b(?:tts\s+engine|engine)\s+(?:to\s+)?(local_piper|piper|native|os_native|edge_tts|edge|cloud|auto|automatic)\b', low):
            return True
        if low.startswith("voice ") or low in ("voice list", "list voices", "show voices", "supported voices"):
            return True
        if re.search(r'\b(?:change|switch|set)\s+(?:tts\s+)?voice\b', low):
            return True

        # System Prompt & Memory meta commands
        if low in ("reset system prompt", "clear system prompt", "system prompt", "show system prompt", "get system prompt"):
            return True
        if re.match(r"^set\s+system[_\-\s]+prompt", low):
            return True
        if low in ("forget", "clear memory", "wipe memory", "reset memory"):
            return True

        # MCP Commands
        if low in ("mcp", "mcp status", "mcp info", "enable mcp", "disable mcp", "mcp on", "mcp off", "turn on mcp", "turn off mcp"):
            return True

        # Mode & Config toggles
        if low in ("/dev", "developer mode on", "developer mode", "dev mode"):
            return True
        if low in ("mode", "input mode", "change mode", "switch mode", "typing mode", "voice mode", "speak mode"):
            return True
        if low.startswith("dryrun ") or low.startswith("auto ") or "unrestricted" in low or "sandbox" in low:
            return True
        if "auto_launch_wake" in low or "auto_stop_sleep" in low:
            return True

        # Pure desktop app launch or close commands (e.g. "open notepad", "close chrome")
        if re.search(r"^\s*(?:please\s+)?(?:launch|run|open|start|close|quit|stop|terminate|kill)\s+(chrome|firefox|edge|notepad|calculator|calc|cmd|powershell|word|excel|vscode|code|paint|spotify|explorer)\s*$", low):
            return True

        return False

    def _is_voice_tts_task(self, low: str, raw: str) -> bool:
        if self.agent and hasattr(self.agent, "_detect_voice_launch_intent") and self.agent._detect_voice_launch_intent(raw):
            return True
        if self.agent and hasattr(self.agent, "_detect_voice_shutdown_intent") and self.agent._detect_voice_shutdown_intent(raw):
            return True
        return False

    def _is_writing_task(self, low: str, raw: str) -> bool:
        # Document analysis / summarize queries are FILE_TASK, not WRITING_TASK
        if any(kw in low for kw in ("summarize file", "summary of file", "analyze file", "analyze document", "what does this say", "what does it say", "compare files", "compare documents", "compare these")):
            return False
        if any(w in low for w in ("notepad", "word", "docx")) and any(w in low for w in ("write", "type", "draft", "compose", "paste", "note", "generate", "create", "save")):
            return True
        if re.search(r'^\s*(?:please\s+)?(?:write|draft|type|compose|generate|create)\s+.*(?:in|into|to|on|as)\s+(?:a\s+)?(?:notepad|word|document|text\s+file)\b', low):
            return True
        if re.search(r'\b(?:save\s+(?:it\s+)?as\s+(?:a\s+)?document|create\s+(?:a\s+)?document|save\s+(?:to\s+)?document)\b', low):
            return True
        if re.search(r'\b(?:generate|write|draft|compose|create|explain)\s+.*?\b(?:paragraphs?|words?|essay|report|chapter|story|article|document|paper|documentation|biography|novel|poem|screenplay|summary)\b', low):
            return True
        return False

    def _is_file_task(self, low: str, raw: str) -> bool:
        # Document / File analysis & summarize intents
        if any(kw in low for kw in (
            "summarize", "summary", "analyze file", "analyze document", "analyze this", "what does this say",
            "what does it say", "what's in", "what is in", "compare these files", "compare files",
            "compare documents", "explain file", "explain document", "document analysis", "file analysis"
        )):
            return True
        if ("summarize" in low or "analyze" in low) and any(w in low for w in ("document", "file", "text", "pdf", "docx", "upload", "attachment", "this", "it")):
            return True
        if re.search(r"\b(?:remind\s+me|set\s+(?:a\s+)?reminder|schedule)\b", low):
            return True
        if ("process" in low or "processes" in low or "tasklist" in low) and ("list" in low or "show" in low or "running" in low or "top" in low or "ram" in low):
            return True
        if re.match(r"^(?:read|view|print)\s+(?:file\s+)?([^\s]+\.[a-zA-Z0-9]+)$", low):
            return True
        if "screenshot" in low or "capture screen" in low:
            return True
        return False

    def _is_browser_task(self, low: str, raw: str) -> bool:
        if any(kw in low for kw in ("youtube", "amazon", "ebay", "bestbuy", "expedia", "walmart", "target", "github", "reddit", "tab", "tabs", "browser", "website", "web page", "scrape")):
            return True
        if re.search(r"(?:reddit\.com/r/|/r/|r/)([A-Za-z0-9_]+)", low):
            return True
        if re.search(r"^\s*(?:please\s+)?(?:search|google|look\s+up|find)\s+", low) and not ("file" in low or "process" in low):
            return True
        if "http://" in low or "https://" in low or "www." in low:
            return True
        return False

    def execute_application_command(self, query: str, intent_data: dict = None) -> str:
        """
        Executes an application command directly on the agent instance.
        RETURNS result string without invoking LLM inference.
        """
        if not self.agent:
            try:
                from core.agent import LuminAgent
                self.agent = LuminAgent()
            except Exception as e:
                return f"Error: Agent instance not bound to IntentRouter ({e})."


        cleaned = self.clean_input(query)
        low = cleaned.lower()

        # 1. Capabilities report
        if low in ("capabilities", "show capabilities", "capability status", "capability report", "capabilities report", "list capabilities", "check capabilities") or re.search(r'^\s*(?:show|check|get|list|display)\s+(?:the\s+)?capabilities\s*$', low):
            if hasattr(self.agent, "capabilities") and self.agent.capabilities:
                self.agent.capabilities.refresh()
                return self.agent.capabilities.get_summary_report()
            return "CapabilityRegistry is not initialized on LuminAgent."

        # 2. Status reporting
        if low in ("status", "show status", "agent status", "system status", "diagnostics"):
            return self.agent._handle_meta_command("status")

        # 3. Model Management Commands
        if low in ("models", "list models", "show models", "available models", "get models", "list all models"):
            return self.agent.tool_registry.execute_tool("list_models")

        if low in ("show current model", "current model", "active model", "what model", "which model", "show model", "get model", "check model", "what model are you using"):
            curr = self.agent.force_model or "Auto-Routing (Optimized)"
            local_mods = self.agent._fetch_local_models()
            avail_str = ", ".join(local_mods) if local_mods else "None detected. No Ollama models installed. Run: ollama pull llama3.2:3b"
            return f"Active locked model: {curr}\nAvailable local models: {avail_str}"

        if low in ("model auto", "unlock model", "reset model"):
            self.agent.force_model = None
            self.agent._save_config()
            return "AI routing model selection unlocked. LUMIN will automatically route queries again."

        # Model switching logic
        is_model_switch_req = (
            low in ("switch model", "change model", "switch to another model", "change to another model", "use another model", "next model", "swap model", "rotate model")
            or bool(re.search(r'\b(?:switch|change|set|toggle|rotate|swap|use)\b.*\bmodel\b', low))
            or low.startswith("model ")
        )

        if is_model_switch_req:
            local_mods = self.agent._fetch_local_models()

            # Check if specific model target name was given in command
            target_model = None
            if low.startswith("model "):
                target_model = cleaned[6:].strip()
            else:
                # 1. Direct regex match for explicit model target (e.g. "switch model to qwen2.5-coder:7b")
                explicit_match = re.search(r'\b(?:switch|change|set|lock|use)\s+(?:model\s+)?(?:to\s+)?([a-z0-9_.:\-]+)', low)
                if explicit_match:
                    candidate = explicit_match.group(1).strip()
                    if candidate not in ("another", "different", "a", "the", "model", "next", "new"):
                        target_model = candidate

                # 2. Look for target model in prompt matching local_mods
                if not target_model:
                    for m in local_mods:
                        if m.lower() in low:
                            target_model = m
                            break
                # 3. Check common alias keywords like qwen, llama, phi
                if not target_model:
                    aliases = {"qwen": "qwen2.5-coder:7b", "llama": "llama3.2:3b", "phi": "phi4-mini", "minicpm": "minicpm-v:8b"}
                    for alias_kw, real_mod in aliases.items():
                        if alias_kw in low:
                            target_model = real_mod
                            break

            if target_model:
                if target_model.lower() == "auto":
                    self.agent.force_model = None
                    self.agent._save_config()
                    return "AI routing model selection unlocked. LUMIN will automatically route queries again."
                else:
                    self.agent.force_model = target_model
                    self.agent._save_config()
                    resp = f"LUMIN model target locked to: {target_model}."

                    if target_model not in local_mods:
                        resp += f"\n[Ollama Auto-Pull] Target model '{target_model}' is not currently installed locally. Initiating background download..."
                        import threading
                        threading.Thread(target=self.agent.auto_pull_model, args=(target_model, False), daemon=True).start()

                    return resp

            # No specific target model specified -> Rotate to next available local model
            if local_mods:
                curr = self.agent.force_model
                if curr in local_mods:
                    curr_idx = local_mods.index(curr)
                    next_model = local_mods[(curr_idx + 1) % len(local_mods)]
                else:
                    next_model = local_mods[0]
                self.agent.force_model = next_model
                self.agent._save_config()
                return f"LUMIN model target switched to: {next_model}."
            else:
                curr_st = self.agent.force_model or "llama3.2:3b"
                return f"Active model target is '{curr_st}'. No additional local Ollama models detected to switch to."

        # 4. TTS Engine & Mode Commands
        if re.search(r'\b(?:change|switch|set|use)\s+tts\s+engine\b', low) or re.search(r'\b(?:tts\s+engine|engine)\s+(?:to\s+)?(local_piper|piper|native|os_native|edge_tts|edge|cloud|auto|automatic)\b', low):
            target_engine = "auto"
            if "auto" in low or "automatic" in low:
                target_engine = "auto"
            elif "native" in low or "os_native" in low:
                target_engine = "os_native"
            elif "edge" in low or "cloud" in low:
                target_engine = "edge_tts"
            elif "piper" in low:
                target_engine = "local_piper"

            cfg = self.agent.tool_registry._get_config()
            cfg["tts_engine"] = target_engine
            self.agent.tool_registry._save_config(cfg)
            if hasattr(self.agent, "local_tts") and self.agent.local_tts:
                self.agent.local_tts.engine_type = target_engine
                self.agent.local_tts.config = cfg
            return f"TTS synthesis engine updated to: {target_engine}."

        if low in ("tts on", "enable tts", "turn on tts", "toggle tts") or low == "tts 1" or low == "tts true":
            self.agent.tts_enabled = True
            self.agent.tts_mode = "full"
            self.agent._save_config()
            return "TTS speech output turned ON (Full responses mode)."

        if low in ("tts off", "disable tts", "turn off tts") or low == "tts 0" or low == "tts false":
            self.agent.tts_enabled = False
            self.agent.tts_mode = "off"
            self.agent._save_config()
            return "TTS speech output turned OFF."

        if low.startswith("tts ") or low == "tts":
            return self.agent._handle_meta_command(cleaned)

        if low.startswith("voice ") or low in ("voice list", "list voices", "show voices"):
            return self.agent._handle_meta_command(cleaned)

        # 5. System Prompt & Memory commands
        if low in ("reset system prompt", "clear system prompt", "system prompt", "show system prompt", "get system prompt") or re.match(r"^set\s+system[_\-\s]+prompt", low):
            return self.agent._handle_meta_command(cleaned)

        if low in ("forget", "clear memory", "wipe memory", "reset memory"):
            return self.agent._handle_meta_command("forget")

        # 6. MCP Commands
        if "mcp" in low:
            return self.agent._handle_meta_command(cleaned)

        # Developer Mode command trigger
        if low in ("/dev", "developer mode on", "developer mode", "dev mode"):
            return "DEVELOPER MODE ACTIVE. Full reasoning architecture, complete code output, and senior-engineer standards are now enforced."


        # 7. Other meta / config commands
        res = self.agent._handle_meta_command(cleaned)
        if res is not None:
            return res

        res_direct = self.agent._execute_direct_command(cleaned)
        if res_direct is not None:
            return res_direct

        return f"Application command executed for query: '{cleaned}'"
