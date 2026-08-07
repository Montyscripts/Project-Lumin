import os
import hashlib
import json
import logging
import threading

logger = logging.getLogger("lumin.audio")

class TTSCacheManager:
    """
    Manages TTS audio caching. Matches input text to previously generated WAV files.
    Ensures that identical speech responses do not invoke duplicate API calls.
    Features:
    - Text hash-based file naming
    - Cache manifest tracking
    - Simple LRU (Least Recently Used) cache pruning to prevent storage bloat
    """
    def __init__(self, cache_dir="tts_cache", max_cache_entries=50):
        self.cache_dir = cache_dir
        self.max_cache_entries = max_cache_entries
        self.manifest_path = os.path.join(cache_dir, "manifest.json")
        self.cache_map = {} # Maps MD5 hash of text -> filename
        self.usage_history = [] # Tracks order of accesses for LRU
        self._lock = threading.RLock()
        
        # Ensure cache directory exists
        if not os.path.exists(cache_dir):
            try:
                os.makedirs(cache_dir)
            except Exception as e:
                logger.error(f"Failed to create cache directory: {e}")

        self.load_manifest()

    def _get_hash(self, text, voice="Kore"):
        """Generates a unique MD5 hash for the text and voice combination."""
        combined = f"{voice}:{text.strip()}"
        return hashlib.md5(combined.encode("utf-8")).hexdigest()

    def load_manifest(self):
        """Loads manifest file detailing existing cached items."""
        with self._lock:
            if os.path.exists(self.manifest_path):
                try:
                    with open(self.manifest_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.cache_map = data.get("cache_map", {})
                        self.usage_history = data.get("usage_history", [])
                    logger.info(f"Loaded TTS cache manifest with {len(self.cache_map)} entries.")
                except Exception as e:
                    logger.error(f"Error loading TTS manifest: {e}")
                    self.cache_map = {}
                    self.usage_history = []
            else:
                self.cache_map = {}
                self.usage_history = []

    def save_manifest(self):
        """Saves current state of cached items to the manifest file."""
        with self._lock:
            try:
                data = {
                    "cache_map": self.cache_map,
                    "usage_history": self.usage_history
                }
                with open(self.manifest_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                logger.error(f"Failed to save TTS cache manifest: {e}")

    def get_cached_audio(self, text, voice="Kore"):
        """Checks if audio is already cached, updating LRU access sequence on hit."""
        with self._lock:
            text_hash = self._get_hash(text, voice)
            if text_hash in self.cache_map:
                filename = self.cache_map[text_hash]
                filepath = os.path.join(self.cache_dir, filename)
                
                if os.path.exists(filepath):
                    # Update LRU order
                    if text_hash in self.usage_history:
                        self.usage_history.remove(text_hash)
                    self.usage_history.append(text_hash)
                    self.save_manifest()
                    
                    logger.info(f"TTS Cache HIT for text: '{text[:30]}...' -> {filename}")
                    return filepath
                else:
                    # File missing, remove stale entry from manifest
                    del self.cache_map[text_hash]
                    if text_hash in self.usage_history:
                        self.usage_history.remove(text_hash)
                    self.save_manifest()
                    
            return None

    def store_audio_cache(self, text, audio_data, voice="Kore"):
        """Stores raw bytes of a WAV audio file into cache directory, enforcing LRU bounds."""
        with self._lock:
            text_hash = self._get_hash(text, voice)
            filename = f"{text_hash}.wav"
            filepath = os.path.join(self.cache_dir, filename)

            try:
                with open(filepath, "wb") as f:
                    f.write(audio_data)
                
                # Update manifest
                self.cache_map[text_hash] = filename
                if text_hash in self.usage_history:
                    self.usage_history.remove(text_hash)
                self.usage_history.append(text_hash)
                
                logger.info(f"TTS Cache STORE for text: '{text[:30]}...' -> {filename}")
                
                # Enforce cache size limits
                self._prune_cache()
                self.save_manifest()
                
                return filepath
            except Exception as e:
                logger.error(f"Failed to store audio in TTS cache: {e}")
                return None

    def _prune_cache(self):
        """Removes Least Recently Used cache entries if total size exceeds 500MB or count exceeds limits."""
        max_size_bytes = 500 * 1024 * 1024 # 500MB
        
        # Calculate total size once at the start of pruning
        total_size = 0
        if os.path.exists(self.cache_dir):
            for name in os.listdir(self.cache_dir):
                filepath = os.path.join(self.cache_dir, name)
                if os.path.isfile(filepath):
                    try:
                        total_size += os.path.getsize(filepath)
                    except Exception:
                        pass

        while (total_size > max_size_bytes or len(self.cache_map) > self.max_cache_entries) and self.usage_history:
            lru_hash = self.usage_history.pop(0)
            if lru_hash in self.cache_map:
                filename = self.cache_map[lru_hash]
                filepath = os.path.join(self.cache_dir, filename)
                
                file_size = 0
                if os.path.exists(filepath):
                    try:
                        file_size = os.path.getsize(filepath)
                        os.remove(filepath)
                        logger.info(f"Pruned stale cache file due to limit: {filename}")
                    except Exception as e:
                        logger.error(f"Failed to delete pruned cache file {filename}: {e}")
                
                total_size -= file_size
                del self.cache_map[lru_hash]
