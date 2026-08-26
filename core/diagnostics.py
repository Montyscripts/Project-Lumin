"""
================================================================================
  LUMIN LOGGING & DIAGNOSTICS SUBSYSTEM
================================================================================
Structured, rotatable, user-accessible logging system for LUMIN AI Agent.

Features:
- Rotatable file logging (RotatingFileHandler) with configurable max size & backups.
- Consistent logger namespace: 'lumin.<submodule>'.
- Automated secret and sensitive path sanitization (API keys, tokens, auth headers, user home paths).
- Clear separation between user-facing diagnostic entries and deep internal debug events.
- Full preservation of LUMIN_DEBUG / DEBUG_MODE behavior.
- Documented log location and diagnostics reporting helpers.
================================================================================
"""

import os
import sys
import re
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional, Dict, Any

# Environment flags
DEBUG_MODE = os.environ.get("LUMIN_DEBUG", "").lower() in ("true", "1", "yes")

# Default Log Configuration
DEFAULT_LOG_FILENAME = "lumin.log"
DEFAULT_MAX_BYTES = 5 * 1024 * 1024  # 5 MB per file
DEFAULT_BACKUP_COUNT = 3  # Keep up to 3 backup log files (lumin.log.1, lumin.log.2, etc.)

# Secret redaction patterns
_SENSITIVE_KEY_PATTERNS = [
    re.compile(r'(api[_-]?key\s*[:=]\s*["\']?)([a-zA-Z0-9_\-]{8,})(["\']?)', re.IGNORECASE),
    re.compile(r'(bearer\s+)([a-zA-Z0-9_\-\.]{12,})', re.IGNORECASE),
    re.compile(r'(authorization\s*[:=]\s*["\']?(?:bearer\s+)?)([a-zA-Z0-9_\-\.]{12,})(["\']?)', re.IGNORECASE),
    re.compile(r'(password\s*[:=]\s*["\']?)([^"\'\s]{4,})(["\']?)', re.IGNORECASE),
    re.compile(r'(secret[_-]?key\s*[:=]\s*["\']?)([a-zA-Z0-9_\-]{8,})(["\']?)', re.IGNORECASE),
    re.compile(r'(token\s*[:=]\s*["\']?)([a-zA-Z0-9_\-]{8,})(["\']?)', re.IGNORECASE),
    re.compile(r'((?:AIza|sk-|ghp_|glpat-|xoxb-|xoxp-)[a-zA-Z0-9_\-]{16,})', re.IGNORECASE),
    re.compile(r'([a-zA-Z0-9+.\-]+://[^:]+:)([^@]+)(@)', re.IGNORECASE),
]


def sanitize_log_message(msg: str) -> str:
    """
    Redacts API keys, bearer tokens, passwords, sensitive credentials, and user home paths from log strings.
    """
    if not isinstance(msg, str) or not msg:
        return msg
    
    redacted = msg
    for pattern in _SENSITIVE_KEY_PATTERNS:
        def _repl(match):
            groups = match.groups()
            if len(groups) == 3:
                prefix, secret, suffix = groups
                masked = secret[:3] + "..." + secret[-3:] if len(secret) > 6 else "[REDACTED]"
                return f"{prefix}{masked}{suffix}"
            elif len(groups) == 2:
                prefix, secret = groups
                masked = secret[:3] + "..." + secret[-3:] if len(secret) > 6 else "[REDACTED]"
                return f"{prefix}{masked}"
            elif len(groups) == 1:
                secret = groups[0]
                masked = secret[:3] + "..." + secret[-3:] if len(secret) > 6 else "[REDACTED]"
                return masked
            return "[REDACTED]"
        
        redacted = pattern.sub(_repl, redacted)

    # Sanitize explicit user home directory paths if present
    try:
        home_path = str(Path.home())
        if home_path and len(home_path) > 3 and home_path in redacted:
            redacted = redacted.replace(home_path, "~")
    except Exception:
        pass

    # Generic scrub for home directory patterns across platforms (Windows, Linux, macOS)
    redacted = re.sub(r'([C-Zc-z]:[\\/]Users[\\/])[a-zA-Z0-9_.\-]+', r'\1[USER]', redacted)
    redacted = re.sub(r'(/home/)[a-zA-Z0-9_.\-]+', r'\1[USER]', redacted)
    redacted = re.sub(r'(/Users/)[a-zA-Z0-9_.\-]+', r'\1[USER]', redacted)

    return redacted


class SanitizedFormatter(logging.Formatter):
    """Logging formatter that automatically scrubs sensitive secrets from log outputs."""
    def format(self, record: logging.LogRecord) -> str:
        original_msg = record.msg
        if isinstance(record.msg, str):
            record.msg = sanitize_log_message(record.msg)
        
        # If arguments are passed, sanitize them if string
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: sanitize_log_message(v) if isinstance(v, str) else v for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                record.args = tuple(sanitize_log_message(v) if isinstance(v, str) else v for v in record.args)
            elif isinstance(record.args, list):
                record.args = [sanitize_log_message(v) if isinstance(v, str) else v for v in record.args]
        
        formatted = super().format(record)
        record.msg = original_msg  # Restore original in memory
        return formatted


class RobustRotatingFileHandler(RotatingFileHandler):
    """Rotating file handler that guarantees parent directories exist on rotation or reopen."""
    def _open(self):
        parent_dir = os.path.dirname(self.baseFilename)
        if parent_dir and not os.path.exists(parent_dir):
            try:
                os.makedirs(parent_dir, exist_ok=True)
            except Exception:
                pass
        return super()._open()


def get_log_file_path(base_dir: Optional[str] = None) -> str:
    """
    Determines the absolute log file location.
    Prioritizes explicit environment variable LUMIN_LOG_FILE or base workspace.
    """
    if os.environ.get("LUMIN_LOG_FILE"):
        return os.path.abspath(os.environ["LUMIN_LOG_FILE"])
    
    target_dir = base_dir or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(target_dir, DEFAULT_LOG_FILENAME)


_IS_LOGGING_INITIALIZED = False

def setup_logging(
    base_dir: Optional[str] = None,
    log_level: Optional[int] = None,
    max_bytes: int = DEFAULT_MAX_BYTES,
    backup_count: int = DEFAULT_BACKUP_COUNT,
    debug_mode: Optional[bool] = None
) -> str:
    """
    Initializes the root 'lumin' logger with structured formatting, automatic rotation,
    and secret sanitation. Safe to call multiple times (idempotent).
    
    Returns the absolute path to the active log file.
    """
    global _IS_LOGGING_INITIALIZED
    
    is_debug = DEBUG_MODE if debug_mode is None else debug_mode
    effective_level = logging.DEBUG if is_debug else (log_level or logging.INFO)
    
    log_path = get_log_file_path(base_dir)
    
    # Ensure log directory exists
    log_dir = os.path.dirname(log_path)
    if log_dir and not os.path.exists(log_dir):
        try:
            os.makedirs(log_dir, exist_ok=True)
        except Exception:
            pass

    lumin_logger = logging.getLogger("lumin")
    lumin_logger.setLevel(effective_level)
    
    # Properly close and clear existing handlers to prevent unclosed file handles & duplicate lines
    for h in list(lumin_logger.handlers):
        try:
            h.close()
        except Exception:
            pass
    lumin_logger.handlers.clear()
    lumin_logger.propagate = False  # Avoid leaking to root handler

    # Structured format
    log_format = "%(asctime)s - [%(name)s] - [%(levelname)s] - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    formatter = SanitizedFormatter(log_format, datefmt=date_format)

    # 1. Rotating File Handler (Always logs to rotatable file up to max_bytes)
    try:
        file_handler = RobustRotatingFileHandler(
            log_path,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8"
        )
        file_handler.setLevel(effective_level)
        file_handler.setFormatter(formatter)
        lumin_logger.addHandler(file_handler)
    except Exception as e:
        sys.stderr.write(f"[Lumin Logger Setup Error] Could not create file handler for {log_path}: {e}\n")

    # 2. Console Stream Handler (Attached when in DEBUG_MODE or explicit console output)
    if is_debug:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(formatter)
        lumin_logger.addHandler(console_handler)

    _IS_LOGGING_INITIALIZED = True
    return log_path


def get_logger(name: str) -> logging.Logger:
    """
    Retrieves or creates a named logger under the 'lumin' hierarchical namespace.
    E.g. get_logger('core') -> 'lumin.core'
         get_logger('lumin.tools') -> 'lumin.tools'
    """
    if not _IS_LOGGING_INITIALIZED:
        setup_logging()
    
    if not name.startswith("lumin"):
        norm_name = name.lower()
        if norm_name.startswith("lumin."):
            canonical_name = norm_name
        else:
            canonical_name = f"lumin.{norm_name}"
    else:
        canonical_name = name.lower()
        
    return logging.getLogger(canonical_name)


def get_diagnostic_summary() -> Dict[str, Any]:
    """
    Produces a safe, user-facing diagnostics overview including log path, size, and system state.
    """
    log_path = get_log_file_path()
    file_exists = os.path.exists(log_path)
    file_size_bytes = os.path.getsize(log_path) if file_exists else 0
    
    return {
        "log_path": log_path,
        "exists": file_exists,
        "size_bytes": file_size_bytes,
        "size_human": f"{file_size_bytes / 1024:.1f} KB" if file_size_bytes < 1024*1024 else f"{file_size_bytes / (1024*1024):.2f} MB",
        "debug_mode": DEBUG_MODE,
        "max_file_size": f"{DEFAULT_MAX_BYTES / (1024*1024):.1f} MB",
        "backup_count": DEFAULT_BACKUP_COUNT,
        "logger_namespace": "lumin.*"
    }
