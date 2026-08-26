"""
Unit tests for LUMIN agent decomposition (core/results.py, core/prompts.py, and core/agent.py backward compatibility).
"""

import unittest
from core.results import AgentResult, _tool_result_to_display
from core.prompts import (
    SYSTEM_PROMPT,
    UNCENSORED_DIRECTIVE,
    SIMPLE_LANGUAGE_DIRECTIVE,
    DOC_FACTUAL_DIRECTIVE,
    VIDEO_MISSING_DIRECTIVE,
    DANGEROUS_KEYWORDS,
    FIREARM_KEYWORDS,
    UNCENSORED_KEYWORDS,
    TASK_MODELS,
    MODEL_SIZE_GB,
    _IDEAL_SIZES,
    assemble_effective_system_prompt,
)
from core.agent import (
    AgentResult as AgentResultFromAgent,
    _tool_result_to_display as ToolResultToDisplayFromAgent,
    SYSTEM_PROMPT as SystemPromptFromAgent,
    DANGEROUS_KEYWORDS as DangerousKeywordsFromAgent,
    FIREARM_KEYWORDS as FirearmKeywordsFromAgent,
    UNCENSORED_KEYWORDS as UncensoredKeywordsFromAgent,
    TASK_MODELS as TaskModelsFromAgent,
    MODEL_SIZE_GB as ModelSizeGBFromAgent,
    _IDEAL_SIZES as IdealSizesFromAgent,
    assemble_effective_system_prompt as AssemblePromptFromAgent,
)


class TestAgentResults(unittest.TestCase):
    def test_agent_result_status_normalization(self):
        for status_raw in ["succeeded", "ok", "done", "true", "success"]:
            res = AgentResult(status=status_raw, output="all good")
            self.assertEqual(res.status, "success")

        for status_raw in ["blocked", "requires_user", "needs_user"]:
            res = AgentResult(status=status_raw)
            self.assertEqual(res.status, "needs_user")

        for status_raw in ["cancelled", "failed", "error", "unknown_val"]:
            res = AgentResult(status=status_raw)
            self.assertEqual(res.status, "failed")

        res_partial = AgentResult(status="partial")
        self.assertEqual(res_partial.status, "partial")

    def test_agent_result_properties_and_formatting(self):
        res = AgentResult(
            status="failed",
            completed=["step 1", "step 2"],
            failed=["step 3"],
            remaining=["step 4"],
            error="Connection timed out",
            next_action="Check network connectivity",
            output="Intermediate output"
        )
        self.assertEqual(res.status, "failed")
        self.assertEqual(res.completed, ["step 1", "step 2"])
        self.assertEqual(res.failed, ["step 3"])
        self.assertEqual(res.remaining, ["step 4"])
        self.assertEqual(res.error, "Connection timed out")
        self.assertEqual(res.next_action, "Check network connectivity")
        self.assertEqual(res.output, "Intermediate output")

        formatted = res.to_formatted_text()
        self.assertIn("[FAILED] Agent Task Execution Report:", formatted)
        self.assertIn("• Completed Steps:", formatted)
        self.assertIn("• Failed Steps:", formatted)
        self.assertIn("• Error: Connection timed out", formatted)
        self.assertIn("• Suggested Next Action: Check network connectivity", formatted)
        self.assertIn("Intermediate output", formatted)

    def test_tool_result_to_display(self):
        self.assertEqual(_tool_result_to_display(None), "")
        self.assertEqual(_tool_result_to_display("plain text"), "plain text")

        res_dict = {
            "status": "success",
            "succeeded": "Task completed successfully",
            "details": "Details here"
        }
        display = _tool_result_to_display(res_dict)
        self.assertIn("Task completed successfully", display)
        self.assertIn("Details here", display)

        res_err = {
            "status": "failed",
            "tool": "bash",
            "error": "Command not found"
        }
        self.assertIn("Command not found", _tool_result_to_display(res_err))


class TestPromptsAndContextAssembly(unittest.TestCase):
    def test_prompt_constants_exported_and_identical(self):
        self.assertEqual(SYSTEM_PROMPT, SystemPromptFromAgent)
        self.assertEqual(DANGEROUS_KEYWORDS, DangerousKeywordsFromAgent)
        self.assertEqual(FIREARM_KEYWORDS, FirearmKeywordsFromAgent)
        self.assertEqual(UNCENSORED_KEYWORDS, UncensoredKeywordsFromAgent)
        self.assertEqual(TASK_MODELS, TaskModelsFromAgent)
        self.assertEqual(MODEL_SIZE_GB, ModelSizeGBFromAgent)
        self.assertEqual(_IDEAL_SIZES, IdealSizesFromAgent)

    def test_assemble_effective_system_prompt_basic(self):
        prompt = assemble_effective_system_prompt(
            user_system_prompt="Be concise.",
            active_model="llama3.2:3b"
        )
        self.assertTrue(prompt.startswith("Be concise.\n\n"))
        self.assertIn("Grounding Rule: You are connected to a real application with a 3D visualizer.", prompt)

    def test_assemble_effective_system_prompt_uncensored(self):
        prompt = assemble_effective_system_prompt(
            active_model="dolphin-mistral:7b-v2.6-dpo-laser"
        )
        self.assertIn("UNCENSORED / UNFILTERED MODEL DIRECTIVE", prompt)

    def test_assemble_effective_system_prompt_extension(self):
        prompt = assemble_effective_system_prompt(
            system_prompt_extension=SIMPLE_LANGUAGE_DIRECTIVE
        )
        self.assertIn("=== SIMPLE LANGUAGE & ELI5 INSTRUCTION (STRICT ANTI-HALLUCINATION) ===", prompt)


class TestBackwardCompatibility(unittest.TestCase):
    def test_reexports_from_core_agent(self):
        self.assertIs(AgentResult, AgentResultFromAgent)
        self.assertIs(_tool_result_to_display, ToolResultToDisplayFromAgent)
        self.assertIs(assemble_effective_system_prompt, AssemblePromptFromAgent)


if __name__ == "__main__":
    unittest.main()
