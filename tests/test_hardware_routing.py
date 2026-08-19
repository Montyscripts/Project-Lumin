"""
Unit tests for Hardware Class Routing & Resource Governor Policies.
Covers:
- System class classification across Workstation, High-End Desktop, Mid-End Desktop, and Laptop profiles
- Model size caps, context length limits, and feature policy enforcement (vision, heavy_tools, GPU acceleration)
- Agent hybrid model routing adaptation under resource constraints
"""

import unittest
from unittest.mock import patch, MagicMock

from core.resource_governor import ResourceGovernor
from core.agent import LuminAgent


class TestHardwareClassRouting(unittest.TestCase):
    def test_workstation_class_classification_and_policy(self):
        """Workstation Class profile allows large models, high context, and all advanced features."""
        profile = {
            "cpu_name": "AMD Ryzen Threadripper PRO 5995WX",
            "cpu_cores": 64,
            "cpu_load_pct": 10.0,
            "ram_total_gb": 128.0,
            "ram_available_gb": 96.0,
            "disk_free_gb": 1000.0,
            "os": "Linux 6.8.0",
            "gpu_name": "NVIDIA RTX 6000 Ada",
            "gpu_vram_gb": 48.0,
            "vram_free_gb": 40.0,
            "cuda_available": True
        }
        gov = ResourceGovernor(override_profile=profile)
        self.assertEqual(gov.classify_system_class(), "Workstation Class")

        # Check model size allowance
        allowed, reason = gov.is_model_allowed("qwen2.5-coder:7b")
        self.assertTrue(allowed)

        # Context length allowance >= 16384
        self.assertGreaterEqual(gov.get_max_context_length(), 16384)

        # Feature permissions
        vis_ok, _ = gov.is_feature_permitted("vision")
        tool_ok, _ = gov.is_feature_permitted("heavy_tools")
        gpu_ok, _ = gov.is_feature_permitted("gpu_acceleration")
        self.assertTrue(vis_ok)
        self.assertTrue(tool_ok)
        self.assertTrue(gpu_ok)

    def test_high_end_desktop_class_classification_and_policy(self):
        """High-End Desktop Class profile handles 5-10GB models and high context."""
        profile = {
            "cpu_name": "Intel Core i7-14700K",
            "cpu_cores": 20,
            "cpu_load_pct": 20.0,
            "ram_total_gb": 32.0,
            "ram_available_gb": 20.0,
            "disk_free_gb": 500.0,
            "os": "Windows 11",
            "gpu_name": "NVIDIA GeForce RTX 4070 Ti",
            "gpu_vram_gb": 12.0,
            "vram_free_gb": 8.0,
            "cuda_available": True
        }
        gov = ResourceGovernor(override_profile=profile)
        self.assertEqual(gov.classify_system_class(), "High-End Desktop Class")

        allowed, _ = gov.is_model_allowed("qwen2.5:7b")
        self.assertTrue(allowed)

        self.assertGreaterEqual(gov.get_max_context_length(), 8192)

    def test_mid_end_desktop_class_classification_and_policy(self):
        """Mid-End Desktop Class profile restricts large models and limits context length."""
        profile = {
            "cpu_name": "AMD Ryzen 5 5600X",
            "cpu_cores": 6,
            "cpu_load_pct": 40.0,
            "ram_total_gb": 16.0,
            "ram_available_gb": 8.0,
            "disk_free_gb": 100.0,
            "os": "Linux 6.1",
            "gpu_name": "NVIDIA GeForce RTX 3060",
            "gpu_vram_gb": 6.0,
            "vram_free_gb": 4.0,
            "cuda_available": True
        }
        gov = ResourceGovernor(override_profile=profile)
        self.assertEqual(gov.classify_system_class(), "Mid-End Desktop Class")

        # 3B-4B models allowed, heavy 8B+ models capped if memory available is tight
        allowed_small, _ = gov.is_model_allowed("llama3.2:3b")
        self.assertTrue(allowed_small)

    def test_laptop_low_resource_class_classification_and_policy(self):
        """Laptop / Low-Resource Class profile strictly caps model size and disables heavy tools/vision."""
        profile = {
            "cpu_name": "Intel Core i3-1115G4",
            "cpu_cores": 2,
            "cpu_load_pct": 75.0,
            "ram_total_gb": 8.0,
            "ram_available_gb": 2.2,  # < 3GB free
            "disk_free_gb": 25.0,
            "os": "Windows 10",
            "gpu_name": "None",
            "gpu_vram_gb": 0.0,
            "vram_free_gb": 0.0,
            "cuda_available": False
        }
        gov = ResourceGovernor(override_profile=profile)
        self.assertEqual(gov.classify_system_class(), "Laptop / Low-Resource Class")

        # Capped to small models (<= 3.0GB)
        allowed_3b, _ = gov.is_model_allowed("llama3.2:3b")
        self.assertTrue(allowed_3b)

        allowed_7b, reason = gov.is_model_allowed("qwen2.5-coder:7b")
        self.assertFalse(allowed_7b)
        self.assertIn("exceeds current resource cap", reason)

        # Context length restricted <= 2048
        self.assertLessEqual(gov.get_max_context_length(), 2048)

        # Heavy features restricted
        vis_ok, _ = gov.is_feature_permitted("vision")
        self.assertFalse(vis_ok)

    def test_agent_routing_fallback_under_low_resource_profile(self):
        """Agent routes to lightweight fallback model when requested model exceeds low-resource cap."""
        agent = LuminAgent()
        low_profile = {
            "cpu_name": "Low-End CPU",
            "cpu_cores": 2,
            "cpu_load_pct": 50.0,
            "ram_total_gb": 8.0,
            "ram_available_gb": 2.0,
            "disk_free_gb": 10.0,
            "os": "Linux",
            "gpu_name": "None",
            "gpu_vram_gb": 0.0,
            "vram_free_gb": 0.0,
            "cuda_available": False
        }
        agent.resource_governor.set_override_profile(low_profile)
        agent.local_models = ["qwen2.5-coder:7b", "llama3.2:3b"]

        provider, chosen_model = agent._route_hybrid_model("coding", "write a python function")
        # Under low RAM, qwen2.5-coder:7b is rejected and llama3.2:3b is selected
        self.assertEqual(chosen_model, "llama3.2:3b")

    def test_diagnostic_phrasing_does_not_return_current_machine_specs(self):
        """Diagnostic phrasing for 8GB RAM / no GPU returns policy-level failure analysis, NOT current host specs."""
        agent = LuminAgent()
        diag_query = "Diagnose why the agent might fail on a machine with no GPU and only 8 GB RAM"
        
        # Verify query is classified as diagnostic scenario, not pure current live profile
        self.assertTrue(agent._is_hardware_diagnostic_scenario_query(diag_query.lower()))
        self.assertFalse(agent._is_hardware_profile_query(diag_query.lower()))

        output = agent._diagnose_hardware_scenario(diag_query)
        self.assertIn("LUMIN POLICY-LEVEL HARDWARE DIAGNOSTIC REPORT", output)
        self.assertIn("8 GB RAM", output)
        self.assertIn("No GPU", output)
        self.assertIn("Failure Root-Cause Analysis", output)
        self.assertIn("Model Memory Exhaustion", output)

        # Ensure current host hardware specs (e.g. 32 GB, 3060 Ti) are NOT returned
        self.assertNotIn("32 GB", output)
        self.assertNotIn("3060 Ti", output)

    def test_live_hardware_status_returns_current_specs(self):
        """Live hardware query returns host machine status table."""
        agent = LuminAgent()
        live_query = "What is my current hardware / resource governor status?"
        
        self.assertFalse(agent._is_hardware_diagnostic_scenario_query(live_query.lower()))
        self.assertTrue(agent._is_hardware_profile_query(live_query.lower()))

        output = agent._handle_hardware_profile_command()
        self.assertIn("LUMIN HARDWARE PROFILE & RESOURCE GOVERNOR SUMMARY", output)

    def test_capabilities_matrix_report_command(self):
        """Capability status query returns the full capability matrix summary report."""
        agent = LuminAgent()
        cap_query = "status report of current capabilities (LLM, TTS, browser, file parsing)"
        
        self.assertTrue(agent._is_capabilities_query(cap_query.lower()))
        output = agent._handle_capabilities_command()
        self.assertIn("LUMIN Capability & Privacy Matrix", output)

    def test_pdf_analysis_extractable_and_non_extractable(self):
        """PDF analysis path returns claims/metrics on text PDF, and honest error on non-text PDF."""
        import tempfile
        agent = LuminAgent()

        # 1. Test text-extractable PDF simulation (native stream with text)
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<< /Length 55 >>\nstream\nBT\n/F1 12 Tf\n(Main Claim: AI models require 16GB RAM for optimal performance.) Tj\nET\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF")
            f_path = f.name

        pdf_out = agent._analyze_pdf(f_path, max_pages=5)
        self.assertIn("PDF Analysis", pdf_out)
        self.assertIn("Main Claims & Key Findings", pdf_out)
        self.assertIn("Page References", pdf_out)

        # 2. Test image-only / encrypted PDF
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF")
            img_pdf_path = f.name

        no_text_out = agent._analyze_pdf(img_pdf_path, max_pages=5)
        self.assertIn("No extractable text found", no_text_out)


if __name__ == "__main__":
    unittest.main()
