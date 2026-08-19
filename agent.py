#!/usr/bin/env python3
"""
================================================================================
  LOCAL AI ROUTER AGENT v9.0  —  MODULAR SYSTEM ENTRY POINT
================================================================================
"""
import sys
import os
import traceback

# Enforce Python Version Policy: Support 3.11, 3.12, 3.13 only
if sys.version_info < (3, 11) or sys.version_info >= (3, 14):
    print("=" * 76)
    print(f" [FATAL ERROR] Unsupported Python version: {sys.version.split()[0]}")
    print(" LUMIN AI Agent officially supports Python 3.11, 3.12, and 3.13 only.")
    print(" Python 3.14+ breaks C-extensions and causes NumPy longdouble OverflowErrors.")
    print(" Python < 3.11 lacks required typing and modern async language features.")
    print(" RECOVERY ACTION: Install Python 3.12 or 3.13 from https://python.org and re-run.")
    print("=" * 76)
    sys.exit(1)

# Append current directory to system path to ensure nested imports resolve correctly
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from rich.console import Console
    console = Console()
except ImportError:
    class DummyConsole:
        def print(self, *args, **kwargs):
            text = " ".join(str(a) for a in args)
            import re
            clean = re.sub(r'\[/?[a-zA-Z0-9_\s#=]+\]', '', text)
            print(clean)
    console = DummyConsole()

try:
    from core.agent import LuminAgent
except ImportError as e:
    print(f"\n[Bootstrap Error] Failed to import core modules: {e}")
    print("Please ensure core/, memory/, tools/, llm/, audio/, and utils/ directories exist.")
    sys.exit(1)

def main():
    try:
        agent = LuminAgent()
        
        if hasattr(agent, "capabilities") and agent.capabilities:
            report = agent.capabilities.get_actionable_recovery_report()
            if "RECOVERY ACTION" in report and sys.stdin.isatty():
                console.print(f"[yellow]{report}[/yellow]")

        agent.input_mode = "type"
        if sys.stdin.isatty():
            console.print("[yellow]Project LUMIN is ready in local-first mode. Type your message below, or use 'input_mode speak' to use voice.[/]")
        
        agent.run_stdin_loop()
    except Exception as e:
        print(f"\n[Fatal System Error] Agent crashed on start: {e}")
        print("\n" + "=" * 76)
        print(" Python Traceback:")
        traceback.print_exc()
        print("=" * 76)
        print(" LUMIN RECOVERY CHECKLIST:")
        print(" 1. Python Version: Run with Python 3.11, 3.12, or 3.13 (Python 3.14 is unsupported).")
        print(" 2. Virtual Env: Ensure running inside the project venv (venv\\Scripts\\python.exe).")
        print(" 3. Dependencies: Run 'pip install -r requirements.txt' inside the venv.")
        print(" 4. Audio/NumPy: Verify numpy>=1.26.0,<2.3.0 and edge-tts>=7.2.0 are installed.")
        print(" 5. Ollama: Verify Ollama service is running (ollama serve) with model llama3.2:3b.")
        print("=" * 76)
        sys.exit(1)

if __name__ == "__main__":
    main()
