"""
Local-First Single-Controller TTS Engine for LUMIN AI Agent.
Enforces strict single-engine speech playback lock, cancellation, queue management,
duplicate speech prevention, engine availability checks, and offline fallback.
"""

import os
import sys
import logging
import asyncio
import tempfile
import subprocess
import threading
import time
import shutil
import hashlib
import socket
import urllib.request
import re
from typing import Optional, Dict, Any, List

logger = logging.getLogger("LUMIN.Audio.TTS")

def sanitize_text_for_tts(text: str) -> str:
    """
    Intelligently sanitizes text before speech synthesis by stripping Markdown formatting,
    code blocks, HTML tags, links, emojis, and unwanted formatting symbols.
    Ensures spoken output reads cleanly, naturally, and conversationally without announcing
    symbols like 'hashtag', 'asterisk', 'bullet', 'backtick', or URLs.
    """
    if not text:
        return ""

    clean = str(text)

    # 1. Remove <thought>...</thought> tags and XML/HTML tags
    clean = re.sub(r'<thought>[\s\S]*?(?:</thought>|$)', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'<[^>]+>', ' ', clean)

    # 2. Handle fenced code blocks (```code```)
    def _replace_code_block(match):
        content = match.group(0)
        lines = [l.strip() for l in content.splitlines() if l.strip() and not l.strip().startswith('```')]
        if len(lines) > 3 or len(content) > 150:
            return " Code snippet omitted. "
        return " " + ". ".join(lines) + ". "

    clean = re.sub(r'```[\s\S]*?```', _replace_code_block, clean)

    # 3. Remove inline code backticks: `code` -> code
    clean = re.sub(r'`([^`]+)`', r'\1', clean)

    # 4. Convert markdown links: [text](url) -> text
    clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)

    # 5. Remove standalone URLs (http://..., https://...)
    clean = re.sub(r'https?://\S+', '', clean, flags=re.IGNORECASE)

    # 6. Remove Markdown headings: # Heading, ## Heading -> Heading.
    clean = re.sub(r'^[ \t]*#{1,6}[ \t]+(.*)$', r'\1.', clean, flags=re.MULTILINE)

    # 7. Remove horizontal rules: ---, ***, ___
    clean = re.sub(r'^[ \t]*[-*_]{3,}[ \t]*$', '', clean, flags=re.MULTILINE)

    # 8. Remove blockquotes prefix: > quote -> quote
    clean = re.sub(r'^[ \t]*>[ \t]*', '', clean, flags=re.MULTILINE)

    # 9. Remove Markdown tables formatting: | col | col |
    def _replace_table_line(match):
        line = match.group(0)
        if '---' in line:
            return ''
        cells = [c.strip() for c in line.split('|') if c.strip()]
        return ", ".join(cells) + "." if cells else ''

    clean = re.sub(r'^[ \t]*\|.*?\|[ \t]*$', _replace_table_line, clean, flags=re.MULTILINE)

    # 10. Clean up bullet points & numbered lists
    clean = re.sub(r'^[ \t]*[*+\-•][ \t]+', '', clean, flags=re.MULTILINE)
    clean = re.sub(r'^[ \t]*(\d+)\.[ \t]+', r'\1, ', clean, flags=re.MULTILINE)

    # 11. Remove bold, italic, strikethrough markers: **text**, *text*, __text__, _text_, ~~text~~
    clean = re.sub(r'\~\~([^\~]+)\~\~', r'\1', clean)
    clean = re.sub(r'\*\*([^*]+)\*\*', r'\1', clean)
    clean = re.sub(r'\*([^*]+)\*', r'\1', clean)
    clean = re.sub(r'__([^_]+)__', r'\1', clean)
    clean = re.sub(r'_([^_]+)_', r'\1', clean)

    # 12. Replace symbols and arrows with readable words
    clean = re.sub(r'->|=>', ' to ', clean)
    clean = re.sub(r'<-|<=', ' from ', clean)
    clean = re.sub(r'&', ' and ', clean)

    # 13. Strip remaining raw formatting / markdown characters (# * _ ~ ` | \ ^ < > { } [ ])
    clean = re.sub(r'[#*_~`|\\^<>{}\[\]]', ' ', clean)

    # 14. Remove emojis / non-ASCII unicode symbols that TTS mispronounces
    clean = re.sub(r'[\U0001F300-\U0001F9FF\u2600-\u26FF\u2700-\u27BF]', '', clean)

    # 15. Normalize spaces, newlines, and punctuation
    clean = re.sub(r'[ \t]+', ' ', clean)
    clean = re.sub(r'(\s*[\r\n]\s*)+', '. ', clean)
    clean = re.sub(r'\.{2,}', '.', clean)
    clean = re.sub(r'\s+([.,!?])', r'\1', clean)

    return clean.strip()

class LocalTTSEngine:
    """Primary single-controller TTS engine manager."""

    def __init__(self, config: Optional[Dict[str, Any]] = None, tts_cache: Any = None):
        self.config = config or {}
        self.tts_cache = tts_cache
        self.engine_type = self.config.get("tts_engine", "auto") or "auto"
        self.voice = self.config.get("tts_voice", "en_US-lessac-medium")
        self.allow_cloud = self.config.get("tts_allow_cloud_fallback", True)
        self.auto_fallback = self.config.get("tts_auto_fallback", True)
        self.piper_path = self.config.get("piper_path", "piper")

        # Concurrency, state locking & process tracking
        self._playback_lock = threading.RLock()
        self._process_lock = threading.Lock()
        self._active_processes = set()
        self._is_playing = False
        self._cancelled = False

        # Duplicate detection tracking
        self._last_spoken_hash = None
        self._last_spoken_time = 0.0

    def check_internet_connection(self) -> bool:
        """Fast connectivity check to verify if cloud APIs (Edge-TTS) are reachable."""
        # Method 1: Fast socket connect to primary DNS servers (1.1.1.1, 8.8.8.8)
        for host in ("1.1.1.1", "8.8.8.8"):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1.0)
                s.connect((host, 53))
                s.close()
                return True
            except Exception:
                pass

        # Method 2: HTTP check fallback
        try:
            req = urllib.request.Request("https://www.google.com", headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=1.0) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass

        return False

    def is_engine_available(self, engine: str) -> bool:
        """Verifies binary, library, or network availability for a given engine."""
        eng = engine.lower().strip()
        if eng in ("edge_tts", "cloud", "edge"):
            try:
                import edge_tts  # type: ignore # noqa: F401
                has_pkg = True
            except ImportError:
                has_pkg = shutil.which("edge-tts") is not None
            return has_pkg and self.check_internet_connection()

        if eng in ("local_piper", "piper"):
            piper_bin = shutil.which(self.piper_path) or (os.path.exists(self.piper_path) if os.path.isabs(self.piper_path) else None)
            return piper_bin is not None

        if eng in ("os_native", "native"):
            if sys.platform == "win32":
                return shutil.which("powershell") is not None or os.path.exists(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe")
            elif sys.platform == "darwin":
                return shutil.which("say") is not None
            else:
                return shutil.which("espeak") is not None or shutil.which("spd-say") is not None

        return False

    def get_candidate_engines(self) -> List[str]:
        """
        Determines ordered candidate engines according to user settings and fallback policy.
        
        CRITICAL RULES:
        1. Default resolution order when tts_engine is "auto" or unset:
           - edge_tts (if internet available AND edge_tts installed)
           - local_piper (if piper binary/model available)
           - os_native (Windows SAPI / macOS say / Linux espeak)
        2. If user explicitly set tts_engine to local_piper or os_native -> Edge TTS is NEVER included in candidates!
        """
        norm = str(self.engine_type or "auto").lower().strip()

        # Local mode 1: Piper explicitly requested
        if norm in ("local_piper", "piper", "piper local"):
            candidates = ["local_piper"]
            if self.auto_fallback:
                candidates.append("os_native")
            return candidates

        # Local mode 2: OS Native explicitly requested
        if norm in ("os_native", "native", "windows native", "os native"):
            return ["os_native"]

        # Cloud mode: Edge TTS explicitly requested
        if norm in ("edge_tts", "cloud", "edge", "microsoft edge tts"):
            candidates = ["edge_tts"]
            if self.auto_fallback:
                candidates.extend(["local_piper", "os_native"])
            return candidates

        # Auto mode / Unset / Default:
        # 1. edge_tts (if internet available)
        # 2. local_piper
        # 3. os_native
        if self.allow_cloud and self.check_internet_connection():
            return ["edge_tts", "local_piper", "os_native"]
        else:
            return ["local_piper", "os_native"]

    def cancel_playback(self):
        """Cancels and immediately stops any ongoing synthesis or speech playback subprocesses."""
        self._cancelled = True
        with self._process_lock:
            for proc in list(self._active_processes):
                try:
                    proc.terminate()
                    proc.wait(timeout=0.3)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
            self._active_processes.clear()
        with self._playback_lock:
            self._is_playing = False

    def _is_duplicate(self, text: str) -> bool:
        """Prevents duplicate speech requests from being executed repeatedly back-to-back."""
        text_hash = hashlib.md5(text.strip().encode("utf-8")).hexdigest()
        now = time.time()
        if text_hash == self._last_spoken_hash and (now - self._last_spoken_time) < 1.0:
            return True
        return False

    def speak_text(self, text: str, voice: Optional[str] = None, tts_cache: Any = None) -> bool:
        """
        Synchronously speaks text using a SINGLE TTS engine per response.
        Enforces strict engine locking, queue management, cancellation, duplicate prevention,
        and priority fallback.
        """
        if not text or not text.strip():
            return False

        clean_text = sanitize_text_for_tts(text)
        if not clean_text:
            return False

        # Prevent duplicate speech repetition
        if self._is_duplicate(clean_text):
            logger.info("Duplicate speech request within threshold ignored.")
            return True

        # Stop any active playback prior to new speech
        self.cancel_playback()
        self._cancelled = False

        with self._playback_lock:
            self._is_playing = True
            try:
                # Update duplicate tracking
                self._last_spoken_hash = hashlib.md5(clean_text.encode("utf-8")).hexdigest()
                self._last_spoken_time = time.time()

                effective_voice = voice or self.voice or "en_US-lessac-medium"
                cache_mgr = tts_cache or self.tts_cache

                # Step 1: Check audio cache
                if cache_mgr:
                    cached_file = cache_mgr.get_cached_audio(clean_text, voice=effective_voice)
                    if cached_file and os.path.exists(cached_file):
                        logger.info(f"TTS Cache HIT: '{clean_text[:30]}...' -> {cached_file}")
                        if self._play_audio_file(cached_file):
                            return True

                # Step 2: Resolve candidate engine order
                candidates = self.get_candidate_engines()
                logger.info(f"TTS Candidate Engine Queue: {candidates}")

                # Step 3: Execute candidate engines sequentially until ONE succeeds
                for engine in candidates:
                    if self._cancelled:
                        logger.info("Speech playback cancelled prior to engine execution.")
                        return False

                    if not self.is_engine_available(engine):
                        logger.debug(f"TTS Engine '{engine}' unavailable or offline. Skipping...")
                        continue

                    logger.info(f"Executing TTS Engine: '{engine}'")
                    success = False

                    if engine == "edge_tts":
                        success = self._speak_with_edge_tts(clean_text, voice=effective_voice, cache_mgr=cache_mgr)
                    elif engine == "local_piper":
                        success = self._speak_with_piper(clean_text, voice=effective_voice, cache_mgr=cache_mgr)
                    elif engine == "os_native":
                        success = self._speak_with_os_native(clean_text)

                    if success:
                        # EXACTLY ONE engine executes and succeeds per response!
                        logger.info(f"TTS Speech completed successfully using engine: '{engine}'")
                        return True

                logger.warning("All candidate TTS engines failed or were unavailable.")
                return False
            finally:
                self._is_playing = False

    def _speak_with_edge_tts(self, text: str, voice: str, cache_mgr: Any = None) -> bool:
        """Synthesizes speech using Microsoft Edge Neural TTS."""
        try:
            import edge_tts  # type: ignore

            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tf:
                mp3_path = tf.name

            async def _async_edge():
                v = voice if ("-" in voice and "Neural" in voice) else "en-US-JennyNeural"
                communicate = edge_tts.Communicate(text, v)
                await communicate.save(mp3_path)

            def _thread_worker():
                loop = asyncio.new_event_loop()
                try:
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(_async_edge())
                finally:
                    loop.close()

            t = threading.Thread(target=_thread_worker, daemon=True)
            t.start()
            t.join(timeout=15)

            if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 100:
                if cache_mgr:
                    try:
                        with open(mp3_path, "rb") as f:
                            data = f.read()
                        cache_mgr.store_audio_cache(text, data, voice=voice)
                    except Exception as ce:
                        logger.debug(f"Failed storing Edge-TTS audio in cache: {ce}")

                played = self._play_audio_file(mp3_path)
                try:
                    os.remove(mp3_path)
                except Exception:
                    pass
                return played
        except Exception as e:
            logger.error(f"Edge-TTS synthesis failed: {e}")
        return False

    def _speak_with_piper(self, text: str, voice: str, cache_mgr: Any = None) -> bool:
        """Synthesizes speech using local Piper ONNX binary."""
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
                wav_path = tf.name

            cmd = [self.piper_path, "--model", voice, "--output_file", wav_path]
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            with self._process_lock:
                self._active_processes.add(proc)
            try:
                proc.communicate(input=text.encode("utf-8"), timeout=12)
            finally:
                with self._process_lock:
                    self._active_processes.discard(proc)

            if os.path.exists(wav_path) and os.path.getsize(wav_path) > 100:
                if cache_mgr:
                    try:
                        with open(wav_path, "rb") as f:
                            data = f.read()
                        cache_mgr.store_audio_cache(text, data, voice=voice)
                    except Exception as ce:
                        logger.debug(f"Failed storing Piper audio in cache: {ce}")

                played = self._play_audio_file(wav_path)
                try:
                    os.remove(wav_path)
                except Exception:
                    pass
                return played
        except Exception as e:
            logger.debug(f"Piper local synthesis failed: {e}")
        return False

    def _speak_with_os_native(self, text: str) -> bool:
        """Synthesizes speech directly using OS-native TTS tools (Windows SAPI5, macOS say, Linux espeak)."""
        try:
            if sys.platform == "win32":
                clean_text = text.replace('"', '""').replace("'", "''")
                ps_script = (
                    f'Add-Type -AssemblyName System.Speech; '
                    f'$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; '
                    f'$synth.Speak("{clean_text}")'
                )
                proc = subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_script])
            elif sys.platform == "darwin":
                proc = subprocess.Popen(["say", text])
            else:
                proc = subprocess.Popen(["espeak", text])

            with self._process_lock:
                self._active_processes.add(proc)
            try:
                ret = proc.wait(timeout=30)
                return ret == 0
            finally:
                with self._process_lock:
                    self._active_processes.discard(proc)
        except Exception as e:
            logger.debug(f"OS native TTS failed: {e}")
        return False

    def _play_audio_file(self, file_path: str) -> bool:
        """Plays an audio file (WAV/MP3) using system-native headless players with process tracking."""
        if not os.path.exists(file_path):
            return False

        try:
            played = False
            if sys.platform == "win32":
                clean_path = file_path.replace("'", "''")
                ps_cmd = (
                    f"Add-Type -AssemblyName PresentationCore; "
                    f"$player = New-Object System.Windows.Media.MediaPlayer; "
                    f"$player.Open('{clean_path}'); "
                    f"Start-Sleep -Milliseconds 200; "
                    f"$player.Play(); "
                    f"Start-Sleep -Milliseconds 200; "
                    f"$timeout = 45; "
                    f"while ($timeout -gt 0) {{ "
                    f"  if ($player.NaturalDuration.HasTimeSpan) {{ "
                    f"    if ($player.Position -ge $player.NaturalDuration.TimeSpan) {{ break; }} "
                    f"  }} "
                    f"  Start-Sleep -Milliseconds 150; "
                    f"  $timeout -= 0.15; "
                    f"}}; "
                    f"$player.Close();"
                )
                proc = subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                with self._process_lock:
                    self._active_processes.add(proc)
                try:
                    ret = proc.wait(timeout=45)
                    played = (ret == 0)
                finally:
                    with self._process_lock:
                        self._active_processes.discard(proc)

            elif sys.platform == "darwin":
                proc = subprocess.Popen(["afplay", file_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                with self._process_lock:
                    self._active_processes.add(proc)
                try:
                    ret = proc.wait(timeout=45)
                    played = (ret == 0)
                finally:
                    with self._process_lock:
                        self._active_processes.discard(proc)

            else:
                for player in ["mpv", "mpg123", "ffplay", "paplay", "aplay"]:
                    if shutil.which(player):
                        cmd = [player, file_path]
                        if player == "ffplay":
                            cmd = ["ffplay", "-nodisp", "-autoexit", file_path]
                        
                        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        with self._process_lock:
                            self._active_processes.add(proc)
                        try:
                            ret = proc.wait(timeout=45)
                            if ret == 0:
                                played = True
                                break
                        finally:
                            with self._process_lock:
                                self._active_processes.discard(proc)

            return played
        except Exception as e:
            logger.debug(f"Audio playback error: {e}")
            return False

