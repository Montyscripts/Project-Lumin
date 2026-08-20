"""
LUMIN AI Agent - Intent Router & Command Execution Layer
Classifies user requests prior to LLM inference and intercepts application commands.
Ensures application-level control commands NEVER reach the LLM.
"""

from enum import Enum
import re
import os
import sys
import json
import urllib.request
import logging
from tools.registry import _tool_result_to_display

logger = logging.getLogger("LUMIN")


class ModalityType(str, Enum):
    TEXT = "text"
    CODE = "code"
    DOCUMENT = "document"
    IMAGE_VISION = "image_vision"
    SYSTEM = "system"


class TaskComplexity(str, Enum):
    TRIVIAL = "trivial"
    STANDARD = "standard"
    COMPLEX = "complex"


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
        self.ollama_host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

    def get_loaded_models(self) -> list[str]:
        """Queries Ollama /api/ps to inspect active in-memory models (skips gracefully on error)."""
        try:
            req = urllib.request.Request(
                f"{self.ollama_host}/api/ps",
                headers={"User-Agent": "LUMIN-Router"}
            )
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    return [m.get("name") for m in data.get("models", []) if m.get("name")]
        except Exception:
            pass
        return []

    def classify_signals(self, query: str, has_image: bool = False, has_doc: bool = False) -> dict:
        """
        Lightweight multi-signal classifier determining modality, complexity,
        and residency preference for model routing.
        """
        clean = query.strip()
        low = clean.lower()

        # Coding signals (highest priority over generic text/writing)
        coding_indicators = (
            "def ", "class ", "import ", "from ", "function", "const ", "let ", "var ",
            "async ", "refactor", "bug", "traceback", "```", "pytest", "unit-test", "unittest",
            "write a python", "python function", "python script", "write code", "coding",
            "javascript", "typescript", "golang", "rust", "c++", "algorithm", "regex", "lambda "
        )

        # Modality detection
        if self._is_application_command(low, clean):
            modality = ModalityType.SYSTEM
        elif any(k in low for k in coding_indicators):
            modality = ModalityType.CODE
        elif has_image or any(k in low for k in ("screenshot", "image", "photo", "picture", "chart", "diagram")):
            modality = ModalityType.IMAGE_VISION
        elif has_doc or any(k in low for k in ("pdf", "document", "docx", "csv", "spreadsheet", "uploaded file", "archive", "zip", "rar", "7z", "documents", "files inside", "what's inside", "what is inside", "inside this", "what do the text documents say")):
            modality = ModalityType.DOCUMENT
        else:
            modality = ModalityType.TEXT

        # Complexity detection
        words = clean.split()
        is_long = len(words) > 50
        has_multi_step = any(m in low for m in ("step 1", "first,", "then,", "compare and contrast", "detailed breakdown"))
        if (modality == ModalityType.CODE and (len(clean) > 200 or "refactor" in low)) or has_multi_step or (is_long and modality == ModalityType.DOCUMENT):
            complexity = TaskComplexity.COMPLEX
        elif len(words) <= 7 and modality == ModalityType.TEXT and not any(k in low for k in ("why", "explain", "how")):
            complexity = TaskComplexity.TRIVIAL
        else:
            complexity = TaskComplexity.STANDARD

        loaded_models = self.get_loaded_models()
        return {
            "modality": modality,
            "complexity": complexity,
            "loaded_models": loaded_models,
            "prefer_resident": len(loaded_models) > 0
        }

    def select_model_with_signals(
        self,
        signals: dict,
        installed_models: list[str],
        default_model: str = "llama3.2:3b"
    ) -> str:
        """
        Consumes modality, complexity, and loaded residency signals to select the best Ollama model.
        """
        if not installed_models:
            return default_model

        modality = signals.get("modality", ModalityType.TEXT)
        complexity = signals.get("complexity", TaskComplexity.STANDARD)
        loaded_models = signals.get("loaded_models", [])

        # Tier candidates by modality & complexity
        if modality == ModalityType.IMAGE_VISION:
            # Prefer MiniCPM-V first, then Gemma 4, then other vision fallbacks
            gemma4_installed = [m for m in installed_models if "gemma4" in m.lower()]
            candidates = [
                "minicpm-v:8b", "minicpm-v",
                "gemma4:e4b", "gemma4:12b", "gemma4"
            ] + gemma4_installed + [
                "qwen2.5vl:7b", "llava:7b", "qwen2.5vl", "llava"
            ]
        elif modality == ModalityType.CODE and complexity in (TaskComplexity.STANDARD, TaskComplexity.COMPLEX):
            candidates = ["qwen2.5-coder:7b", "codegemma:7b", "qwen2.5-coder", "qwen2.5:7b", "mistral:7b"]
        elif modality == ModalityType.DOCUMENT:
            candidates = ["phi4-mini", "qwen2.5:7b", "llama3.2:3b", "mistral:7b"]
        elif complexity == TaskComplexity.TRIVIAL:
            candidates = ["llama3.2:3b", "phi4-mini", "gemma3:4b", "qwen2.5:7b"]
        else:
            candidates = ["qwen2.5:7b", "phi4-mini", "llama3.2:3b", "mistral:7b"]

        # 1. Prefer candidate already resident in VRAM
        if signals.get("prefer_resident", False) and loaded_models:
            for cand in candidates:
                for loaded in loaded_models:
                    if cand in loaded and any(cand in inst for inst in installed_models):
                        for inst in installed_models:
                            if cand in inst:
                                return inst

        # 2. Match candidate against installed local models
        for cand in candidates:
            for inst in installed_models:
                if cand in inst or inst.startswith(cand):
                    return inst

        # 3. If a resident model is already loaded and no candidate matched, prefer resident
        if signals.get("prefer_resident", False) and loaded_models:
            for loaded in loaded_models:
                if loaded in installed_models:
                    return loaded

        # 4. Fallback to default baseline
        if default_model in installed_models:
            return default_model
        return installed_models[0]

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
        Detects when the user pastes large amounts of code, long raw documents, or structured data
        directly into the chat input field instead of uploading a file.
        Differentiates pasted technical assets from conversational user prompts.
        """
        if not query:
            return False
        clean = query.strip()
        if len(clean) < 350:
            return False

        # Exclude conversational prompt prefixes unless code block markers exist
        conv_prefixes = (
            "write ", "explain ", "describe ", "summarize ", "what is", "how do", "can you", "please "
        )
        is_conv_prompt = any(clean.lower().startswith(p) for p in conv_prefixes)

        # 1. Markdown code blocks (e.g. ```python ... ```)
        if "```" in clean:
            return True

        # 2. Code indicators (functions, imports, classes, types)
        code_indicators = (
            "def ", "class ", "import ", "from ", "function ", "const ", "let ", "var ",
            "return ", "public ", "private ", "void ", "async ", "select ", "where ",
            "<div", "<html", "<script", "package ", "#include", "using ", "namespace ",
            "interface ", "type ", "export ", "defun ", "struct ", "impl "
        )
        code_matches = sum(1 for marker in code_indicators if marker in clean)
        if code_matches >= 2:
            return True
        if code_matches >= 1 and not is_conv_prompt:
            return True

        # 3. High symbol density characteristic of source code / JSON / XML
        symbols = set("{}[]();=<>+*&|#")
        symbol_count = sum(1 for c in clean if c in symbols)
        if symbol_count > 20:
            return True

        # 4. Long raw document paste (>1500 chars or >25 lines without conversational question intent)
        lines = clean.splitlines()
        if len(lines) > 25 or len(clean) > 1500:
            if not is_conv_prompt:
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
            signals = self.classify_signals(query)
            return (IntentType.NORMAL_CONVERSATION, {"raw_query": query, "signals": signals})

        signals = self.classify_signals(cleaned)
        base_meta = {"raw_query": cleaned, "signals": signals}

        # 0. Check for Large Pasted Code or Document Input FIRST
        if self.is_large_pasted_input(cleaned):
            base_meta["is_pasted_code_text"] = True
            return (IntentType.FILE_TASK, base_meta)

        # 1. Check for APPLICATION_COMMAND
        if self._is_application_command(low, cleaned):
            return (IntentType.APPLICATION_COMMAND, base_meta)

        # 2. Check for VOICE_TTS_TASK
        if self._is_voice_tts_task(low, cleaned):
            return (IntentType.VOICE_TTS_TASK, base_meta)

        # 3. Check for FILE_TASK
        if self._is_file_task(low, cleaned):
            return (IntentType.FILE_TASK, base_meta)

        # 4. Check for WRITING_TASK
        if self._is_writing_task(low, cleaned):
            return (IntentType.WRITING_TASK, base_meta)

        # 5. Check for BROWSER_TASK
        if self._is_browser_task(low, cleaned):
            return (IntentType.BROWSER_TASK, base_meta)

        # Default fallback to NORMAL_CONVERSATION
        return (IntentType.NORMAL_CONVERSATION, base_meta)

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

    def _is_workspace_listing_query(self, low: str, raw: str = "") -> bool:
        """Determines if query is asking to list workspace files or inspect local modules."""
        if not low:
            return False
        clean_low = low.strip().lower()

        # EXCLUDE any question that asks for importance ranking or reasons
        if any(phrase in clean_low for phrase in (
            "important", "most important", "key files", "main files",
            "critical", "central", "rank", "ranking", "why", "reason",
            "with a short reason", "short bullets only"
        )):
            return False

        # Exclude explicit uploaded document analysis
        if any(phrase in clean_low for phrase in (
            "summarize this document", "summarize the document", "summarize this file", "summarize the file",
            "analyze this file", "analyze the file", "analyze this document", "analyze the document",
            "uploaded document", "uploaded file", "this document", "these files", "these documents",
            "archive", "this archive", "the archive", "uploaded archive", "inside this", "inside the archive",
            "what's inside", "what is inside", "what files are inside", "what files are in this",
            "what do the text documents say", "what do the files say", "what do the documents say",
            "documents say", "files say", "what do the", "what are the files", "contents of", "list the contents"
        )):
            return False

        workspace_phrases = (
            "list the files", "list files", "list directory", "list workspace",
            "list project files", "list the project files",
            "show project files", "show the project files",
            "project files", "project file list", "project file listing",
            "files in this project", "files in the project",
            "what files are in this project", "what files are in the project",
            "which files are in this project", "which files are in the project",
            "show workspace", "what files are here", "what files exist",
            "show files in workspace", "list current directory", "show directory",
            "directory contents", "workspace contents", "files in current workspace",
            "files in the current workspace", "files in workspace", "workspace files",
            "list all files", "show all files", "what files are in"
        )
        if any(phrase in clean_low for phrase in workspace_phrases):
            return True

        if re.search(r'\b(?:list|show|display|get)\s+(?:all\s+)?(?:the\s+)?files\b', clean_low):
            return True
        if re.search(r'\b(?:list|show|display|get)\s+(?:the\s+)?(?:workspace|directory|folder)\b', clean_low):
            return True
        if re.search(r'\bwhat\s+files\b', clean_low) and any(w in clean_low for w in ("here", "workspace", "directory", "folder", "current", "exist")):
            return True

        return False

    def _is_application_command(self, low: str, raw: str) -> bool:
        """Determines if prompt is an administrative/application control command."""
        # Help & System commands
        if low in ("help", "?", "exit", "quit", "status", "show status", "agent status", "system status", "diagnostics"):
            return True

        # Workspace File Listing & Module Inspection commands
        if self._is_workspace_listing_query(low, raw):
            return True

        # Capability reporting commands
        if self._is_capabilities_query(low):
            return True

        # Hardware & System Profile / Resource Governor commands
        if self.agent and hasattr(self.agent, "_is_hardware_diagnostic_scenario_query") and self.agent._is_hardware_diagnostic_scenario_query(low):
            return True
        if any(kw in low for kw in (
            "hardware profile", "system profile", "hardware status", "system class",
            "resource governor", "resource_governor", "hardware specs", "system specs",
            "hardware diagnostics", "resource governor matrix", "hardware matrix"
        )):
            return True
        if re.search(r'\b(hardware\s+profile|system\s+profile|hardware\s+status|hardware\s+specs|system\s+specs|system\s+class|resource\s+governor)\b', low):
            return True
        if re.search(r'\b(hardware|system|ram|vram|gpu)\b', low) and any(w in low for w in ("profile", "status", "class", "specs", "governor", "summarize", "current", "running", "instance", "vram", "ram", "gpu")):
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
        if low in ("tts on", "tts off", "tts full", "tts short", "tts confirmations", "enable tts", "disable tts", "turn on tts", "turn off tts", "toggle tts", "mute speech", "stop speaking replies", "short mode", "confirmation mode", "short confirmation", "brief replies"):
            return True
        if low.startswith("tts ") or low == "tts":
            return True
        if re.search(r'\b(?:enable|disable|turn\s+on|turn\s+off|toggle|mute|stop)\s+(?:tts|speech|voice)\b', low):
            return True
        if re.search(r'\b(?:short\s+confirmation|short\s+mode|confirmation\s+mode|tts\s+short|brief\s+replies|short\s+tts|short\s+action\s+confirmations|tts\s+confirmations)\b', low):
            return True
        if re.search(r'\b(?:full\s+tts|full\s+responses|tts\s+full|full\s+spoken\s+responses|full\s+tts\s+mode|full\s+mode)\b', low):
            return True
        if re.search(r'\b(?:tts\s+off|mute\s+speech|stop\s+speaking|stop\s+speaking\s+replies|mute\s+tts|disable\s+tts|turn\s+off\s+tts|disable\s+speech|mute\s+voice)\b', low):
            return True
        if "tts" in low and any(w in low for w in ("mode", "short", "full", "off", "on", "confirmation", "confirmations", "speak", "mute")):
            return True
        if ("speak" in low or "speech" in low or "voice" in low) and any(w in low for w in ("short confirmation", "brief replies", "mute speech", "stop speaking", "full responses", "confirmation mode")):
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

        # Theme & Visualizer commands
        if any(kw in low for kw in ("change theme", "set theme", "switch theme", "toggle theme", "theme cyber", "theme matrix", "theme dark", "theme light", "visualizer shape", "set visualizer")):
            return True
        if re.search(r'\b(?:change|set|switch|toggle)\s+(?:the\s+)?(?:theme|visualizer|shape)\b', low):
            return True
        if re.search(r'\btheme\s+(?:to\s+)?(cyber|matrix|neon|dark|light|sunset|ocean|emerald|rose|monochrome)\b', low):
            return True

        # Pure desktop app launch or close commands (e.g. "open notepad", "close chrome")
        if re.search(r"^\s*(?:please\s+)?(?:launch|run|open|start|close|quit|stop|terminate|kill)\s+(chrome|firefox|edge|notepad|calculator|calc|cmd|powershell|word|excel|vscode|code|paint|spotify|explorer)\s*$", low):
            return True

        # Script and file execution commands (e.g. "Run lumin_test.py on my Desktop", "python script.py")
        if self._is_run_file_command(low, raw):
            return True

        return False

    def _is_run_file_command(self, low: str, raw: str) -> bool:
        """Determines if the query is an execution/run command for a script or program file."""
        if any(prefix in low for prefix in ("how do i run", "how to run", "how can i run", "explain how to run", "tutorial", "what is", "why")):
            return False
        if any(kw in low for kw in ("create a", "write a", "generate a", "make a")) and not any(v in low for v in ("then run", "and run", "and execute")):
            return False
        # Explicit run / execute keywords with script or file extension
        if re.search(r'\b(?:run|execute|exec|launch|start)\s+(?:the\s+)?(?:python\s+)?(?:file|script|program)?\s*[\'"]?([a-zA-Z0-9_\-\./\\]+\.(?:py|sh|bat|cmd|ps1|js|ts))\b', low):
            return True
        if re.search(r'\b(?:run|execute|exec)\s+(?:the\s+)?python\s+file\b', low):
            return True
        if re.search(r'\b(?:run|execute|exec)\s+.*?\b(?:script|program|\.py|\.sh|\.bat|\.ps1)\b', low):
            return True
        if re.match(r'^\s*(?:python|python3)\s+([a-zA-Z0-9_\-\./\\]+)', low):
            return True
        return False

    def _is_voice_tts_task(self, low: str, raw: str) -> bool:
        if self.agent and hasattr(self.agent, "_detect_voice_launch_intent") and self.agent._detect_voice_launch_intent(raw):
            return True
        if self.agent and hasattr(self.agent, "_detect_voice_shutdown_intent") and self.agent._detect_voice_shutdown_intent(raw):
            return True
        return False

    def _is_capabilities_query(self, low: str) -> bool:
        if hasattr(self.agent, "_is_capabilities_query"):
            return self.agent._is_capabilities_query(low)

        if any(prefix in low for prefix in ("how do i", "how to", "explain", "example", "tutorial", "implement", "write code")):
            return False

        low_clean = re.sub(r'\(.*?\)', '', low).strip()

        exact_phrases = (
            "capabilities", "capability", "show capabilities", "capability status",
            "capability report", "capabilities report", "list capabilities", "check capabilities",
            "current capabilities", "capability matrix", "capabilities matrix",
            "status report of current capabilities", "status report of capabilities",
            "status of current capabilities", "status of capabilities",
            "capabilities summary", "capability summary", "report of current capabilities",
            "status report on current capabilities", "status report on capabilities",
            "current capability status", "capabilities status report"
        )
        if low_clean in exact_phrases or low in exact_phrases:
            return True

        if re.search(r'\b(?:status\s+report|report|matrix|status|summary)\s+(?:of|on)?\s*(?:current\s+)?capabilit(?:ies|y)\b', low_clean):
            return True

        if re.search(r'\b(?:current\s+)?capabilit(?:ies|y)\s+(?:status|report|matrix|summary)\b', low_clean):
            return True

        if "capabilit" in low:
            if any(w in low for w in ("status", "report", "matrix", "summary", "list", "show", "check", "display", "current", "what are", "overview")):
                return True

        return False

    def _is_writing_task(self, low: str, raw: str) -> bool:
        # Local file analysis / document analysis / summarize / spreadsheet / presentation / video queries are FILE_TASK, not WRITING_TASK
        if self._is_file_task(low, raw):
            return False
        if any(kw in low for kw in ("summarize file", "summary of file", "analyze file", "analyze document", "what does this say", "what does it say", "compare files", "compare documents", "compare these", "spreadsheet", "excel", "sheet", "salaries", "salary", "employees", "presentation", "powerpoint", "slides", "slide", "pptx", "ppt", "video", "videos", "clip", "movie", "recording", "mp4", "webm", "mkv", "avi")):
            return False
        if self.agent and hasattr(self.agent, "_find_local_source_file_target") and self.agent._find_local_source_file_target(raw):
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
        # Conversation-summary requests must never be classified as FILE_TASK
        if self.agent and hasattr(self.agent, "_is_conversation_summary_request"):
            if self.agent._is_conversation_summary_request(raw) or self.agent._is_conversation_summary_request(low):
                return False
	# Never treat "important / key / main files in this project" as a document task
        if any(phrase in low for phrase in (
            "important files", "most important files", "key files", "main files",
            "critical files", "central files", "rank the", "ranking",
            "short bullets only", "with a short reason"
        )) and any(w in low for w in ("project", "codebase", "repository", "repo", "workspace")):
            return False

        # Check for local source file analysis / explanation requests
        analysis_verbs = (
            "explain", "structure", "summarize", "summary", "describe", "description",
            "what does", "what's in", "what is in", "what is", "analyze", "analysis", "overview",
            "breakdown", "details", "show", "read", "parse", "inspect", "purpose of", "purpose",
            "understanding", "how does", "tell me about", "walkthrough", "walk through",
            "outline", "contents", "list"
        )

        if self.agent and hasattr(self.agent, "_find_local_source_file_target"):
            target_file = self.agent._find_local_source_file_target(raw)
            if target_file:
                return True

        # Check if session uploads are available (e.g. spreadsheet, PDF, docx, presentation in upload pipeline)
        has_session_uploads = False
        if self.agent and hasattr(self.agent, "upload_pipeline") and self.agent.upload_pipeline:
            has_session_uploads = bool(getattr(self.agent.upload_pipeline, "metadata_store", None) or getattr(self.agent, "last_analyzed_file", None))

        if has_session_uploads:
            spreadsheet_doc_terms = (
                "spreadsheet", "excel", "sheet", "sheets", "table", "data", "rows", "columns",
                "employee", "employees", "salary", "salaries", "department", "departments",
                "document", "documents", "file", "files", "pdf", "docx", "archive",
                "presentation", "presentations", "powerpoint", "slides", "slide", "deck", "pptx", "ppt", "topic", "topics",
                "video", "videos", "clip", "movie", "recording", "keyframes", "mp4", "webm", "mkv", "avi"
            )
            if any(term in low for term in spreadsheet_doc_terms):
                return True

        if any(v in low for v in analysis_verbs):
            if any(ext in low for ext in (
                ".py", ".js", ".ts", ".tsx", ".jsx", ".md", ".json", ".csv", ".txt",
                ".html", ".css", ".sh", ".bat", ".cpp", ".c", ".h", ".java", ".go",
                ".rs", ".yaml", ".yml", ".log", ".doc", ".docx", ".pdf", ".xlsx", ".xls", ".pptx", ".ppt",
                ".mp4", ".webm", ".mkv", ".avi", ".mov", ".flv", ".wmv"
            )):
                return True
            if self.agent and hasattr(self.agent, "tool_registry") and self.agent.tool_registry:
                for w in raw.split():
                    clean_w = w.strip("'\".,()!?:;")
                    if clean_w and os.path.isfile(self.agent.tool_registry._resolve_path(clean_w)):
                        return True
            else:
                for w in raw.split():
                    clean_w = w.strip("'\".,()!?:;")
                    if clean_w and os.path.isfile(clean_w):
                        return True

        # Document / File analysis & summarize intents
        simple_doc_phrases = (
            "like a baby", "like i'm a baby", "like i am a baby", "like i'm 5", "like i'm five",
            "like a 5 year old", "eli5", "important parts simply", "read the whole thing",
            "tell me the important parts", "summarize this", "summarize pdf", "read this pdf",
            "explain this pdf", "what does this pdf say", "explain this document"
        )
        if any(sp in low for sp in simple_doc_phrases) and any(w in low for w in ("summarize", "read", "explain", "tell", "pdf", "doc", "document", "file", "thing", "baby", "5", "parts")):
            return True

        if any(kw in low for kw in (
            "summarize file", "summarize document", "analyze file", "analyze document",
            "what does this file say", "what does this document say", "what does it say in the document",
            "what's in this file", "what is in this document", "compare these files", "compare files",
            "compare documents", "explain file", "explain document", "document analysis", "file analysis",
            "what does this say", "what does it say", "summarize this document", "analyze this file", "compare these",
            "summarize this", "read this", "explain this", "read the whole thing", "tell me what this says",
            "the spreadsheet", "the excel", "in the spreadsheet", "in the sheet", "from the spreadsheet"
        )):
            return True
        if ("summarize" in low or "analyze" in low or "read" in low or "explain" in low or "list" in low) and any(w in low for w in ("document", "documents", "file", "files", "pdf", "docx", "xlsx", "xls", "spreadsheet", "sheet", "uploaded", "attachment", "attached file", "this", "it", "whole thing")):
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

        # Workspace File Listing & Module Inspection
        if self._is_workspace_listing_query(low, cleaned) or (intent_data and intent_data.get("is_workspace_listing")):
            if hasattr(self.agent, "_handle_workspace_listing_command"):
                return self.agent._handle_workspace_listing_command(cleaned)

        # 1. Capabilities report
        if self._is_capabilities_query(low):
            if hasattr(self.agent, "_handle_capabilities_command"):
                return self.agent._handle_capabilities_command()
            elif hasattr(self.agent, "capabilities") and self.agent.capabilities:
                self.agent.capabilities.refresh()
                return self.agent.capabilities.get_summary_report()
            return "CapabilityRegistry is not initialized on LuminAgent."

        # 2. Hardware Profile & Resource Governor summary
        if hasattr(self.agent, "_is_hardware_diagnostic_scenario_query") and self.agent._is_hardware_diagnostic_scenario_query(low):
            return self.agent._diagnose_hardware_scenario(query)
        if hasattr(self.agent, "_is_hardware_profile_query") and self.agent._is_hardware_profile_query(low):
            return self.agent._handle_hardware_profile_command()

        # 3. Status reporting
        if low in ("status", "show status", "agent status", "system status", "diagnostics"):
            return self.agent._handle_meta_command("status")

        # 3. Model Management Commands
        if low in ("models", "list models", "show models", "available models", "get models", "list all models"):
            return _tool_result_to_display(self.agent.tool_registry.execute_tool("list_models"))

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
                if target_model.lower().startswith("switch "):
                    target_model = target_model[7:].strip()
                elif target_model.lower().startswith("to "):
                    target_model = target_model[3:].strip()
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
                    aliases = {
                        "qwen": "qwen2.5-coder:7b",
                        "coding": "qwen2.5-coder:7b",
                        "coder": "qwen2.5-coder:7b",
                        "code": "qwen2.5-coder:7b",
                        "llama": "llama3.2:3b",
                        "phi": "phi4-mini",
                        "minicpm": "minicpm-v:8b"
                    }
                    for alias_kw, real_mod in aliases.items():
                        if alias_kw in low:
                            target_model = real_mod
                            break

            if target_model:
                if target_model.lower() in ("auto", "router", "auto-router", "smart router"):
                    self.agent.force_model = None
                    self.agent._save_config()
                    return "AI routing model selection unlocked. LUMIN will automatically route queries again."
                else:
                    if ("if available" in low or "if installed" in low or "if present" in low) and target_model not in local_mods:
                        curr_st = self.agent.force_model or "Auto-Routing (Optimized)"
                        reason = "0 local Ollama models are installed (Offline / Deterministic Tool Mode)" if not local_mods else f"installed local models are: {', '.join(local_mods)}"
                        return f"Coding model target '{target_model}' is not available because {reason}. Active router state: {curr_st}."

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