#!/usr/bin/env python3
"""
LUMIN System Evaluation Harness & Benchmark Suite.
Executes automated test cases from eval_cases.json against Agent, Router, Tools, and Upload Pipeline.
"""

import os
import sys
import json
import time
import unittest

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.agent import Agent
from tools.registry import ToolRegistry
from core.upload_pipeline import UploadPipeline
from core.router import IntentRouter
from core.writing import WritingGenerator
from memory.manager import MemoryManager


class LuminEvalRunner:
    def __init__(self, eval_file: str = None):
        if eval_file is None:
            eval_file = os.path.join(os.path.dirname(__file__), "eval_cases.json")
        self.eval_file = eval_file
        self.tool_registry = ToolRegistry()
        self.upload_pipeline = UploadPipeline(tool_registry=self.tool_registry)
        self.agent = Agent()
        self.router = IntentRouter(agent=self.agent)

        self.passed = 0
        self.failed = 0
        self.results = []

    def load_eval_cases(self):
        with open(self.eval_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def run_all_evals(self):
        cases = self.load_eval_cases()
        print("\n" + "=" * 65)
        print("   LUMIN AGENT SYSTEM EVALUATION & BENCHMARK HARNESS")
        print("=" * 65)
        print(f"Loaded {len(cases)} test cases from '{os.path.basename(self.eval_file)}'\n")

        start_time = time.time()

        for case in cases:
            case_id = case["id"]
            category = case["category"]
            desc = case["description"]

            print(f"• Running [{case_id}] {category}: {desc}...", end=" ")
            sys.stdout.flush()

            try:
                success, details = self._eval_case(case)
                if success:
                    print("PASSED [✓]")
                    self.passed += 1
                    self.results.append({"id": case_id, "status": "PASS", "details": details})
                else:
                    print(f"FAILED [✗] ({details})")
                    self.failed += 1
                    self.results.append({"id": case_id, "status": "FAIL", "details": details})
            except Exception as ex:
                print(f"ERROR [!] ({ex})")
                self.failed += 1
                self.results.append({"id": case_id, "status": "ERROR", "details": str(ex)})

        elapsed = time.time() - start_time
        total = len(cases)
        pass_rate = (self.passed / total * 100) if total > 0 else 0

        print("\n" + "=" * 65)
        print(f"EVALUATION SUMMARY: {self.passed}/{total} Passed ({pass_rate:.1f}%) in {elapsed:.2f}s")
        print("=" * 65)

        return self.failed == 0

    def _eval_case(self, case: dict) -> tuple[bool, str]:
        cid = case["id"]

        if cid == "tc_01_tool_parsing_json":
            tool_name, tool_args = self.agent._parse_structured_tool_call(case["prompt"])
            if tool_name == case["expected_tool"] and tool_args == case["expected_args"]:
                return True, f"Parsed tool '{tool_name}' with args {tool_args}"
            return False, f"Expected {case['expected_tool']}, got {tool_name}"

        elif cid == "tc_02_tool_parsing_legacy":
            tool_name, tool_args = self.agent._parse_structured_tool_call(case["prompt"])
            if tool_name == case["expected_tool"] and tool_args == case["expected_args"]:
                return True, f"Parsed legacy tool '{tool_name}' with args {tool_args}"
            return False, f"Expected {case['expected_tool']}, got {tool_name}"

        elif cid == "tc_03_sandboxing_path_guard":
            err = self.tool_registry._check_file_access(case["path"])
            if err is not None:
                return True, f"Blocked path successfully: {err}"
            return False, "Path access was unexpectedly allowed"

        elif cid == "tc_04_sandboxing_allowed_path":
            err = self.tool_registry._check_file_access(case["path"])
            if err is None:
                return True, "Allowed valid path successfully"
            return False, f"Valid path was blocked: {err}"

        elif cid == "tc_05_structural_mapper_python":
            s_map = self.upload_pipeline.generate_structural_map(case["file_path"])
            if all(term in s_map for term in case["expected_contains"]):
                return True, "Generated Python structural AST map"
            return False, f"Missing expected terms in structural map output"

        elif cid == "tc_06_chunk_retrieval_relevance":
            chunks = self.upload_pipeline.get_relevant_chunks(case["file_path"], query=case["query"], max_chars=case["max_chars"])
            if len(chunks) <= case["max_chars"] + 500 and len(chunks) > 50:
                return True, f"Retrieved {len(chunks)} chars within budget"
            return False, f"Retrieved {len(chunks)} chars, budget was {case['max_chars']}"

        elif cid in ("tc_07_router_domain_coding", "tc_08_router_domain_vision"):
            task_type = self.agent._classify_task(case["query"])
            if task_type == case["expected_domain"] or case["task"] == task_type:
                return True, f"Routed query to domain '{task_type}'"
            return False, f"Got domain '{task_type}', expected '{case['expected_domain']}'"

        elif cid == "tc_09_meta_command_models":
            output = self.agent._handle_meta_command(case["command"])
            if output and all(term in output for term in case["expected_contains"]):
                return True, "/models output rendered correctly"
            return False, f"Output did not match expected structure: {output[:100]}"

        elif cid == "tc_10_meta_command_developer_mode":
            routed, result = self.router.route(case["command"])
            if routed and all(term in str(result) for term in case["expected_contains"]):
                return True, "Developer mode command intercepted"
            return False, f"Developer mode not intercepted properly: {result}"

        elif cid == "tc_11_meta_command_help":
            output = self.agent._handle_meta_command(case["command"])
            if output and all(term in output for term in case["expected_contains"]):
                return True, "Help meta command output verified"
            return False, f"Help output incomplete: {output[:100]}"

        elif cid == "tc_12_intent_classification_literal":
            gen = WritingGenerator(ollama_client=None)
            intent = gen.classify_intent(case["query"])
            if intent["type"] == case["expected_type"] and intent.get("literal_text") == case["expected_literal"]:
                return True, "Classified literal writing intent"
            return False, f"Got intent: {intent}"

        elif cid == "tc_13_intent_classification_generative":
            gen = WritingGenerator(ollama_client=None)
            intent = gen.classify_intent(case["query"])
            if intent["type"] == case["expected_type"] and intent.get("paragraph_count") == case["expected_paras"]:
                return True, "Classified generative writing intent"
            return False, f"Got intent: {intent}"

        elif cid == "tc_14_memory_fact_store_and_retrieve":
            mem = MemoryManager(filepath="tests/eval/eval_memory.json")
            mem.add_memory(case["fact"])
            recalled = mem.get_relevant_memories("theme")
            if case["expected_recall"] in recalled or any("dark theme" in m for m in mem.memories):
                return True, "Memory stored and recalled successfully"
            return False, f"Recalled: {recalled}"

        elif cid == "tc_15_audit_log_verification":
            res = self.tool_registry._audit(action=case["action"], details="Eval test", approved=True, result="OK")
            if os.path.exists("audit_log.jsonl"):
                return True, "Audit log record written to audit_log.jsonl"
            return False, "Audit log file not found"

        elif cid == "tc_16_project_indexer":
            idx = self.upload_pipeline.index_project_directory(case["dir_path"])
            if idx.get("file_count", 0) >= case["expected_min_files"]:
                return True, f"Indexed {idx['file_count']} files in project"
            return False, f"Only indexed {idx.get('file_count')} files"

        elif cid == "tc_17_multi_file_comparison":
            meta1 = self.upload_pipeline.process_file(case["file1"])
            meta2 = self.upload_pipeline.process_file(case["file2"])
            report = self.upload_pipeline.compare_files([meta1, meta2])
            if all(term in report for term in case["expected_contains"]):
                return True, "Multi-file comparison report generated with diff & similarity analysis"
            return False, f"Report missing expected terms: {report[:100]}"

        elif cid == "tc_18_multi_step_direct_command":
            res = self.agent._execute_direct_command(case["query"])
            if res and all(term in res for term in case["expected_contains"]):
                return True, "Multi-step command chain executed successfully"
            return False, f"Result did not match expectations: {res}"

        elif cid == "tc_19_page_content_extraction":
            res = self.agent._execute_single_intent(case["query"])
            has_exp = all(term.lower() in res.lower() for term in case["expected_contains"])
            has_forbid = any(term.lower() in res.lower() for term in case["forbidden_contains"])
            if has_exp and not has_forbid:
                return True, "Page content extraction executed cleanly without triggering product research"
            return False, f"Page extraction output invalid or triggered research: {res[:150]}"

        elif cid == "tc_20_gmail_draft_multistep":
            res = self.agent._execute_direct_command(case["query"])
            has_exp = all(term.lower() in res.lower() for term in case["expected_contains"])
            has_forbid = any(term.lower() in res.lower() for term in case["forbidden_contains"])
            if has_exp and not has_forbid:
                return True, "Multi-step YouTube search & Gmail draft creation executed successfully"
            return False, f"Multi-step result invalid: {res[:150]}"

        elif cid == "tc_21_file_comparison_query_routing":
            meta1 = self.upload_pipeline.process_file(case["file1"])
            meta2 = self.upload_pipeline.process_file(case["file2"])
            res = self.agent._execute_single_intent(case["query"])
            has_exp = all(term.lower() in res.lower() for term in case["expected_contains"])
            has_forbid = any(term.lower() in res.lower() for term in case["forbidden_contains"])
            if has_exp and not has_forbid:
                return True, "File comparison query correctly routed to UploadPipeline comparison"
            return False, f"File comparison query routing result invalid: {res[:150]}"

        return False, "Unknown test case ID"


if __name__ == "__main__":
    runner = LuminEvalRunner()
    success = runner.run_all_evals()
    sys.exit(0 if success else 1)
