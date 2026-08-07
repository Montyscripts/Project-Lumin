"""
Unit test suite for LUMIN AI Agent's Desktop Writing Automation Engine.
Tests destination detection, word existence check, window detection, large text support,
and verification requirement.
"""

import os
import unittest
from core.writing import WritingGenerator
from core.writing_automation import WritingAutomationEngine

class TestWritingAutomation(unittest.TestCase):
    def setUp(self):
        self.writing_gen = WritingGenerator(ollama_client=None)
        self.automation = WritingAutomationEngine(writing_generator=self.writing_gen)

    def test_destination_detection_notepad(self):
        app, note = self.automation.detect_destination("Write 10 paragraphs about computers in Notepad")
        self.assertEqual(app, "notepad")
        self.assertIsNone(note)

    def test_destination_detection_word(self):
        app, note = self.automation.detect_destination("Write an essay in Word")
        self.assertIn(app, ["word", "notepad"])
        if app == "notepad":
            self.assertIsNotNone(note)
            self.assertIn("falling", note.lower())

    def test_large_text_generation_10_paragraphs(self):
        intent = self.writing_gen.classify_intent("Write 10 paragraphs about computers in Notepad")
        self.assertEqual(intent["paragraph_count"], 10)
        content = self.writing_gen.generate_content(intent)
        paras = [p.strip() for p in content.split("\n\n") if p.strip()]
        self.assertEqual(len(paras), 10)

    def test_large_text_generation_5000_words(self):
        intent = self.writing_gen.classify_intent("Write 5,000 words about Artificial Intelligence in Word")
        self.assertGreaterEqual(intent["paragraph_count"], 25)
        content = self.writing_gen.generate_content(intent)
        words = len(content.split())
        self.assertGreater(words, 300)

    def test_book_chapter_intent(self):
        intent = self.writing_gen.classify_intent("Write a book chapter about Quantum Computing")
        self.assertEqual(intent["paragraph_count"], 20)

    def test_verification_system_pass(self):
        sample_text = "Paragraph 1 about AI.\n\nParagraph 2 about AI.\n\nParagraph 3 about AI."
        verified, msg = self.automation.verify_text_insertion("notepad", sample_text)
        self.assertTrue(verified)
        self.assertIn("Verified", msg)

    def test_verification_system_empty_fail(self):
        verified, msg = self.automation.verify_text_insertion("notepad", "")
        self.assertFalse(verified)
        self.assertIn("empty", msg.lower())

    def test_full_writing_workflow_execution(self):
        res = self.automation.execute_writing_workflow("Write 10 paragraphs about computers in Notepad")
        self.assertIn("Successfully completed writing workflow", res)
        self.assertIn("Verified", res)

    def test_20_paragraphs_document_workflow(self):
        query = "Generate 20 paragraphs about renewable energy and save it as a document."
        intent = self.writing_gen.classify_intent(query)
        self.assertEqual(intent["paragraph_count"], 20)
        self.assertEqual(intent["topic"], "renewable energy")
        res = self.automation.execute_writing_workflow(query)
        self.assertIn("Successfully completed writing workflow", res)
        self.assertIn("Verified: 20 paragraph(s)", res)
        self.assertIn("Document Path:", res)

if __name__ == "__main__":
    unittest.main()
