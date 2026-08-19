"""
Unit tests for ResourceGovernor system using standard unittest framework.
Tests hardware sampling, system class classification, model size caps,
context limits, feature policy enforcement (vision, heavy tools, GPU acceleration),
and fallback model routing under low-RAM / no-GPU profiles.
"""

import unittest
from core.resource_governor import ResourceGovernor
from core.agent import LuminAgent

class TestResourceGovernor(unittest.TestCase):
    def test_high_end_profile(self):
        mock_high = {
            "cpu_name": "Intel Core i9-13900K",
            "cpu_cores": 24,
            "cpu_load_pct": 15.0,
            "ram_total_gb": 64.0,
            "ram_available_gb": 48.0,
            "disk_free_gb": 500.0,
            "os": "Linux 6.5.0",
            "gpu_name": "NVIDIA GeForce RTX 4090",
            "gpu_vram_gb": 24.0,
            "vram_free_gb": 20.0,
            "cuda_available": True
        }
        gov = ResourceGovernor(override_profile=mock_high)
        self.assertEqual(gov.classify_system_class(), "Workstation Class")

        # High-end profile allows large models and high context
        ok, _ = gov.is_model_allowed("qwen2.5-coder:7b")
        self.assertTrue(ok)

        self.assertGreaterEqual(gov.get_max_context_length(), 16384)
        
        vis_ok, _ = gov.is_feature_permitted("vision")
        self.assertTrue(vis_ok)

        tool_ok, _ = gov.is_feature_permitted("heavy_tools")
        self.assertTrue(tool_ok)

    def test_low_ram_profile(self):
        mock_low_ram = {
            "cpu_name": "Intel Core i5",
            "cpu_cores": 4,
            "cpu_load_pct": 85.0,
            "ram_total_gb": 8.0,
            "ram_available_gb": 2.5,  # < 3GB free -> critical fallback
            "disk_free_gb": 20.0,
            "os": "Windows 11",
            "gpu_name": "None",
            "gpu_vram_gb": 0.0,
            "vram_free_gb": 0.0,
            "cuda_available": False
        }
        gov = ResourceGovernor(override_profile=mock_low_ram)
        self.assertEqual(gov.classify_system_class(), "Laptop / Low-Resource Class")

        # Model cap forced to 3.0GB
        ok_small, _ = gov.is_model_allowed("llama3.2:3b")
        self.assertTrue(ok_small)

        ok_large, reason = gov.is_model_allowed("qwen2.5-coder:7b")
        self.assertFalse(ok_large)
        self.assertIn("exceeds current resource cap", reason)

        # Context length restricted to <= 2048
        self.assertLessEqual(gov.get_max_context_length(), 2048)

        # Vision and heavy tools disabled
        vis_ok, _ = gov.is_feature_permitted("vision")
        self.assertFalse(vis_ok)

        tool_ok, _ = gov.is_feature_permitted("heavy_tools")
        self.assertFalse(tool_ok)

    def test_no_gpu_profile(self):
        mock_no_gpu = {
            "cpu_name": "AMD Ryzen 5",
            "cpu_cores": 6,
            "cpu_load_pct": 30.0,
            "ram_total_gb": 16.0,
            "ram_available_gb": 6.0,
            "disk_free_gb": 100.0,
            "os": "Linux 6.1",
            "gpu_name": "None",
            "gpu_vram_gb": 0.0,
            "vram_free_gb": 0.0,
            "cuda_available": False
        }
        gov = ResourceGovernor(override_profile=mock_no_gpu)
        
        gpu_ok, _ = gov.is_feature_permitted("gpu_acceleration")
        self.assertFalse(gpu_ok)

    def test_agent_model_routing_with_resource_governor(self):
        agent = LuminAgent()

        # Mock low hardware profile on agent's governor
        mock_low = {
            "cpu_name": "Low-End CPU",
            "cpu_cores": 2,
            "cpu_load_pct": 50.0,
            "ram_total_gb": 8.0,
            "ram_available_gb": 2.0,  # low RAM
            "disk_free_gb": 10.0,
            "os": "Linux",
            "gpu_name": "None",
            "gpu_vram_gb": 0.0,
            "vram_free_gb": 0.0,
            "cuda_available": False
        }
        agent.resource_governor.set_override_profile(mock_low)
        agent.local_models = ["qwen2.5-coder:7b", "llama3.2:3b"]

        # When requesting a coding model under low RAM, large model qwen2.5-coder:7b must be rejected in favor of llama3.2:3b
        provider, chosen_model = agent._route_hybrid_model("coding", "write a python function")
        self.assertEqual(chosen_model, "llama3.2:3b")

        # Verify report contains active overrides
        report = agent.capabilities.get_summary_report()
        self.assertTrue("CRITICAL LOW RAM" in report or "LOW RAM" in report)


if __name__ == "__main__":
    unittest.main()
