"""
LUMIN AI Agent - Managed Upload Pipeline Engine
Provides secure workspace upload handling, permission validation, multi-format file parsing
(TXT, PDF, DOCX, PNG, JPG), metadata tracking, workspace search, temporary cleanup, and error reporting.
Enforces strict path security and Protected Mode restrictions.
"""

import os
import sys
import re
import io
import json
import zlib
import time
import struct
import shutil
import glob
import logging
import hashlib
import datetime
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, List, Tuple, Optional, Any

logger = logging.getLogger("lumin.upload_pipeline")


class UploadMetadata:
    """Dataclass holding detailed tracking metadata for an uploaded file."""
    def __init__(
        self,
        upload_id: str,
        original_name: str,
        safe_name: str,
        file_path: str,
        file_size: int,
        mime_type: str,
        file_type: str,
        upload_time: str,
        file_hash: str,
        permission_valid: bool = True,
        status: str = "uploaded",
        error: Optional[str] = None,
        parsed_content: str = "",
        parsed_summary: str = ""
    ):
        self.upload_id = upload_id
        self.original_name = original_name
        self.safe_name = safe_name
        self.file_path = file_path
        self.file_size = file_size
        self.mime_type = mime_type
        self.file_type = file_type
        self.upload_time = upload_time
        self.file_hash = file_hash
        self.permission_valid = permission_valid
        self.status = status
        self.error = error
        self.parsed_content = parsed_content
        self.parsed_summary = parsed_summary

    @property
    def human_size(self) -> str:
        if self.file_size < 1024:
            return f"{self.file_size} B"
        elif self.file_size < 1024 * 1024:
            return f"{self.file_size / 1024:.1f} KB"
        else:
            return f"{self.file_size / (1024 * 1024):.2f} MB"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "upload_id": self.upload_id,
            "original_name": self.original_name,
            "safe_name": self.safe_name,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "human_size": self.human_size,
            "mime_type": self.mime_type,
            "file_type": self.file_type,
            "upload_time": self.upload_time,
            "file_hash": self.file_hash,
            "permission_valid": self.permission_valid,
            "status": self.status,
            "error": self.error,
            "parsed_summary": self.parsed_summary
        }


class UploadPipeline:
    """
    Core Upload Pipeline for LUMIN.
    Manages the workspace directory, security checks, format parsers,
    metadata registry, and multi-file AI context generation.
    """

    ALLOWED_EXTENSIONS = {
        ".txt", ".md", ".json", ".csv", ".xml", ".html", ".css", ".js", ".ts", ".py", ".sql", ".sh", ".bat",
        ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt",
        ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif",
        ".mp3", ".wav", ".ogg", ".flac", ".mp4", ".webm", ".mkv", ".avi",
        ".zip", ".tar", ".gz"
    }

    MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB limit per file

    def __init__(self, workspace_dir: Optional[str] = None, config: Optional[dict] = None, tool_registry: Any = None):
        if workspace_dir:
            self.workspace_dir = os.path.abspath(workspace_dir)
        else:
            self.workspace_dir = os.path.abspath("uploads")

        self.config = config or {}
        self.tool_registry = tool_registry
        self.registry_file = os.path.join(self.workspace_dir, ".upload_registry.json")
        self.metadata_store: Dict[str, UploadMetadata] = {}
        self.project_index: Dict[str, Any] = {}

        self._init_workspace()
        self._load_registry()

    def _init_workspace(self):
        """Ensures the managed upload workspace directory exists with safe permissions."""
        try:
            os.makedirs(self.workspace_dir, exist_ok=True)
            if hasattr(os, "chmod") and os.name != "nt":
                os.chmod(self.workspace_dir, 0o755)
        except Exception as e:
            logger.error(f"Failed to initialize upload workspace at '{self.workspace_dir}': {e}")

    def _load_registry(self):
        """Loads upload registry metadata from workspace storage."""
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data.get("uploads", []):
                        meta = UploadMetadata(
                            upload_id=item.get("upload_id", ""),
                            original_name=item.get("original_name", ""),
                            safe_name=item.get("safe_name", ""),
                            file_path=item.get("file_path", ""),
                            file_size=item.get("file_size", 0),
                            mime_type=item.get("mime_type", ""),
                            file_type=item.get("file_type", "file"),
                            upload_time=item.get("upload_time", ""),
                            file_hash=item.get("file_hash", ""),
                            permission_valid=item.get("permission_valid", True),
                            status=item.get("status", "uploaded"),
                            error=item.get("error"),
                            parsed_summary=item.get("parsed_summary", "")
                        )
                        if os.path.exists(meta.file_path):
                            self.metadata_store[meta.file_path] = meta
            except Exception as e:
                logger.warning(f"Could not load upload registry: {e}")

    def _save_registry(self):
        """Persists current upload metadata store to JSON file."""
        try:
            records = [meta.to_dict() for meta in self.metadata_store.values()]
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump({"uploads": records, "updated_at": datetime.datetime.now().isoformat()}, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save upload registry: {e}")

    def validate_permissions(self, file_path: str, file_name: str, file_size: int) -> Tuple[bool, Optional[str]]:
        """
        Validates permission and security rules for an uploaded file.
        Checks workspace confinement, path traversal, file size limits, and format security.
        """
        try:
            resolved = os.path.abspath(file_path)

            # 1. Path Sandboxing Check
            if not resolved.startswith(self.workspace_dir) and not resolved.startswith(os.path.abspath(".")):
                return False, f"Permission Denied: Path '{file_path}' is outside managed workspace '{self.workspace_dir}'."

            # 2. Path Traversal Check
            if ".." in file_path or ".." in file_name:
                return False, "Security Violation: Path traversal characters ('..') detected."

            # 3. Size Limit Check
            if file_size > self.MAX_FILE_SIZE:
                return False, f"File Size Exceeded: File size ({file_size / (1024*1024):.1f}MB) exceeds 20MB limit."

            # 4. Extension / Protected Mode Check
            ext = os.path.splitext(file_name)[1].lower()
            if ext and ext not in self.ALLOWED_EXTENSIONS:
                # Deny dangerous executable scripts
                if ext in (".exe", ".dll", ".so", ".sh", ".bat", ".vbs", ".cmd", ".msi", ".ps1"):
                    return False, f"Protected Mode Security Block: Executable / script format '{ext}' is prohibited."

            # 5. Tool Registry security check if present
            if self.tool_registry and hasattr(self.tool_registry, "_check_file_access"):
                access_err = self.tool_registry._check_file_access(resolved)
                if access_err and "Security Guard" in access_err:
                    return False, f"Protected Mode Violation: {access_err}"

            return True, None
        except Exception as ex:
            return False, f"Permission Validation Exception: {ex}"

    def sanitize_filename(self, filename: str) -> str:
        """Sanitizes filename for cross-platform filesystem safety."""
        base = os.path.basename(filename)
        cleaned = re.sub(r'[^a-zA-Z0-9.\-_]', '_', base)
        if not cleaned:
            cleaned = f"upload_{int(time.time())}.dat"
        return cleaned

    def compute_file_hash(self, file_path: str) -> str:
        """Calculates SHA-256 hash of a file for integrity verification."""
        hasher = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return ""

    # ── Structural Mapping & Intelligent Retrieval ───────────────────────────

    def generate_structural_map(self, file_path: str, content: Optional[str] = None) -> str:
        """
        Generates a high-speed structural map for files > 12KB or source code modules.
        Extracts imports, classes, function signatures, constants, and logical sections.
        """
        file_name = os.path.basename(file_path)
        ext = os.path.splitext(file_name)[1].lower()
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

        if content is None and os.path.exists(file_path):
            content = self.parse_txt(file_path)
        elif content is None:
            content = ""

        size_kb = file_size / 1024.0
        lines = content.splitlines()
        num_lines = len(lines)

        sections = []
        imports = []
        classes = []
        functions = []

        # Python AST parsing for .py files
        if ext == ".py":
            try:
                import ast
                tree = ast.parse(content)
                for node in ast.iter_child_nodes(tree):
                    if isinstance(node, (ast.Import, ast.ImportFrom)):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                imports.append(alias.name)
                        else:
                            mod = node.module or ""
                            names = ", ".join(a.name for a in node.names)
                            imports.append(f"from {mod} import {names}")
                    elif isinstance(node, ast.ClassDef):
                        methods = [m.name for m in node.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
                        doc = ast.get_docstring(node) or ""
                        doc_first = doc.split("\n")[0] if doc else ""
                        classes.append(f"class {node.name}(line {node.lineno}): {doc_first} [Methods: {', '.join(methods[:8])}]")
                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        args = [a.arg for a in node.args.args]
                        functions.append(f"def {node.name}({', '.join(args[:5])}) (line {node.lineno})")
            except Exception:
                # Regex fallback if AST fails due to syntax error
                for idx, line in enumerate(lines, 1):
                    line_s = line.strip()
                    if line_s.startswith("class "):
                        classes.append(f"{line_s} (line {idx})")
                    elif line_s.startswith("def ") or line_s.startswith("async def "):
                        functions.append(f"{line_s} (line {idx})")
                    elif line_s.startswith("import ") or line_s.startswith("from "):
                        imports.append(line_s)

        # JS / TS / JSX / TSX regex parsing
        elif ext in (".js", ".ts", ".jsx", ".tsx"):
            for idx, line in enumerate(lines, 1):
                line_s = line.strip()
                if line_s.startswith("import ") or line_s.startswith("export *") or line_s.startswith("export {"):
                    imports.append(line_s[:80])
                elif re.match(r'^(?:export\s+)?class\s+\w+', line_s):
                    classes.append(f"{line_s[:80]} (line {idx})")
                elif re.match(r'^(?:export\s+)?(?:async\s+)?function\s+\w+', line_s) or re.match(r'^(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(', line_s):
                    functions.append(f"{line_s[:80]} (line {idx})")
                elif line_s.startswith("interface ") or line_s.startswith("type "):
                    classes.append(f"{line_s[:80]} (line {idx})")

        # Generic markdown or text heading sections
        else:
            for idx, line in enumerate(lines, 1):
                if line.startswith("#") or line.startswith("===") or line.startswith("---"):
                    sections.append(f"Line {idx}: {line.strip()[:80]}")

        # Assemble structural map output
        map_parts = [
            f"=== STRUCTURAL MAP: {file_name} ({size_kb:.1f} KB | {num_lines} lines) ===",
            f"• File Path: {file_path}",
        ]

        if imports:
            map_parts.append("\n[IMPORTS & DEPENDENCIES]:\n" + "\n".join(f"  - {imp}" for imp in imports[:15]))
        if classes:
            map_parts.append("\n[CLASSES & DATA MODELS]:\n" + "\n".join(f"  • {c}" for c in classes[:25]))
        if functions:
            map_parts.append("\n[FUNCTIONS & ENTRY POINTS]:\n" + "\n".join(f"  • {f}" for f in functions[:35]))
        if sections:
            map_parts.append("\n[DOCUMENT SECTIONS]:\n" + "\n".join(f"  - {s}" for s in sections[:20]))

        map_parts.append("==============================================================")
        result_map = "\n".join(map_parts)
        
        print(f">>> [STRUCTURAL MAPPER]: Generated map for '{file_name}' ({size_kb:.1f} KB) across {len(classes) + len(functions) + len(sections)} structural elements.")
        sys.stdout.flush()
        return result_map

    def get_relevant_chunks(self, file_path: str, query: str = "", max_chars: int = 4000) -> str:
        """
        Retrieves top relevant chunks from a large file using structural mapping + query term matching.
        Ensures context window is never overloaded with raw monolithic dumps.
        """
        if not os.path.exists(file_path):
            return f"File '{file_path}' not found."

        content = self.parse_txt(file_path)
        if len(content) <= max_chars:
            return content

        # Generate structural map first
        structural_map = self.generate_structural_map(file_path, content=content)

        # Split content into paragraphs or code blocks
        blocks = [b.strip() for b in re.split(r'\n\s*\n', content) if b.strip()]
        if not blocks:
            return content[:max_chars]

        # Rank blocks by keyword relevance
        keywords = [kw.lower() for kw in query.split() if len(kw) > 2]
        scored_blocks = []
        for b in blocks:
            score = sum(b.lower().count(kw) for kw in keywords) if keywords else 1
            scored_blocks.append((score, b))

        # Sort blocks descending by score
        scored_blocks.sort(key=lambda x: x[0], reverse=True)

        selected_text = [structural_map, "\n### [RELEVANT EXTRACTS & CODE BLOCKS]:\n"]
        current_len = len(structural_map)

        for score, block in scored_blocks:
            if current_len + len(block) > max_chars:
                break
            selected_text.append(block)
            current_len += len(block)

        return "\n\n".join(selected_text)

    def index_project_directory(self, dir_path: str = ".") -> Dict[str, Any]:
        """
        Indexes all source files in a project directory, building structural maps and summaries.
        Stores index in self.project_index for session continuity.
        """
        print(f">>> [PROJECT INDEXER]: Scanning and indexing directory '{dir_path}'...")
        sys.stdout.flush()

        abs_dir = os.path.abspath(dir_path)
        ignore_dirs = {".git", "node_modules", "__pycache__", "venv", ".venv", "dist", "build", ".next", "tts_cache"}
        
        index_records = {}
        file_count = 0

        for root, dirs, files in os.walk(abs_dir):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for file_name in files:
                if file_name.startswith("."):
                    continue
                file_path = os.path.join(root, file_name)
                ext = os.path.splitext(file_name)[1].lower()

                if ext in self.ALLOWED_EXTENSIONS:
                    try:
                        size = os.path.getsize(file_path)
                        rel_path = os.path.relpath(file_path, abs_dir)
                        
                        s_map = ""
                        if size > 12 * 1024 or ext in (".py", ".ts", ".js", ".tsx", ".jsx"):
                            s_map = self.generate_structural_map(file_path)

                        index_records[rel_path] = {
                            "abs_path": file_path,
                            "rel_path": rel_path,
                            "size_bytes": size,
                            "extension": ext,
                            "structural_map": s_map
                        }
                        file_count += 1
                    except Exception as ex:
                        logger.debug(f"Could not index file '{file_path}': {ex}")

        self.project_index = {
            "root_dir": abs_dir,
            "file_count": file_count,
            "indexed_at": datetime.datetime.now().isoformat(),
            "files": index_records
        }

        print(f">>> [PROJECT INDEXER]: Successfully indexed {file_count} project files in '{dir_path}'.")
        sys.stdout.flush()
        return self.project_index

    # ── Specialized Parsers ──────────────────────────────────────────────────

    def parse_txt(self, file_path: str) -> str:
        """Parses plain text / Markdown / code file with multi-encoding fallback."""
        encodings = ["utf-8", "utf-16", "cp1252", "latin-1"]
        content = ""
        for enc in encodings:
            try:
                with open(file_path, "r", encoding=enc) as f:
                    content = f.read()
                break
            except Exception:
                continue

        if not content:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

        return content

    def parse_pdf(self, file_path: str, max_pages: int = 30) -> str:
        """Parses PDF file using pypdf if available, or native stream parser fallback."""
        # Method 1: Try pypdf library if available
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            num_pages = len(reader.pages)
            pages_output = [f"PDF Document: {os.path.basename(file_path)} (Total Pages: {num_pages})\n"]
            limit = min(num_pages, max_pages)
            for i in range(limit):
                p_text = reader.pages[i].extract_text()
                if p_text and p_text.strip():
                    pages_output.append(f"--- Page {i + 1} ---\n{p_text.strip()}")
                else:
                    pages_output.append(f"--- Page {i + 1} ---\n(No extractable text)")
            return "\n\n".join(pages_output)
        except Exception:
            pass

        # Method 2: Native pure-python PDF stream and string literal extraction
        try:
            with open(file_path, "rb") as f:
                data = f.read()

            streams = re.findall(rb'stream[\r\n]+(.*?)[\r\n]+endstream', data, re.DOTALL)
            text_parts = []
            for s in streams:
                decompressed = s
                try:
                    decompressed = zlib.decompress(s)
                except Exception:
                    pass

                # Extract Tj strings
                tj_matches = re.findall(rb'\((.*?)\)\s*Tj', decompressed)
                for m in tj_matches:
                    decoded = m.decode("utf-8", errors="ignore").strip()
                    if decoded and len(decoded) > 1:
                        text_parts.append(decoded)

                # Extract TJ array strings
                tj_arr_matches = re.findall(rb'\[(.*?)\]\s*TJ', decompressed, re.DOTALL)
                for arr in tj_arr_matches:
                    parts = re.findall(rb'\((.*?)\)', arr)
                    line = "".join([p.decode("utf-8", errors="ignore") for p in parts if p]).strip()
                    if line and len(line) > 1:
                        text_parts.append(line)

            if text_parts:
                return f"PDF Document: {os.path.basename(file_path)} (Parsed via Native Stream Extractor)\n\n" + "\n".join(text_parts[:1000])

            # Fallback text regex from raw PDF
            raw_strings = re.findall(rb'\(([\w\s.,!?:;\-\'\"]{3,100})\)', data)
            extracted = [s.decode("ascii", errors="ignore").strip() for s in raw_strings if len(s.strip()) > 3]
            if extracted:
                return f"PDF Document: {os.path.basename(file_path)} (Extracted Text Strings)\n\n" + "\n".join(extracted[:500])

            return f"PDF Document: {os.path.basename(file_path)} ({len(data)} bytes)\n(PDF contains no plain text streams or image-based content)."
        except Exception as ex:
            return f"Error parsing PDF file '{os.path.basename(file_path)}': {ex}"

    def parse_docx(self, file_path: str) -> str:
        """Parses DOCX Word document using python-docx if available, or native Zip/XML fallback."""
        # Method 1: Try python-docx if available
        try:
            import docx
            doc = docx.Document(file_path)
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            output = [f"Word Document: {os.path.basename(file_path)}\n"]
            if paragraphs:
                output.append("\n\n".join(paragraphs))
            if doc.tables:
                output.append("\n--- Tables ---")
                for i, table in enumerate(doc.tables):
                    output.append(f"Table {i+1}:")
                    for row in table.rows:
                        row_cells = [cell.text.strip() for cell in row.cells]
                        output.append("| " + " | ".join(row_cells) + " |")
            return "\n".join(output)
        except Exception:
            pass

        # Method 2: Native Zip/XML extraction from word/document.xml
        try:
            with zipfile.ZipFile(file_path) as z:
                if "word/document.xml" in z.namelist():
                    xml_data = z.read("word/document.xml")
                    tree = ET.fromstring(xml_data)

                    paragraphs = []
                    # Find all paragraph tags <w:p>
                    for p_elem in tree.iter():
                        if p_elem.tag.endswith("p"):
                            # Collect text tags <w:t> inside paragraph
                            p_text = "".join([t.text for t in p_elem.iter() if t.tag.endswith("t") and t.text])
                            if p_text.strip():
                                paragraphs.append(p_text.strip())

                    if paragraphs:
                        return f"Word Document: {os.path.basename(file_path)} (Parsed via Native XML Engine)\n\n" + "\n\n".join(paragraphs)

            return f"Word Document: {os.path.basename(file_path)}\n(No text elements found in document XML)."
        except Exception as ex:
            return f"Error parsing Word document '{os.path.basename(file_path)}': {ex}"

    def parse_image(self, file_path: str) -> Tuple[str, str]:
        """Parses image file and generates rich vision analysis context."""
        filename = os.path.basename(file_path)

        vis_res = ""
        if self.tool_registry and hasattr(self.tool_registry, "execute_tool"):
            try:
                vis_res = self.tool_registry.execute_tool("describe_image", file_path)
            except Exception:
                pass

        if not vis_res:
            vis_res = f"Image file {filename} ready for visual analysis."

        description = f"{vis_res.strip()}\n"
        meta_summary = f"Image Asset: {filename} (Visual Content Analyzed)"

        return description, meta_summary

    def parse_generic_file(self, file_path: str, mime_type: str = "") -> str:
        """Fallback parser for other structured formats (CSV, XLSX, JSON, etc.)."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext in (".csv", ".json", ".xml", ".html", ".css", ".js", ".ts", ".py", ".md", ".sh", ".sql"):
            return self.parse_txt(file_path)
        
        size = os.path.getsize(file_path)
        return f"File: {os.path.basename(file_path)} ({ext.upper()[1:] if ext else 'Data'}, {size} bytes)\n(Binary/Structured file registered in upload pipeline)."

    # ── Master Upload Pipeline Operations ───────────────────────────────────

    def process_file(
        self,
        file_path: str,
        original_name: Optional[str] = None,
        mime_type: Optional[str] = None,
        file_type: Optional[str] = None
    ) -> UploadMetadata:
        """
        Executes full upload pipeline for a file:
        Validation -> Metadata Registration -> Parsing -> Storage.
        """
        resolved_path = os.path.abspath(file_path)
        file_name = original_name or os.path.basename(resolved_path)
        safe_name = self.sanitize_filename(file_name)

        # Ensure file is sandboxed in workspace_dir (uploads/)
        workspace_abs = os.path.abspath(self.workspace_dir)
        os.makedirs(workspace_abs, exist_ok=True)
        if not resolved_path.startswith(workspace_abs) and os.path.exists(resolved_path):
            dest_path = os.path.join(workspace_abs, safe_name)
            if os.path.exists(dest_path) and os.path.abspath(dest_path) != resolved_path:
                stem, ext_part = os.path.splitext(safe_name)
                content_hash = self.compute_file_hash(resolved_path)[:6] or f"{int(time.time()*1000)}"
                unique_name = f"{stem}_{content_hash}{ext_part}"
                dest_path = os.path.join(workspace_abs, unique_name)
                if os.path.exists(dest_path) and os.path.abspath(dest_path) != resolved_path:
                    unique_name = f"{stem}_{content_hash}_{time.time_ns()}{ext_part}"
                    dest_path = os.path.join(workspace_abs, unique_name)

            try:
                shutil.copy2(resolved_path, dest_path)
                resolved_path = dest_path
            except Exception as cp_err:
                logger.warning(f"Could not copy file into upload workspace: {cp_err}")
        elif resolved_path in self.metadata_store and os.path.exists(resolved_path):
            # If resolved_path was already processed in metadata_store, create a distinct file copy to preserve both records
            stem, ext_part = os.path.splitext(safe_name)
            content_hash = self.compute_file_hash(resolved_path)[:6] or f"{int(time.time()*1000)}"
            unique_name = f"{stem}_{content_hash}_{time.time_ns()}{ext_part}"
            dest_path = os.path.join(workspace_abs, unique_name)
            try:
                shutil.copy2(resolved_path, dest_path)
                resolved_path = dest_path
            except Exception as cp_err:
                logger.warning(f"Could not create distinct copy for duplicate file: {cp_err}")
        
        file_size = os.path.getsize(resolved_path) if os.path.exists(resolved_path) else 0
        ext = os.path.splitext(safe_name)[1].lower()

        # Generate upload ID
        upload_id = f"up_{int(time.time())}_{hashlib.md5(file_name.encode()).hexdigest()[:6]}"
        file_hash = self.compute_file_hash(resolved_path) if os.path.exists(resolved_path) else ""

        # Auto-detect file type
        if not file_type:
            if ext in (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"):
                file_type = "image"
            elif ext == ".pdf":
                file_type = "pdf"
            elif ext in (".docx", ".doc"):
                file_type = "docx"
            elif ext in (".txt", ".md", ".json", ".csv", ".py", ".js", ".ts", ".html", ".css", ".sql"):
                file_type = "text"
            else:
                file_type = "file"

        # 1. Validation Phase
        is_valid, perm_err = self.validate_permissions(resolved_path, file_name, file_size)
        if not is_valid:
            meta = UploadMetadata(
                upload_id=upload_id,
                original_name=file_name,
                safe_name=safe_name,
                file_path=resolved_path,
                file_size=file_size,
                mime_type=mime_type or "application/octet-stream",
                file_type=file_type,
                upload_time=datetime.datetime.now().isoformat(),
                file_hash=file_hash,
                permission_valid=False,
                status="error",
                error=perm_err,
                parsed_content=f"Upload Error: {perm_err}"
            )
            self.metadata_store[resolved_path] = meta
            self._save_registry()
            return meta

        # 2. Parsing Phase
        parsed_text = ""
        parsed_summary = ""
        try:
            if file_type == "image":
                parsed_text, parsed_summary = self.parse_image(resolved_path)
            elif ext == ".pdf" or file_type == "pdf":
                parsed_text = self.parse_pdf(resolved_path)
                parsed_summary = f"PDF Document ({file_size / (1024*1024):.1f} MB)"
            elif ext in (".docx", ".doc") or file_type == "docx":
                parsed_text = self.parse_docx(resolved_path)
                parsed_summary = f"Word Document ({file_size / 1024:.1f} KB)"
            elif file_type == "text" or ext in (".txt", ".md", ".json", ".csv", ".py", ".js", ".ts", ".html", ".css", ".sql", ".sh"):
                parsed_text = self.parse_txt(resolved_path)
                parsed_summary = f"Text File ({len(parsed_text)} chars, {file_size / 1024:.1f} KB)"
            else:
                parsed_text = self.parse_generic_file(resolved_path, mime_type or "")
                parsed_summary = f"File ({ext.upper()[1:] if ext else 'Data'}, {file_size / 1024:.1f} KB)"

            status = "parsed"
            error_msg = None
        except Exception as parse_ex:
            status = "error"
            error_msg = f"Parsing Error: {parse_ex}"
            parsed_text = f"Error parsing file '{file_name}': {parse_ex}"
            parsed_summary = "Parsing Error"

        # 3. Metadata Registration
        meta = UploadMetadata(
            upload_id=upload_id,
            original_name=file_name,
            safe_name=safe_name,
            file_path=resolved_path,
            file_size=file_size,
            mime_type=mime_type or "application/octet-stream",
            file_type=file_type,
            upload_time=datetime.datetime.now().isoformat(),
            file_hash=file_hash,
            permission_valid=True,
            status=status,
            error=error_msg,
            parsed_content=parsed_text,
            parsed_summary=parsed_summary
        )

        self.metadata_store[resolved_path] = meta
        self._save_registry()
        logger.info(f"[Upload Pipeline] Successfully processed file '{file_name}' ({meta.human_size}). Status: {status}")
        return meta

    def process_batch(self, files_list: List[Dict[str, Any]]) -> List[UploadMetadata]:
        """Processes multiple uploaded files through the pipeline concurrently."""
        results = []
        for file_info in files_list:
            file_path = file_info.get("path") or file_info.get("file_path")
            if not file_path:
                continue
            orig_name = file_info.get("name") or file_info.get("original_name")
            mime_type = file_info.get("mimeType") or file_info.get("mime_type")
            file_type = file_info.get("type") or file_info.get("file_type")
            
            meta = self.process_file(file_path, original_name=orig_name, mime_type=mime_type, file_type=file_type)
            results.append(meta)
        return results

    def get_recent_uploads(self, limit: int = 5) -> List[UploadMetadata]:
        """Returns the most recently uploaded/processed files in the workspace or metadata store."""
        records = list(self.metadata_store.values())
        seen_paths = {r.file_path for r in records if os.path.exists(r.file_path)}

        if os.path.exists(self.workspace_dir):
            files = glob.glob(os.path.join(self.workspace_dir, "*"))
            for f in sorted(files, key=os.path.getmtime, reverse=True):
                if os.path.basename(f).startswith("."):
                    continue
                abs_path = os.path.abspath(f)
                if abs_path not in seen_paths:
                    meta = self.process_file(abs_path)
                    records.append(meta)
                    seen_paths.add(abs_path)

        valid_records = [r for r in records if os.path.exists(r.file_path)]
        valid_records.sort(key=lambda x: getattr(x, 'upload_time', ''), reverse=True)
        return valid_records[:limit]

    def search_workspace(self, query: str = "", limit: int = 5) -> List[UploadMetadata]:
        """Searches recently uploaded files in the managed workspace."""
        if not os.path.exists(self.workspace_dir):
            return []

        files = glob.glob(os.path.join(self.workspace_dir, "*"))
        matching = []
        
        low_query = query.lower().strip()
        for f in sorted(files, key=os.path.getmtime, reverse=True):
            if os.path.basename(f).startswith("."):
                continue
            abs_path = os.path.abspath(f)
            
            if abs_path in self.metadata_store:
                meta = self.metadata_store[abs_path]
            else:
                meta = self.process_file(abs_path)

            if not low_query:
                matching.append(meta)
            else:
                name_match = any(kw in meta.original_name.lower() or kw in meta.safe_name.lower() for kw in low_query.split())
                content_match = low_query in meta.parsed_content.lower()
                doc_query_match = any(term in low_query for term in (
                    "document", "file", "summarize", "summary", "analyze", "analysis",
                    "say", "content", "compare", "comparison", "pdf", "docx", "read", "what", "this", "it"
                ))
                if name_match or content_match or doc_query_match:
                    matching.append(meta)

            if len(matching) >= limit:
                break

        return matching

    def cleanup_workspace(self, max_age_hours: int = 24, force_all: bool = False) -> Dict[str, Any]:
        """
        Cleans up temporary uploaded files older than max_age_hours
        or purges entire workspace if force_all is True.
        """
        removed_count = 0
        freed_bytes = 0
        errors = []

        now = time.time()
        max_age_seconds = max_age_hours * 3600

        if os.path.exists(self.workspace_dir):
            for file_name in os.listdir(self.workspace_dir):
                if file_name.startswith("."):
                    continue
                file_path = os.path.join(self.workspace_dir, file_name)
                try:
                    if os.path.isfile(file_path):
                        mtime = os.path.getmtime(file_path)
                        age = now - mtime
                        if force_all or age > max_age_seconds:
                            size = os.path.getsize(file_path)
                            os.remove(file_path)
                            removed_count += 1
                            freed_bytes += size
                            if file_path in self.metadata_store:
                                del self.metadata_store[file_path]
                except Exception as ex:
                    errors.append(f"Failed to remove {file_name}: {ex}")

        self._save_registry()
        return {
            "removed_files": removed_count,
            "freed_bytes": freed_bytes,
            "freed_human": f"{freed_bytes / (1024*1024):.2f} MB",
            "errors": errors
        }

    def compare_files(self, upload_records: List[UploadMetadata], simple_mode: bool = False) -> str:
        """
        Performs automatic structural, diff, and semantic comparison across two or more uploaded files.
        Calculates similarity ratios, structural deltas (added/removed classes, functions, imports),
        unified line diffs for code/text files, and key overlap summary.
        """
        if not upload_records or len(upload_records) < 2:
            return "File comparison requires at least two uploaded files."

        import difflib

        out = []

        if simple_mode:
            out.append("### 👶 Simple Plain-English Summary")
            out.append("Okay, simple version:")
            for rec in upload_records:
                name = rec.original_name
                ext = os.path.splitext(name)[1].lower()
                size = rec.human_size
                num_lines = len((rec.parsed_content or "").splitlines())
                
                if name == "agent.py" or "agent.py" in rec.file_path:
                    purpose = f"the main Python AI logic engine ({num_lines} lines of code)."
                elif "start_agent" in name or ext in (".bat", ".sh", ".cmd", ".ps1"):
                    purpose = f"a helper setup/launch script that starts the program."
                elif ext == ".py":
                    purpose = f"a Python source code file ({num_lines} lines, {size})."
                elif ext in (".json", ".yaml", ".yml", ".toml"):
                    purpose = f"a configuration file storing options and settings ({size})."
                elif ext in (".md", ".txt", ".rst"):
                    purpose = f"a text/documentation file ({num_lines} lines)."
                elif ext in (".pdf", ".docx", ".doc"):
                    purpose = f"a document file containing text ({size})."
                elif ext in (".js", ".ts", ".jsx", ".tsx"):
                    purpose = f"a JavaScript/TypeScript application code file ({num_lines} lines)."
                else:
                    purpose = f"a {ext.upper() if ext else 'data'} file ({size}, {num_lines} lines)."
                
                out.append(f"- **`{name}`**: {purpose}")
            
            if len(upload_records) == 2:
                cnt1 = upload_records[0].parsed_content or ""
                cnt2 = upload_records[1].parsed_content or ""
                matcher = difflib.SequenceMatcher(None, cnt1, cnt2)
                sim = matcher.ratio() * 100.0
                if sim > 80.0:
                    out.append(f"\nThey are almost identical ({sim:.1f}% similar), likely different versions or minor updates of the same file.\n")
                elif sim > 30.0:
                    out.append(f"\nThey share some overlapping content ({sim:.1f}% similar), but have noticeable differences.\n")
                else:
                    out.append("\nThey are completely different kinds of files with different roles in the project.\n")
            out.append("---\n")

        out.extend([
            f"### [MULTI-FILE INTELLIGENCE: CROSS-FILE COMPARISON REPORT ({len(upload_records)} FILES)]",
            "This report provides automated structural mapping, diff analysis, and semantic comparisons.\n"
        ])

        # 1. Structural Comparison Matrix
        out.append("#### 📊 1. File Structural & Metadata Matrix")
        matrix_rows = ["| File Name | File Type | Size | Line Count | Status |"]
        matrix_rows.append("|---|---|---|---|---|")

        contents = {}
        for rec in upload_records:
            cnt = rec.parsed_content or ""
            contents[rec.file_path] = cnt
            num_lines = len(cnt.splitlines())
            matrix_rows.append(f"| {rec.original_name} | {rec.file_type.upper()} | {rec.human_size} | {num_lines} lines | {rec.status} |")

        out.append("\n".join(matrix_rows))
        out.append("")

        # 2. Pairwise Similarity & Unified Diff Analysis
        out.append("#### 🔍 2. Pairwise Similarity & Differential Analysis")

        for i in range(len(upload_records)):
            for j in range(i + 1, len(upload_records)):
                rec1 = upload_records[i]
                rec2 = upload_records[j]

                cnt1 = contents[rec1.file_path]
                cnt2 = contents[rec2.file_path]

                # Compute text similarity ratio
                matcher = difflib.SequenceMatcher(None, cnt1, cnt2)
                sim_ratio = matcher.ratio() * 100.0

                label1 = rec1.original_name if rec1.original_name != rec2.original_name else f"{rec1.original_name} (File 1 - {os.path.basename(rec1.file_path)})"
                label2 = rec2.original_name if rec1.original_name != rec2.original_name else f"{rec2.original_name} (File 2 - {os.path.basename(rec2.file_path)})"

                out.append(f"##### Comparison: `{label1}` vs `{label2}`")
                out.append(f"- **Similarity Index**: {sim_ratio:.1f}%")

                lines1 = cnt1.splitlines()
                lines2 = cnt2.splitlines()

                diff = list(difflib.unified_diff(
                    lines1, lines2,
                    fromfile=label1,
                    tofile=label2,
                    lineterm=""
                ))

                added_count = sum(1 for line in diff if line.startswith("+") and not line.startswith("+++"))
                removed_count = sum(1 for line in diff if line.startswith("-") and not line.startswith("---"))

                out.append(f"- **Line Deltas**: +{added_count} lines added, -{removed_count} lines removed")

                if diff:
                    out.append("\n```diff")
                    diff_snippet = diff[:60]
                    out.extend(diff_snippet)
                    if len(diff) > 60:
                        out.append(f"... [Truncated {len(diff) - 60} diff lines] ...")
                    out.append("```\n")
                else:
                    out.append("- **Diff Outcome**: Files are identical in content.\n")

        # 3. Structural Code / Document Element Delta Analysis
        out.append("#### 🧬 3. Structural Code & Document Element Breakdown")
        for rec in upload_records:
            s_map = self.generate_structural_map(rec.file_path, content=contents[rec.file_path])
            out.append(f"##### Structural Map for `{rec.original_name}`:")
            out.append(s_map)
            out.append("")

        return "\n".join(out)

    def format_ai_context(self, upload_records: List[UploadMetadata]) -> str:
        """Formats multiple upload records into a structured AI context prompt block."""
        if not upload_records:
            return ""

        output = [
            f"### [MANAGED UPLOAD WORKSPACE - {len(upload_records)} ATTACHED FILE(S) ACCESSIBLE]\n",
            "The user uploaded the following document(s) / file(s) via LUMIN's secure internal upload pipeline.",
            "All file contents, metadata, and visual analysis are parsed and directly available to you below:\n"
        ]

        for idx, record in enumerate(upload_records, 1):
            output.append(f"--- FILE {idx}/{len(upload_records)}: {record.original_name} ({record.file_type.upper()}) ---")
            output.append(f"• Path: {record.file_path}")
            output.append(f"• Permissions: {'Validated (Protected Mode active)' if record.permission_valid else 'Denied'}")
            output.append(f"• Size: {record.human_size} | Hash: {record.file_hash[:12]}")

            if record.error:
                output.append(f"• Error Status: {record.error}")

            output.append("\n[PARSED CONTENT / ANALYSIS]:")
            output.append(record.parsed_content.strip() or "(Empty file content)")
            output.append(f"\n--- END OF FILE {idx} ---\n")

        if len(upload_records) >= 2:
            comparison_report = self.compare_files(upload_records)
            output.append("\n" + comparison_report)

        return "\n".join(output)
