import unittest
import os
import shutil
from pathlib import Path
from core.agent import Agent
from core.upload_pipeline import UploadPipeline, UploadMetadata

class TestAnalyzeAndWriteSummary(unittest.TestCase):
    def setUp(self):
        self.agent = Agent()
        # Set up a test upload record simulating an uploaded PDF
        desktop_dir = str(Path.home() / "Desktop")
        os.makedirs(desktop_dir, exist_ok=True)
        
        self.target_file = os.path.join(desktop_dir, "lumin_summary.txt")
        if os.path.exists(self.target_file):
            os.remove(self.target_file)

        # Populate upload pipeline with a sample PDF document
        sample_pdf_text = (
            "LUMIN Architecture Executive Summary\n\n"
            "Point 1: LUMIN implements a dual-layer cognitive architecture combining fast heuristic dispatch with structured reasoning.\n"
            "Point 2: The system enforces sandboxed file operations and interactive confirmation gates for destructive system modifications.\n"
            "Point 3: Comprehensive multi-modal upload ingestion pipelines process documents, images, and audio directly into agent working memory.\n"
            "Additional context: LUMIN runs fully locally on consumer workstations with minimal latency."
        )
        sample_file_path = "/tmp/sample_lumin_architecture.pdf"
        with open(sample_file_path, "w", encoding="utf-8") as f:
            f.write(sample_pdf_text)

        rec = UploadMetadata(
            upload_id="up-123",
            original_name="sample_lumin_architecture.pdf",
            safe_name="sample_lumin_architecture.pdf",
            file_path=sample_file_path,
            file_size=len(sample_pdf_text),
            mime_type="application/pdf",
            file_type="pdf",
            upload_time="2026-08-13T20:00:00Z",
            file_hash="hash123",
            parsed_content=sample_pdf_text
        )
        self.agent.upload_pipeline.metadata_store[rec.upload_id] = rec
        self.agent.last_analyzed_file = rec.file_path
        self.agent.last_analyzed_content = rec.parsed_content

    def tearDown(self):
        if os.path.exists(self.target_file):
            os.remove(self.target_file)
        if os.path.exists("/tmp/sample_lumin_architecture.pdf"):
            os.remove("/tmp/sample_lumin_architecture.pdf")

    def test_combined_analyze_pdf_and_write_desktop_file(self):
        query = (
            "Analyze the most recently uploaded PDF, extract the three most important points, "
            "write them into a new text file on the Desktop called lumin_summary.txt, "
            "then tell me the full path of the file you created."
        )
        
        response = self.agent.process_query(query)
        self.assertIsNotNone(response)
        
        # 1. File must actually exist on Desktop
        self.assertTrue(os.path.exists(self.target_file), f"File {self.target_file} was not created!")
        
        # 2. File must contain extracted content
        with open(self.target_file, "r", encoding="utf-8") as f:
            file_content = f.read()
        self.assertGreater(len(file_content), 30)
        self.assertTrue("Point 1" in file_content or "LUMIN" in file_content)

        # 3. Response must confirm full path
        self.assertIn(self.target_file, response)
        
        # 4. Must not stop at confirmation prompt
        self.assertNotIn("Would you like me to proceed?", response)

    def test_intent_detection(self):
        query = "Analyze the most recently uploaded PDF, extract the three most important points, write them into a new text file on the Desktop called lumin_summary.txt, then tell me the full path of the file you created."
        self.assertTrue(self.agent._is_analyze_and_write_file_intent(query.lower(), query))

if __name__ == "__main__":
    unittest.main()
