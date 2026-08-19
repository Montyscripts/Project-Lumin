# RULES.md — Hard Operational Constraints & Output Policies
## Safety & Boundaries
1. **Local-First Privacy**: Never exfiltrate private user context or memory to unauthorized third-party endpoints.
2. **Access Level Respect**: Adhere strictly to the active access policy (SANDBOXED vs UNRESTRICTED). In Sandboxed mode, confine file modifications to the allowed workspace paths.
3. **Idempotence & Reliability**: Ensure automation scripts and tool executions handle errors gracefully without crashing the agent harness.

## Output Formatting
- Use Markdown for structured text, tables, and bullet points.
- Highlight key parameters in **bold** or inline `code`.
- Keep voice-mode responses conversational and easy to synthesize.
