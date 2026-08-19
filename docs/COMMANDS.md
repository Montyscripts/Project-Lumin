# LUMIN AI Agent — Commands, Meta Controls & Shortcuts

This guide documents LUMIN's CLI meta-commands, task keywords, and special input shortcuts.

---

## 🛠️ CLI Meta-Commands

You can enter these administrative commands directly into the agent console:

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **Help** | `help` or `?` | Displays the meta-command interface menu. |
| **Status** | `status` | Shows system diagnostics, locked model status, TTS voice settings, and security modes. |
| **Forget** | `forget` | Clears short-term context buffers and wipes `agent_memory.json`. |
| **Input Mode** | `mode` or `input mode` | Toggles input source between **Type** (Keyboard) and **Speak** (Voice STT). |
| **List Models** | `models` | Displays all locally installed Ollama models. |
| **Lock Model** | `model <model_name>` | Forces LUMIN to lock routing to a specific model (e.g. `model qwen2.5-coder:7b`). |
| **Unlock Model** | `model auto` | Unlocks manual model target and restores automatic hybrid routing. |
| **TTS Toggle** | `tts on` / `tts off` | Enables or disables spoken voice response output. |
| **Voice List** | `voice list` | Lists all supported Edge-TTS neural speech voices across global locales. |
| **Set Voice** | `voice <voice_name>` | Switches current TTS speaker voice (e.g. `voice en-AU-NatashaNeural`). |
| **Dry-Run** | `dryrun on` / `dryrun off` | Simulates shell/PowerShell operations without executing changes on disk. |
| **Auto-Approve** | `auto on` / `auto off` | Skips interactive confirmation prompts for standard tasks. |
| **Unrestricted** | `unrestricted on` / `off` | Toggles sandboxed directory enforcement. |

---

## 📝 Special Input Triggers

### `fileinput` / `paste` / `longinput`
When you enter `fileinput`, `paste`, or `longinput`:
1. LUMIN opens your system's default text editor (Notepad on Windows, nano/vi/Gedit on Linux/macOS) with a temporary scratchpad.
2. Paste or type any large text, document, or codebase into the editor.
3. Save and close the editor.
4. LUMIN automatically extracts a structured 8-section breakdown (Overview, Statistics, Dependencies, Classes, Methods, Execution Flow, Settings, Best Practices) using a high-fidelity coding model (`qwen2.5-coder:7b`).

---

## ⚡ Direct Utility Commands

LUMIN intercepts common natural language requests to execute them instantly:

- **Screenshot & Describe**: `take a screenshot and describe it`
- **Web Search**: `search the web for "latest AI news"`
- **Launch Application**: `launch chrome`, `open notepad`, `run calculator`
- **YouTube Automation**: `open youtube search "gta trailer" and play video`
- **Open Folders**: `open downloads`, `explore documents`, `open pictures`
- **Reddit Parsing**: `r/Python` or `check r/technology`
- **Write File**: `write a file called notes.txt with content "hello world"`
- **Analyze File**: `read file agent.py` or simply paste a path `C:\path\to\document.pdf`
