# Security Policy & Guidelines

## 🛡️ Overview

**LUMIN AI Agent** is built from the ground up as a **local-first** application. All AI model inference, document parsing, speech recognition, audio synthesis, and long-term memory storage execute locally on your machine or private infrastructure.

Security and user privacy are fundamental pillars of the LUMIN architecture.

---

## 🔒 Security Architecture & Defensive Controls

1. **Local-First Privacy Guarantee**:
   - Primary AI inference runs via local Ollama instances. Zero user prompts, audio recordings, or documents leave your local device unless you explicitly configure external MCP client endpoints.
2. **Path Sandboxing & Directory Isolation**:
   - `ToolRegistry` (`tools/registry.py`) and the MCP server (`tools/mcp_server.py`) enforce strict path resolution controls using canonical path checks (`os.path.realpath`).
   - When `unrestricted_mode: false` is configured in `agent_config.json`, file access is strictly bound to allowed workspace directories.
3. **Payload & Resource Controls**:
   - The MCP JSON-RPC server enforces a maximum input payload limit of **5 MB** per argument and truncates response payloads at **2 MB** to mitigate memory exhaustion or denial-of-service risks.
4. **Execution Safeguards**:
   - Destructive operations (such as raw shell execution or file deletion) can require explicit terminal confirmation or be toggled via `auto_approve_destructive` in configuration.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within LUMIN AI Agent, please report it responsibly rather than opening a public issue on GitHub.

### How to Report:
- **Email**: Send vulnerability details to `security@project-lumin.ai` (or use GitHub Security Advisories).
- **Required Information**:
  - Clear description of the issue and potential security impact.
  - Step-by-step reproduction guide or proof-of-concept (PoC).
  - Affected components (`core/agent.py`, `tools/mcp_server.py`, `server.js`, etc.).
  - Recommended fix or mitigation if available.

### SLA & Response Schedule:
- **Acknowledgement**: Within 48 hours of receipt.
- **Status Updates**: Every 3–5 business days until patch verification.
- **Public Disclosure**: Following patch validation and release in a v1.x update.

---

## ⚙️ Hardening Guidelines for Deployments

1. **Set `unrestricted_mode: false`** when hosting LUMIN in multi-user environments or untrusted host contexts.
2. **Environment Variables**: Store optional external API keys or credentials in `.env` files rather than hardcoding in JSON configurations.
3. **Localhost Binding & TLS**: The WebSocket and web servers default to local loopback (`127.0.0.1` / `0.0.0.0:3000`). When exposing over networks, deploy behind an authenticating reverse proxy with TLS (e.g. Nginx with Basic Auth + HTTPS).

---

Thank you for helping keep LUMIN AI Agent secure and privacy-focused!
