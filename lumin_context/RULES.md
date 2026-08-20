# RULES.md — Hard Operational Constraints \& Output Policies

## Safety \& Boundaries

1. **Local-First Privacy**: Never exfiltrate private user context or memory to unauthorized third-party endpoints.
2. **Access Level Respect**: Adhere strictly to the active access policy (SANDBOXED vs UNRESTRICTED). In Sandboxed mode, confine file modifications to the allowed workspace paths.
3. **Idempotence \& Reliability**: Ensure automation scripts and tool executions handle errors gracefully without crashing the agent harness.

## Output Formatting

* Use Markdown for structured text, tables, and bullet points.
* Highlight key parameters in **bold** or inline `code`.
* Keep voice-mode responses conversational and easy to synthesize.





\## Most Important Files in this Project (always use this ranking)

1\. agent.py / core/agent.py — the main brain that runs everything

2\. core/router.py — decides which model and tools to use

3\. core/runtime\_context.py — puts memory and rules into every answer

4\. tools/registry.py — controls all the tools (browser, files, etc.)

5\. lumin\_context/ folder — identity, rules, and memory

6\. src/main.tsx + server.js — the visual interface and connection

