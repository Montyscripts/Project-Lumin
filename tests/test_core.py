"""
Unit test suite for LUMIN AI Agent core modules.
Tests CapabilityRegistry, WritingGenerator, LocalTTSEngine, and security posture.
"""

import os
import unittest
from core.capabilities import CapabilityRegistry, CapabilityStatus
from core.writing import WritingGenerator
from audio.local_tts import LocalTTSEngine

class TestCapabilityRegistry(unittest.TestCase):
    def test_registry_initialization(self):
        config = {"tts_allow_cloud_fallback": False, "enable_mcp": True}
        registry = CapabilityRegistry(config)
        caps = registry.refresh()
        
        self.assertIn("local_llm", caps)
        self.assertIn("local_tts", caps)
        self.assertIn("cloud_tts", caps)
        self.assertIn("mcp_server", caps)
        
        # Verify status is reported without crashing
        self.assertIn(caps["cloud_tts"]["status"], [CapabilityStatus.DEGRADED, CapabilityStatus.UNAVAILABLE])

    def test_report_generation(self):
        registry = CapabilityRegistry({})
        report = registry.get_summary_report()
        self.assertIn("LUMIN Capability & Privacy Matrix", report)
        self.assertIn("[LOCAL]", report)

class TestWritingGenerator(unittest.TestCase):
    def setUp(self):
        self.gen = WritingGenerator(ollama_client=None)

    def test_literal_intent(self):
        intent = self.gen.classify_intent('write "Hello World" in Notepad')
        self.assertEqual(intent["type"], "LITERAL")
        self.assertEqual(intent["literal_text"], "Hello World")

    def test_generative_paragraph_count(self):
        intent = self.gen.classify_intent('Write ten paragraphs about space in Notepad')
        self.assertEqual(intent["type"], "GENERATIVE")
        self.assertEqual(intent["paragraph_count"], 10)
        self.assertEqual(intent["topic"], "space")

    def test_content_generation_no_topic_hardcoding(self):
        # Request 4 paragraphs on custom topic
        intent = {"type": "GENERATIVE", "topic": "Quantum Computing", "paragraph_count": 4, "raw_query": "Write 4 paragraphs about Quantum Computing"}
        content = self.gen.generate_content(intent)
        paras = [p.strip() for p in content.split("\n\n") if p.strip()]
        
        self.assertEqual(len(paras), 4)
        self.assertIn("Quantum Computing", content)

class TestLocalTTS(unittest.TestCase):
    def test_tts_engine_config(self):
        config = {
            "tts_engine": "local_piper",
            "tts_voice": "en_US-lessac-medium",
            "tts_allow_cloud_fallback": False
        }
        tts = LocalTTSEngine(config)
        self.assertEqual(tts.engine_type, "local_piper")
        self.assertFalse(tts.allow_cloud)

if __name__ == "__main__":
    unittest.main()
