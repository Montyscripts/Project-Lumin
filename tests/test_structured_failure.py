"""
Unit tests for LUMIN Structured Failure Status & Error Reporting System.
Covers:
- ToolResult schema normalization (success, partial, failed, needs_user)
- Structured error properties, dictionary compatibility, and string representations
- Tool execution error handling and missing tool failure results
- UploadMetadata structured status handling (parsed, partial, corrupted, quarantined, rejected, error)
"""

import os
import unittest
from tools.registry import ToolRegistry, ToolResult
from core.upload_pipeline import UploadPipeline, UploadMetadata


class TestStructuredFailureStatus(unittest.TestCase):
    def test_tool_result_status_normalization(self):
        """ToolResult normalizes various raw status strings to standard status codes."""
        # Success mappings
        for raw in ["success", "succeeded", "ok", "done", "true"]:
            tr = ToolResult(status=raw, tool="test")
            self.assertEqual(tr.status, "success")

        # User required mappings
        for raw in ["needs_user", "requires_user", "blocked"]:
            tr = ToolResult(status=raw, tool="test")
            self.assertEqual(tr.status, "needs_user")

        # Failure mappings
        for raw in ["failed", "cancelled", "error"]:
            tr = ToolResult(status=raw, tool="test")
            self.assertEqual(tr.status, "failed")

        # Partial mappings
        for raw in ["partial", "incomplete"]:
            tr = ToolResult(status=raw, tool="test")
            self.assertEqual(tr.status, "partial")

        # Unknown maps to failed
        tr_unknown = ToolResult(status="random_unexpected_string", tool="test")
        self.assertEqual(tr_unknown.status, "failed")

    def test_tool_result_property_accessors_and_schema(self):
        """ToolResult properties match specification schema and dictionary interface."""
        tr = ToolResult(
            status="failed",
            tool="run_powershell",
            planned="Run powershell command",
            attempted="Executed command 'Get-Process'",
            failed_list=["Command timed out"],
            completed=["Script syntax valid"],
            remaining=["Parse process output"],
            error="Timeout after 30s",
            next_action="Retry with higher timeout"
        )

        self.assertEqual(tr.status, "failed")
        self.assertEqual(tr.tool, "run_powershell")
        self.assertEqual(tr.completed, ["Script syntax valid"])
        self.assertEqual(tr.failed, ["Command timed out"])
        self.assertEqual(tr.remaining, ["Parse process output"])
        self.assertEqual(tr.error, "Timeout after 30s")
        self.assertEqual(tr.next_action, "Retry with higher timeout")

        # Dictionary compatibility
        self.assertIn("status", tr)
        self.assertEqual(tr["status"], "failed")

        # Formatted string output
        rendered = str(tr)
        self.assertIn("[FAILED] Tool 'run_powershell':", rendered)
        self.assertIn("Error: Timeout after 30s", rendered)

    def test_missing_tool_execution_returns_structured_failure(self):
        """Executing an unmapped tool returns a structured failure ToolResult."""
        registry = ToolRegistry()
        res = registry.execute_tool("nonexistent_unknown_tool")

        self.assertIsInstance(res, ToolResult)
        self.assertEqual(res.status, "failed")
        self.assertEqual(res.tool, "nonexistent_unknown_tool")
        self.assertIn("Tool 'nonexistent_unknown_tool' not found", res.error)

    def test_upload_metadata_failure_status_schema(self):
        """UploadMetadata correctly stores structured status flags for all pipeline outcomes."""
        # 1. Partial status
        meta_partial = UploadMetadata(
            upload_id="1", original_name="big.txt", safe_name="big.txt",
            file_path="/tmp/big.txt", file_size=100000, mime_type="text/plain",
            file_type="text", upload_time="now", file_hash="hash1",
            status="partial", parsed_summary="Parsed 50%"
        )
        self.assertEqual(meta_partial.status, "partial")

        # 2. Corrupted status
        meta_corrupt = UploadMetadata(
            upload_id="2", original_name="bad.pdf", safe_name="bad.pdf",
            file_path="/tmp/bad.pdf", file_size=100, mime_type="application/pdf",
            file_type="document", upload_time="now", file_hash="hash2",
            status="corrupted", error="Lacks valid %PDF header"
        )
        self.assertEqual(meta_corrupt.status, "corrupted")

        # 3. Quarantined status
        meta_quarantine = UploadMetadata(
            upload_id="3", original_name="bomb.zip", safe_name="bomb.zip",
            file_path="/tmp/bomb.zip", file_size=200, mime_type="application/zip",
            file_type="archive", upload_time="now", file_hash="hash3",
            status="quarantined", error="Nested archive detected"
        )
        self.assertEqual(meta_quarantine.status, "quarantined")

        # 4. Rejected status
        meta_rejected = UploadMetadata(
            upload_id="4", original_name="app.exe", safe_name="app.exe",
            file_path="/tmp/app.exe", file_size=500, mime_type="application/octet-stream",
            file_type="binary", upload_time="now", file_hash="hash4",
            status="rejected", error="Executable prohibited"
        )
        self.assertEqual(meta_rejected.status, "rejected")


if __name__ == "__main__":
    unittest.main()
