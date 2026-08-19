import os
import json
import time
import logging
import threading

logger = logging.getLogger("lumin.memory")

class MemoryManager:
    """
    Manages long-term agent memory and short-term conversation context.
    Features:
    - Persistent memory storage in 'agent_memory.json'
    - Sliding window for short-term chat context
    - Automatic conversation summarization to compress older context
    - Vector search (semantic retrieval) using local Ollama embeddings and pure-Python cosine similarity
    - Keyword/substring backup search when embeddings are unavailable
    """
    def __init__(self, memory_file="agent_memory.json", max_context_turns=10, client=None, filepath=None, **kwargs):
        self.memory_file = filepath or memory_file
        self.max_context_turns = max_context_turns
        self.client = client  # OllamaClient reference (optional, for embeddings)
        self.lock = threading.Lock()
        
        # Load long-term memory and history
        self.memories = []          # List of dicts: {"text": str, "timestamp": float, "embedding": list}
        self.short_term_context = [] # List of {"speaker": "user"|"ai", "text": str}
        self.summary = ""           # Running summary of older messages
        
        self.load_memories()

    def add_memory(self, text):
        """Alias for store_long_term_memory."""
        return self.store_long_term_memory(text)

    def get_relevant_memories(self, query, limit=3):
        """Alias for search_memories returning formatted text."""
        mem_dicts = self.search_memories(query, limit=limit)
        return "\n".join([m.get("text", "") for m in mem_dicts]) if isinstance(mem_dicts, list) else str(mem_dicts)


    def load_memories(self):
        """Loads memories from agent_memory.json if it exists."""
        with self.lock:
            if os.path.exists(self.memory_file):
                try:
                    with open(self.memory_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.memories = data.get("memories", [])
                        self.short_term_context = data.get("short_term_context", [])
                        self.summary = data.get("summary", "")
                    logger.info(f"Loaded {len(self.memories)} long-term memories and {len(self.short_term_context)} context items.")
                except Exception as e:
                    logger.error(f"Failed to load memory file: {e}")
                    self.memories = []
                    self.short_term_context = []
                    self.summary = ""
            else:
                logger.info("No memory file found. Initializing empty memory.")

    def save_memories(self):
        """Saves memories to agent_memory.json atomically."""
        with self.lock:
            try:
                data = {
                    "memories": self.memories,
                    "short_term_context": self.short_term_context,
                    "summary": self.summary,
                    "updated_at": time.time()
                }
                temp_file = self.memory_file + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                os.replace(temp_file, self.memory_file)
                logger.debug("Memory successfully written atomically to disk.")
            except Exception as e:
                logger.error(f"Failed to save memory file atomically: {e}")

    def add_context(self, speaker, text):
        """Adds a message to the short-term context, and checks for summarization."""
        self.short_term_context.append({
            "speaker": speaker,
            "text": text,
            "timestamp": time.time()
        })
        
        # Auto-persist after each turn
        self.save_memories()

        # If short term context exceeds limit, trigger summarization of older entries
        if len(self.short_term_context) > self.max_context_turns * 2:
            self.compress_context()

    def compress_context(self):
        """Compresses the oldest turns of the conversation context into a running summary."""
        if not self.client:
            # Fallback without client: just slide window
            self.short_term_context = self.short_term_context[-self.max_context_turns:]
            return

        # Keep the latest N turns intact, summarize everything before that
        keep_count = self.max_context_turns
        to_summarize = self.short_term_context[:-keep_count]
        self.short_term_context = self.short_term_context[-keep_count:]

        # Create summary prompt
        turns_text = "\n".join([f"{m['speaker']}: {m['text']}" for m in to_summarize])
        prompt = (
            f"Please update the running summary of the conversation with these new dialogue turns.\n"
            f"Existing Summary: {self.summary or 'None'}\n\n"
            f"New Dialogue:\n{turns_text}\n\n"
            f"Write a concise, high-level summary that captures the key user details, preferences, "
            f"and decisions made so far. Keep it under 200 words."
        )

        try:
            logger.info("Triggering automatic context summarization...")
            updated_summary = self.client.generate_content(prompt, system_instruction="You are a helpful memory summary assistant.")
            if updated_summary and not updated_summary.startswith("Error"):
                self.summary = updated_summary.strip()
                logger.info("Successfully updated running summary.")
        except Exception as e:
            logger.debug(f"Memory context summarization skipped: {e}")
        
        self.save_memories()

    def store_long_term_memory(self, text):
        """Stores a chunk of text into long-term memory with an optional vector embedding."""
        embedding = None
        if self.client:
            try:
                embedding = self.client.get_embedding(text)
            except Exception as e:
                logger.warning(f"Failed to generate embedding for long-term memory: {e}")

        memory_item = {
            "text": text,
            "timestamp": time.time(),
            "embedding": embedding
        }
        self.memories.append(memory_item)
        self.save_memories()
        logger.info(f"Stored long-term memory: '{text[:50]}...' (Embedded: {embedding is not None})")

    def search_memories(self, query, limit=3):
        """
        Retrieves relevant long-term memories using semantic vector search.
        Falls back to keyword matching if embeddings are missing or search fails.
        """
        if not self.memories:
            return []

        # Try semantic search if query embedding is available
        if self.client:
            try:
                query_emb = self.client.get_embedding(query)
            except Exception as e:
                logger.warning(f"Semantic search embedding failed (likely model 'nomic-embed-text' not found or pulled): {e}")
                query_emb = None
            if query_emb:
                scored_memories = []
                for m in self.memories:
                    m_emb = m.get("embedding")
                    if m_emb:
                        sim = self._cosine_similarity(query_emb, m_emb)
                        scored_memories.append((sim, m))
                
                if scored_memories:
                    scored_memories.sort(key=lambda x: x[0], reverse=True)
                    # Filter for memories with a high-enough match threshold (e.g., > 0.4)
                    results = [m for score, m in scored_memories[:limit] if score > 0.45]
                    if results:
                        logger.info(f"Retrieved {len(results)} memories using semantic vector search.")
                        return results

        # Fallback: simple keyword containment and substring search
        scored_memories = []
        query_words = set(query.lower().split())
        for m in self.memories:
            text_lower = m["text"].lower()
            # Calculate match score based on word overlap
            overlap = sum(1 for w in query_words if w in text_lower)
            if overlap > 0:
                scored_memories.append((overlap, m))
                
        if scored_memories:
            scored_memories.sort(key=lambda x: x[0], reverse=True)
            results = [m for score, m in scored_memories[:limit]]
            logger.info(f"Retrieved {len(results)} memories using keyword fallback.")
            return results

        return []

    def _cosine_similarity(self, vec1, vec2):
        """Computes cosine similarity between two numeric vectors in pure Python."""
        if len(vec1) != len(vec2) or not vec1 or not vec2:
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm_a = sum(a * a for a in vec1) ** 0.5
        norm_b = sum(b * b for b in vec2) ** 0.5
        
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
            
        return dot_product / (norm_a * norm_b)

    def get_formatted_context(self):
        """Constructs a prompt friendly string representing conversation context & memory."""
        context_str = ""
        if self.summary:
            context_str += f"[COMPRESSED HISTORY SUMMARY]: {self.summary}\n\n"
        
        if self.short_term_context:
            context_str += "[RECENT DIALOGUE]:\n"
            for m in self.short_term_context:
                context_str += f"- {m['speaker'].upper()}: {m['text']}\n"
        
        return context_str
