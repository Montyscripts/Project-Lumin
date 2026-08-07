"""
Unit test suite for LUMIN AI Agent's long-form writing generation system.
Tests Ollama generation priority, section chunking, anti-repetition set tracking,
and offline domain synthesis.
"""

import unittest
import re
from unittest.mock import MagicMock
from core.writing import WritingGenerator

class TestLongFormWritingGenerator(unittest.TestCase):
    def setUp(self):
        self.gen_offline = WritingGenerator(ollama_client=None)

    def test_anti_repetition_10_paragraphs_renewable_energy(self):
        intent = self.gen_offline.classify_intent("Generate 10 paragraphs about renewable energy in Notepad")
        self.assertEqual(intent["paragraph_count"], 10)
        
        content = self.gen_offline.generate_content(intent)
        paras = [p.strip() for p in content.split("\n\n") if p.strip()]
        self.assertEqual(len(paras), 10)

        # Extract all normalized sentences
        sentences = []
        for p in paras:
            s_list = re.split(r'(?<=[.!?])\s+', p)
            for s in s_list:
                s_norm = re.sub(r'[^a-z0-9]', '', s.lower())
                if len(s_norm) > 10:
                    sentences.append(s_norm)

        # Assert ZERO duplicate sentences across the entire 10 paragraphs
        unique_sentences = set(sentences)
        self.assertEqual(len(sentences), len(unique_sentences), "Found duplicate sentences in 10-paragraph document!")

    def test_20_paragraphs_book_chapter_generation(self):
        intent = self.gen_offline.classify_intent("Write a book chapter about Quantum Computing")
        self.assertEqual(intent["paragraph_count"], 20)

        content = self.gen_offline.generate_content(intent)
        paras = [p.strip() for p in content.split("\n\n") if p.strip()]
        self.assertEqual(len(paras), 20)

        sentences = []
        for p in paras:
            s_list = re.split(r'(?<=[.!?])\s+', p)
            for s in s_list:
                s_norm = re.sub(r'[^a-z0-9]', '', s.lower())
                if len(s_norm) > 10:
                    sentences.append(s_norm)

        unique_sentences = set(sentences)
        self.assertEqual(len(sentences), len(unique_sentences), "Found duplicate sentences in 20-paragraph book chapter!")

    def test_non_technical_topic_generation_without_engineering_jargon(self):
        """Verifies that non-technical topics (e.g. gay sex / relationships) do NOT hallucinate engineering/technical jargon."""
        intent = self.gen_offline.classify_intent("Open Notepad and write an essay on gay sex")
        self.assertEqual(intent["topic"], "gay sex")

        content = self.gen_offline.generate_content(intent)
        low_content = content.lower()

        # Check that topic keywords are present
        self.assertTrue("gay" in low_content or "sex" in low_content or "sexuality" in low_content)

        # Check that NO fake engineering jargon is hallucinated
        spurious_terms = [
            "industrial deployment", "thermal fluctuations", "hardware abstractions",
            "atomic and molecular interactions", "semiconductor crystals", "photovoltaic solar generation",
            "superconducting lc circuits", "josephson junctions", "dilution refrigerators"
        ]
        for term in spurious_terms:
            self.assertNotIn(term, low_content, f"Found unexpected engineering term '{term}' in non-technical essay!")

    def test_semantic_topic_validator(self):
        """Tests the SemanticTopicValidator for detecting domain hallucinations and topic mismatches."""
        from core.writing import SemanticTopicValidator

        # 1. Valid non-tech essay
        valid_text = "Exploring the multifaceted nature of human relationships offers vital insight into identity, social connection, and personal expression."
        valid, msg = SemanticTopicValidator.validate(valid_text, "human relationships", "human_social")
        self.assertTrue(valid, f"Validation failed unexpectedly: {msg}")

        # 2. Spurious engineering jargon on non-tech topic
        invalid_tech_text = "Writing about human relationships requires examining atomic and molecular interactions and thermal fluctuations during industrial deployment."
        valid_spurious, msg_spurious = SemanticTopicValidator.validate(invalid_tech_text, "human relationships", "human_social")
        self.assertFalse(valid_spurious, "Validator failed to flag spurious engineering jargon!")
        self.assertIn("Domain hallucination detected", msg_spurious)

    def test_ollama_chunked_generation_priority(self):
        mock_ollama = MagicMock()
        mock_ollama.generate_content.side_effect = lambda prompt, system_instruction=None: (
            f"Paragraph 1 for {prompt[:30]}.\n\nParagraph 2 for {prompt[:30]}."
        )

        gen_ollama = WritingGenerator(ollama_client=mock_ollama)
        gen_ollama._is_ollama_available = MagicMock(return_value=True)

        intent = gen_ollama.classify_intent("Write 10 paragraphs about Artificial Intelligence")
        content = gen_ollama.generate_content(intent)

        self.assertTrue(mock_ollama.generate_content.called)
        paras = [p.strip() for p in content.split("\n\n") if p.strip()]
        self.assertGreaterEqual(len(paras), 5)

if __name__ == "__main__":
    unittest.main()
