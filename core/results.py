"""
LUMIN AI Agent - Result Types & Execution Status Formatter
Provides standardized, structured return types for agent loops, tool dispatch, and reasoning queries.
"""

from typing import Any, Dict, List, Optional


class AgentResult(dict):
    """
    Standardized, structured return type for agent reasoning loops, tool calls, and query processing.
    Schema required by specification:
    {
        "status": "success" | "partial" | "failed" | "needs_user",
        "completed": list[str],
        "failed": list[str],
        "remaining": list[str],
        "error": str | None,
        "next_action": str | None,
        "output": str | None
    }
    """
    def __init__(
        self,
        status: str,
        completed: Optional[List[str]] = None,
        failed: Optional[List[str]] = None,
        remaining: Optional[List[str]] = None,
        error: Optional[str] = None,
        next_action: Optional[str] = None,
        output: Optional[str] = None,
        **kwargs
    ):
        norm_status = str(status).lower()
        if norm_status in ("succeeded", "ok", "done", "true", "success"):
            norm_status = "success"
        elif norm_status in ("blocked", "requires_user", "needs_user"):
            norm_status = "needs_user"
        elif norm_status in ("cancelled", "failed", "error"):
            norm_status = "failed"
        elif norm_status in ("partial", "incomplete"):
            norm_status = "partial"
        else:
            norm_status = "failed"

        c_list = [str(x) for x in (completed or [])]
        f_list = [str(x) for x in (failed or [])]
        r_list = [str(x) for x in (remaining or [])]

        super().__init__(
            status=norm_status,
            completed=c_list,
            failed=f_list,
            remaining=r_list,
            error=str(error) if error is not None else None,
            next_action=str(next_action) if next_action is not None else None,
            output=str(output) if output is not None else None,
            **kwargs
        )

    @property
    def status(self) -> str: return self["status"]
    @property
    def completed(self) -> List[str]: return self["completed"]
    @property
    def failed(self) -> List[str]: return self["failed"]
    @property
    def remaining(self) -> List[str]: return self["remaining"]
    @property
    def error(self) -> Optional[str]: return self["error"]
    @property
    def next_action(self) -> Optional[str]: return self["next_action"]
    @property
    def output(self) -> Optional[str]: return self.get("output")

    def __contains__(self, item):
        if super().__contains__(item):
            return True
        if isinstance(item, str):
            return (
                item in str(self)
                or (self.get("output") and item in self.get("output"))
                or (self.get("error") and item in self.get("error"))
            )
        return False

    def to_formatted_text(self) -> str:
        output_str = self.get("output") or ""
        # Pure success without failures outputs text directly for clean UX
        if self["status"] == "success" and not self["failed"] and output_str:
            return output_str

        status_tag = f"[{self['status'].upper()}]"
        lines = [f"{status_tag} Agent Task Execution Report:"]
        if self["completed"]:
            lines.append("• Completed Steps:")
            for item in self["completed"]:
                lines.append(f"  - {item}")
        if self["failed"]:
            lines.append("• Failed Steps:")
            for item in self["failed"]:
                lines.append(f"  - {item}")
        if self["remaining"]:
            lines.append("• Remaining Work:")
            for item in self["remaining"]:
                lines.append(f"  - {item}")
        if self["error"]:
            lines.append(f"• Error: {self['error']}")
        if self["next_action"]:
            lines.append(f"• Suggested Next Action: {self['next_action']}")
        if output_str:
            lines.append(f"\n{output_str}")
        return "\n".join(lines)

    def __str__(self):
        return self.to_formatted_text()


def _tool_result_to_display(res: Any) -> str:
    """
    Safely converts a ToolResult, dict, or string tool output into a clean, human-readable string.
    Guaranteed to never raise an exception.
    """
    if res is None:
        return ""
    if isinstance(res, str):
        return res
    try:
        if isinstance(res, dict) or hasattr(res, "get"):
            status = str(res.get("status", "")).lower()

            parts = []

            # Succeeded / Completed / Output / Details
            succeeded = res.get("succeeded")
            completed = res.get("completed")
            output = res.get("output")
            details = res.get("details")

            if succeeded:
                if isinstance(succeeded, (list, tuple)):
                    parts.extend(str(x) for x in succeeded if x)
                else:
                    parts.append(str(succeeded))
            elif completed:
                if isinstance(completed, (list, tuple)):
                    parts.extend(str(x) for x in completed if x)
                else:
                    parts.append(str(completed))

            if output and str(output) not in parts:
                parts.append(str(output))

            if details and str(details) not in parts:
                parts.append(str(details))

            error = res.get("error")
            failed = res.get("failed") or res.get("failed_str")
            error_parts = []
            if error:
                error_parts.append(str(error))
            if failed:
                if isinstance(failed, (list, tuple)):
                    error_parts.extend(str(x) for x in failed if x and str(x) not in error_parts)
                elif str(failed) not in error_parts:
                    error_parts.append(str(failed))

            if parts:
                main_msg = "\n".join(parts)
                if error_parts:
                    return f"{main_msg}\nErrors: {', '.join(error_parts)}"
                return main_msg
            elif error_parts:
                return f"{', '.join(error_parts)}"
            elif status:
                tool_name = res.get("tool", "")
                return f"Tool '{tool_name}' status: {status}."
            else:
                return str(res)
        return str(res)
    except Exception:
        try:
            return str(res)
        except Exception:
            return f"Tool execution result: {type(res).__name__}"
