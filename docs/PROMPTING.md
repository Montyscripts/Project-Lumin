# LUMIN Reasoning & Prompt Architecture (v1.0)

## Quick Setup

1. Open `core/agent.py`
2. Replace the existing `SYSTEM_PROMPT = """..."""` block with the Ultimate Master System Prompt.
3. Update `agent_config.example.json` with the version shown in this specification.
4. Copy `agent_config.example.json` → `agent_config.json` on first run (if not already present).

## What This Gives You

- **Six-stage internal reasoning pipeline** (Perception → Intent → Mental Model → Analysis → Design → Verification)
- **Persistent project working memory** across conversation turns
- **Strict anti-truncation rules** for complete, production-ready code generation
- **Senior staff engineer cognitive standards** for technical depth and root-cause resolution
- **Automatic context re-injection** on natural follow-ups (“upgrade the script”, “fix the bugs”, “make the whole thing better”)
- **Silent quality gate** before every significant technical response

This configuration ensures LUMIN serves as a daily professional software engineering partner for real codebases with zero omissions or placeholder stubs.

## Developer Mode Command Trigger

When the user types any of the following triggers:
- `/dev`
- `developer mode on`
- `developer mode`
- `dev mode`

LUMIN activates Developer Mode and responds:
> *"Developer Mode active. Full reasoning architecture, complete code output, and senior-engineer standards are now enforced."*
