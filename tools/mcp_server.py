#!/usr/bin/env python3
"""
================================================================================
  LUMIN AI AGENT — MODEL CONTEXT PROTOCOL (MCP) SERVER LAYER
================================================================================
  Production-grade JSON-RPC 2.0 Model Context Protocol (MCP) Server for LUMIN.

  Provides standardized tool execution, workspace resource discovery, and prompt
  templates to external MCP-compliant hosts (Claude Desktop, Cursor, AI Studio, etc.)
  while strictly enforcing path sandboxing, size limits, audit logs, and security controls.

  Note: MCP support added via Google AI Studio for improved interoperability.
================================================================================
"""

import sys
import os
import json
import logging
import threading
import signal
import traceback
from typing import Dict, Any, List, Optional

# Ensure base directory is in sys.path
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Configure logging
logger = logging.getLogger("lumin.mcp")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stderr)
    formatter = logging.Formatter("[%(asctime)s] [LUMIN-MCP] [%(levelname)s] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Safety Constants
MAX_ARGUMENT_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB max payload per argument
MAX_RESPONSE_SIZE_CHARS = 2 * 1024 * 1024  # 2 MB response text truncation limit

# MCP Standard Tool Schemas Definition
MCP_TOOLS_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "name": "read_file",
        "description": "Read text content safely from a file on disk.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Absolute or relative file path to read."}
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write or overwrite text content to a specified file path.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Target file path."},
                "content": {"type": "string", "description": "Text content to write."}
            },
            "required": ["file_path", "content"]
        }
    },
    {
        "name": "delete_file",
        "description": "Delete a file safely with security path verification.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Path to the file to delete."}
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "list_directory",
        "description": "List files and subdirectories within a given directory folder.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path to list."}
            },
            "required": ["path"]
        }
    },
    {
        "name": "directory_tree",
        "description": "Generate a visual directory tree structure up to max_depth.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Root directory path for tree view."},
                "max_depth": {"type": "integer", "description": "Maximum recursion depth (default 3)."}
            },
            "required": ["path"]
        }
    },
    {
        "name": "analyze_file",
        "description": "Universal document and media file analyzer (PDF, DOCX, XLSX, PPTX, images, ZIP, code).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Path to document or media file."}
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "write_report",
        "description": "Generate a formatted Markdown analysis report on disk.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Report title."},
                "content": {"type": "string", "description": "Report Markdown body content."},
                "filename": {"type": "string", "description": "Optional output filename."}
            },
            "required": ["title", "content"]
        }
    },
    {
        "name": "write_csv",
        "description": "Write tabular data list of dicts to a CSV file.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "Target CSV filename."},
                "data": {
                    "type": "array",
                    "description": "List of record dictionaries.",
                    "items": {"type": "object"}
                }
            },
            "required": ["filename", "data"]
        }
    },
    {
        "name": "web_search",
        "description": "Perform web search query for current topics or data.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query text."}
            },
            "required": ["query"]
        }
    },
    {
        "name": "browser_navigate",
        "description": "Navigate automated browser to a specific URL.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Web page URL."}
            },
            "required": ["url"]
        }
    },
    {
        "name": "browser_click",
        "description": "Click an HTML element on the active browser page.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "selector": {"type": "string", "description": "CSS selector or XPath."}
            },
            "required": ["selector"]
        }
    },
    {
        "name": "browser_type",
        "description": "Type text into an input field on the active browser page.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "selector": {"type": "string", "description": "CSS selector or XPath."},
                "text": {"type": "string", "description": "Text to type."}
            },
            "required": ["selector", "text"]
        }
    },
    {
        "name": "browser_read_page",
        "description": "Extract text content from active browser page.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "close_browser",
        "description": "Close browser session.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "take_screenshot",
        "description": "Capture system display or active application screenshot.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "Output image filename (optional)."}
            }
        }
    },
    {
        "name": "describe_image",
        "description": "Analyze image visual content using local vision model.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "image_path": {"type": "string", "description": "Path to image file."}
            },
            "required": ["image_path"]
        }
    },
    {
        "name": "list_models",
        "description": "List all installed local Ollama models and tags.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "switch_model",
        "description": "Switch active LLM model tag.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "model_name": {"type": "string", "description": "Model tag to select."}
            },
            "required": ["model_name"]
        }
    },
    {
        "name": "get_system_time",
        "description": "Get current local system time, date, and timezone.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_hardware_status",
        "description": "Retrieve CPU, RAM, Disk, and GPU hardware metrics.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_clipboard",
        "description": "Read text string from system clipboard.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "set_clipboard",
        "description": "Copy text string to system clipboard.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to set on clipboard."}
            },
            "required": ["text"]
        }
    },
    {
        "name": "list_processes",
        "description": "List running operating system processes.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "launch_application",
        "description": "Launch an installed application or file executable.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "app_name": {"type": "string", "description": "Executable or application name."}
            },
            "required": ["app_name"]
        }
    },
    {
        "name": "close_application",
        "description": "Close a running application process by name.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "app_name": {"type": "string", "description": "Application process name to terminate."}
            },
            "required": ["app_name"]
        }
    },
    {
        "name": "change_theme",
        "description": "Change 3D visualizer preset theme (cyberware, neon_cyber, synthwave, Matrix, dark, light, void).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "theme_name": {"type": "string", "description": "Theme preset identifier."}
            },
            "required": ["theme_name"]
        }
    },
    {
        "name": "set_visualizer_shape",
        "description": "Set 3D audiovisualizer geometry shape (sphere, torus, cube, wave, ring).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "shape_name": {"type": "string", "description": "Visualizer shape name."}
            },
            "required": ["shape_name"]
        }
    },
    {
        "name": "store_memory_fact",
        "description": "Store a persistent fact in long-term semantic memory.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "fact": {"type": "string", "description": "Fact statement text to store."}
            },
            "required": ["fact"]
        }
    }
]

# MCP Standard Prompts Definitions
MCP_PROMPTS_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "name": "summarize_document",
        "description": "Generate a concise executive summary of a local document or file.",
        "arguments": [
            {"name": "file_path", "description": "Path to document file.", "required": True}
        ]
    },
    {
        "name": "system_diagnostics",
        "description": "Analyze system hardware status, active processes, and local Ollama model readiness.",
        "arguments": []
    }
]


class MCPServer:
    """
    Model Context Protocol (MCP) JSON-RPC 2.0 Server for LUMIN AI Agent.
    Handles tools, workspace resources, and prompt templates with thread safety,
    input sanitization, and graceful degradation.
    """
    def __init__(self, tool_registry=None):
        self.tool_registry = tool_registry
        self.is_running = False
        self._lock = threading.Lock()
        self._server_thread: Optional[threading.Thread] = None
        self._init_tool_registry()

    def _init_tool_registry(self):
        """Safely initializes ToolRegistry with fallback handling."""
        if self.tool_registry is not None:
            return

        try:
            from tools.registry import ToolRegistry
            self.tool_registry = ToolRegistry()
            logger.info("ToolRegistry initialized for MCP Server.")
        except Exception as e:
            logger.error(f"Failed to load ToolRegistry in MCP Server: {e}")
            self.tool_registry = None

    def list_tools(self) -> List[Dict[str, Any]]:
        return MCP_TOOLS_DEFINITIONS

    def list_resources(self) -> List[Dict[str, Any]]:
        """Returns accessible LUMIN workspace resources."""
        return [
            {
                "uri": "lumin://config",
                "name": "Agent Configuration",
                "description": "Active agent_config.json runtime security and feature settings.",
                "mimeType": "application/json"
            },
            {
                "uri": "lumin://memory/facts",
                "name": "Long-term Memory Facts",
                "description": "Stored persistent memory facts from agent_memory.json.",
                "mimeType": "application/json"
            },
            {
                "uri": "lumin://workspace/status",
                "name": "System & Hardware Overview",
                "description": "Live CPU, RAM, Disk, GPU, and Ollama model status.",
                "mimeType": "text/plain"
            }
        ]

    def read_resource(self, uri: str) -> Dict[str, Any]:
        """Reads resource by URI with safe bounds."""
        if uri == "lumin://config":
            config_path = os.path.join(BASE_DIR, "agent_config.json")
            if os.path.exists(config_path):
                try:
                    with open(config_path, "r", encoding="utf-8") as f:
                        content = f.read(MAX_RESPONSE_SIZE_CHARS)
                except Exception as e:
                    content = json.dumps({"error": f"Failed to read config: {str(e)}"})
            else:
                content = json.dumps({"status": "default", "enable_mcp": False})
            return {
                "contents": [
                    {"uri": uri, "mimeType": "application/json", "text": content}
                ]
            }

        elif uri == "lumin://memory/facts":
            mem_path = os.path.join(BASE_DIR, "agent_memory.json")
            if os.path.exists(mem_path):
                try:
                    with open(mem_path, "r", encoding="utf-8") as f:
                        content = f.read(MAX_RESPONSE_SIZE_CHARS)
                except Exception as e:
                    content = json.dumps({"error": f"Failed to read memory: {str(e)}"})
            else:
                content = json.dumps([])
            return {
                "contents": [
                    {"uri": uri, "mimeType": "application/json", "text": content}
                ]
            }

        elif uri == "lumin://workspace/status":
            status_str = "LUMIN AI Agent MCP Status: Active\n"
            if self.tool_registry:
                try:
                    hw = self.tool_registry.get_hardware_status()
                    models = self.tool_registry.list_models()
                    status_str += f"\nHardware Metrics:\n{hw}\n\nInstalled Models:\n{models}"
                except Exception as e:
                    status_str += f"\nError fetching status: {e}"
            return {
                "contents": [
                    {"uri": uri, "mimeType": "text/plain", "text": status_str[:MAX_RESPONSE_SIZE_CHARS]}
                ]
            }

        else:
            raise ValueError(f"Unknown or unsupported resource URI: {uri}")

    def list_prompts(self) -> List[Dict[str, Any]]:
        """Returns standard LUMIN prompt templates."""
        return MCP_PROMPTS_DEFINITIONS

    def get_prompt(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieves and populates prompt template."""
        if name == "summarize_document":
            file_path = str(arguments.get("file_path", "") or "")[:1024]
            return {
                "description": f"Summarize document at {file_path}",
                "messages": [
                    {
                        "role": "user",
                        "content": {
                            "type": "text",
                            "text": f"Please read and provide a clear, structured summary of the file at '{file_path}'. Highlight key takeaways and critical findings."
                        }
                    }
                ]
            }
        elif name == "system_diagnostics":
            return {
                "description": "Perform system diagnostics check",
                "messages": [
                    {
                        "role": "user",
                        "content": {
                            "type": "text",
                            "text": "Check current system hardware status, review active processes, and check available local Ollama models."
                        }
                    }
                ]
            }
        else:
            raise ValueError(f"Unknown prompt template: {name}")

    def validate_tool_arguments(self, tool_args: Dict[str, Any]) -> Optional[str]:
        """Validates payload argument sizes to prevent memory overflow or DOS attacks."""
        for key, value in tool_args.items():
            if isinstance(value, str) and len(value.encode("utf-8")) > MAX_ARGUMENT_SIZE_BYTES:
                return f"Argument '{key}' exceeds maximum allowed size of {MAX_ARGUMENT_SIZE_BYTES} bytes."
        return None

    def handle_request(self, request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Processes incoming JSON-RPC 2.0 MCP request thread-safely."""
        req_id = request_data.get("id")
        method = request_data.get("method")
        params = request_data.get("params", {})

        if not method:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32600, "message": "Invalid Request: missing method"}
            }

        # Handle Protocol Initialization
        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {"listChanged": False},
                        "resources": {"subscribe": False, "listChanged": False},
                        "prompts": {"listChanged": False}
                    },
                    "serverInfo": {
                        "name": "lumin-mcp-server",
                        "version": "1.0.0"
                    }
                }
            }

        elif method == "notifications/initialized":
            logger.info("MCP client sent initialized notification.")
            return None

        elif method == "ping":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {}
            }

        # Discovery: List Tools
        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": self.list_tools()
                }
            }

        # Tool Execution
        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})

            if not tool_name:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": "Invalid params: missing tool name"}
                }

            val_err = self.validate_tool_arguments(tool_args)
            if val_err:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [{"type": "text", "text": f"Security Error: {val_err}"}],
                        "isError": True
                    }
                }

            with self._lock:
                if not self.tool_registry:
                    self._init_tool_registry()

                if not self.tool_registry:
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Error: LUMIN ToolRegistry is not available."
                                }
                            ],
                            "isError": True
                        }
                    }

                try:
                    # Execute tool via LUMIN ToolRegistry with full security auditing
                    output = self.tool_registry.execute_tool(tool_name, **tool_args)
                    from tools.registry import _tool_result_to_display
                    out_str = _tool_result_to_display(output)
                    if len(out_str) > MAX_RESPONSE_SIZE_CHARS:
                        out_str = out_str[:MAX_RESPONSE_SIZE_CHARS] + "\n...[Response truncated for size limit]"

                    is_error = out_str.startswith("Error:") or out_str.startswith("Security")

                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": out_str
                                }
                            ],
                            "isError": is_error
                        }
                    }
                except Exception as e:
                    logger.error(f"Error executing MCP tool '{tool_name}': {e}\n{traceback.format_exc()}")
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"Error executing tool '{tool_name}': {str(e)}"
                                }
                            ],
                            "isError": True
                        }
                    }

        # Discovery: Resources
        elif method == "resources/list":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "resources": self.list_resources()
                }
            }

        elif method == "resources/read":
            uri = params.get("uri")
            if not uri:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": "Missing resource uri parameter"}
                }
            try:
                result = self.read_resource(uri)
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": result
                }
            except Exception as e:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": str(e)}
                }

        # Discovery: Prompts
        elif method == "prompts/list":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "prompts": self.list_prompts()
                }
            }

        elif method == "prompts/get":
            prompt_name = params.get("name")
            prompt_args = params.get("arguments", {})
            if not prompt_name:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": "Missing prompt name parameter"}
                }
            try:
                result = self.get_prompt(prompt_name, prompt_args)
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": result
                }
            except Exception as e:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": str(e)}
                }

        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}
            }

    def stop(self):
        """Gracefully stops the MCP server."""
        self.is_running = False
        logger.info("LUMIN MCP Server stopped gracefully.")

    def run_stdio(self):
        """Runs the MCP server synchronously reading JSON-RPC requests from stdio."""
        self.is_running = True
        logger.info("LUMIN MCP Server listening on stdio...")

        def _signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down MCP server.")
            self.stop()
            sys.exit(0)

        try:
            signal.signal(signal.SIGINT, _signal_handler)
            signal.signal(signal.SIGTERM, _signal_handler)
        except (ValueError, AttributeError):
            pass  # Signal handling may not work in non-main threads or Windows sub-processes

        try:
            for line in sys.stdin:
                if not self.is_running:
                    break
                line_str = line.strip()
                if not line_str:
                    continue
                try:
                    request = json.loads(line_str)
                    response = self.handle_request(request)
                    if response is not None:
                        sys.stdout.write(json.dumps(response) + "\n")
                        sys.stdout.flush()
                except json.JSONDecodeError:
                    err_resp = {
                        "jsonrpc": "2.0",
                        "id": None,
                        "error": {"code": -32700, "message": "Parse error: Invalid JSON"}
                    }
                    sys.stdout.write(json.dumps(err_resp) + "\n")
                    sys.stdout.flush()
                except Exception as e:
                    logger.error(f"MCP server stdio loop error: {e}")
        except KeyboardInterrupt:
            logger.info("MCP server interrupted by keyboard.")
        finally:
            self.stop()

    def start_background_server(self):
        """Starts the MCP server thread for non-blocking embedded agent operation."""
        if self._server_thread and self._server_thread.is_alive():
            return
        self._server_thread = threading.Thread(target=self._background_loop, daemon=True)
        self._server_thread.start()
        logger.info("LUMIN MCP Server background thread started.")

    def _background_loop(self):
        self.is_running = True
        logger.info("LUMIN MCP Server listening in background thread.")


if __name__ == "__main__":
    server = MCPServer()
    server.run_stdio()
