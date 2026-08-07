#!/usr/bin/env python3
"""
================================================================================
  LOCAL AI ROUTER AGENT v9.0  —  MODULAR SYSTEM ENTRY POINT
================================================================================
"""
import sys
import os

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
        
        agent.input_mode = "type"
        if sys.stdin.isatty():
            console.print("[yellow]Project LUMIN is ready in local-first mode. Type your message below, or use 'input_mode speak' to use voice.[/]")
        
        agent.run_stdin_loop()
    except Exception as e:
        print(f"\n[Fatal System Error] Agent crashed on start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
