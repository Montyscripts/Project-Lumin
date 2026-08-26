"""
Unit tests for Task 10: Structured, rotatable, user-accessible diagnostics without exposing secrets.
"""

import unittest
import os
import tempfile
import shutil
import logging

from core.diagnostics import (
    setup_logging,
    get_logger,
    get_log_file_path,
    get_diagnostic_summary,
    sanitize_log_message,
    DEFAULT_MAX_BYTES,
    DEFAULT_BACKUP_COUNT,
)


class TestTask10Diagnostics(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.log_file = os.path.join(self.test_dir, "test_lumin.log")
        os.environ["LUMIN_LOG_FILE"] = self.log_file

    def tearDown(self):
        for h in list(logging.getLogger("lumin").handlers):
            try:
                h.close()
            except Exception:
                pass
        logging.getLogger("lumin").handlers.clear()
        if "LUMIN_LOG_FILE" in os.environ:
            del os.environ["LUMIN_LOG_FILE"]
        shutil.rmtree(self.test_dir, ignore_errors=True)
        setup_logging()

    def test_secret_sanitization(self):
        """Verify API keys, tokens, and passwords are fully masked."""
        raw_msg_1 = "Connected to Gemini with api_key: AIzaSyD9876543210ABCDEFG123456"
        sanitized_1 = sanitize_log_message(raw_msg_1)
        self.assertNotIn("AIzaSyD9876543210ABCDEFG123456", sanitized_1)
        self.assertIn("AIz...456", sanitized_1)

        raw_msg_2 = "Authorization: Bearer sk-proj-1234567890abcdef123456"
        sanitized_2 = sanitize_log_message(raw_msg_2)
        self.assertNotIn("1234567890abcdef", sanitized_2)

        raw_msg_3 = 'Config loaded with secret_key="super_secret_token_value_999"'
        sanitized_3 = sanitize_log_message(raw_msg_3)
        self.assertNotIn("super_secret_token_value_999", sanitized_3)

        raw_msg_4 = "File accessed at /home/john_doe/documents/confidential.txt"
        sanitized_4 = sanitize_log_message(raw_msg_4)
        self.assertNotIn("/home/john_doe", sanitized_4)
        self.assertIn("/home/[USER]/documents/confidential.txt", sanitized_4)

        raw_msg_5 = "Windows path C:\\Users\\AliceSmith\\AppData\\secrets.json"
        sanitized_5 = sanitize_log_message(raw_msg_5)
        self.assertNotIn("AliceSmith", sanitized_5)

    def test_structured_log_format_and_rotation(self):
        """Verify rotating file handler rotates when maxBytes is exceeded."""
        # Use small max_bytes (500 bytes) for rotation test
        setup_logging(
            base_dir=self.test_dir,
            log_level=logging.INFO,
            max_bytes=500,
            backup_count=2,
            debug_mode=False
        )

        logger = get_logger("core.test")
        
        # Write enough lines to trigger rotation
        for i in range(50):
            logger.info(f"Diagnostic event sequence item #{i}: processing model inference and routing.")

        # Flush handlers
        for h in logging.getLogger("lumin").handlers:
            h.flush()

        self.assertTrue(os.path.exists(self.log_file))
        rotated_1 = f"{self.log_file}.1"
        self.assertTrue(os.path.exists(rotated_1), "Expected rotated backup log file .1 to exist")

        with open(self.log_file, "r", encoding="utf-8") as f:
            content = f.read()
            # Verify structured formatting: %(asctime)s - [%(name)s] - [%(levelname)s] - %(message)s
            self.assertIn("[lumin.core.test]", content)
            self.assertIn("[INFO]", content)

    def test_diagnostic_summary_metadata(self):
        """Verify get_diagnostic_summary returns safe, readable system diagnostics."""
        summary = get_diagnostic_summary()
        self.assertEqual(summary["log_path"], self.log_file)
        self.assertIn("size_human", summary)
        self.assertIn("max_file_size", summary)
        self.assertEqual(summary["backup_count"], DEFAULT_BACKUP_COUNT)
        self.assertEqual(summary["logger_namespace"], "lumin.*")

    def test_logger_namespace_consistency(self):
        """Verify get_logger maps all module names to lumin.<name> hierarchy."""
        log_core = get_logger("core")
        self.assertEqual(log_core.name, "lumin.core")

        log_router = get_logger("lumin.router")
        self.assertEqual(log_router.name, "lumin.router")

        log_nested = get_logger("audio.tts")
        self.assertEqual(log_nested.name, "lumin.audio.tts")

    def test_debug_mode_and_level_separation(self):
        """Verify INFO vs DEBUG level separation and DEBUG_MODE behavior."""
        # 1. INFO mode: debug messages should NOT be emitted to file
        setup_logging(base_dir=self.test_dir, log_level=logging.INFO, debug_mode=False)
        test_logger = get_logger("separation_test")
        test_logger.debug("INTERNAL_DEBUG_TOKEN_12345")
        test_logger.info("USER_FACING_INFO_67890")

        for h in logging.getLogger("lumin").handlers:
            h.flush()

        with open(self.log_file, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertNotIn("INTERNAL_DEBUG_TOKEN_12345", content)
            self.assertIn("USER_FACING_INFO_67890", content)

        # 2. DEBUG mode: debug messages SHOULD be emitted
        setup_logging(base_dir=self.test_dir, debug_mode=True)
        test_logger.debug("INTERNAL_DEBUG_TOKEN_VISIBLE")
        for h in logging.getLogger("lumin").handlers:
            h.flush()

        with open(self.log_file, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("INTERNAL_DEBUG_TOKEN_VISIBLE", content)

    def test_record_sanitization_in_log_file(self):
        """Verify that logged records with sensitive secrets are scrubbed before reaching file."""
        setup_logging(base_dir=self.test_dir, log_level=logging.INFO, debug_mode=False)
        sec_logger = get_logger("security_test")
        sec_logger.info("Initializing provider with api_key: AIzaSySecretKey9988776655443322")

        for h in logging.getLogger("lumin").handlers:
            h.flush()

        with open(self.log_file, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertNotIn("AIzaSySecretKey9988776655443322", content)
            self.assertIn("AIz...322", content)


if __name__ == '__main__':
    unittest.main()
