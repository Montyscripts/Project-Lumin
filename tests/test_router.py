"""
Unit tests for LUMIN AI Agent Intent Router & Command Execution Layer.
"""

import unittest
from core.router import IntentRouter, IntentType
from core.agent import LuminAgent

class TestIntentRouter(unittest.TestCase):
    def setUp(self):
        self.agent = LuminAgent()
        self.router = IntentRouter(agent=self.agent)

    def test_intent_classification_categories(self):
        # 1. Application commands
        type_app1, _ = self.router.classify("Switch to another model")
        type_app2, _ = self.router.classify("Switch model to llama3.2:3b")
        type_app3, _ = self.router.classify("Show capabilities")
        type_app4, _ = self.router.classify("Turn off TTS")
        type_app5, _ = self.router.classify("Switch TTS engine to piper")
        type_app6, _ = self.router.classify("Show status")

        self.assertEqual(type_app1, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app2, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app3, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app4, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app5, IntentType.APPLICATION_COMMAND)
        self.assertEqual(type_app6, IntentType.APPLICATION_COMMAND)

        # 2. Writing task
        type_write, _ = self.router.classify("Write three paragraphs about Japan in Notepad")
        self.assertEqual(type_write, IntentType.WRITING_TASK)

        # 3. File task
        type_file, _ = self.router.classify("List processes running")
        self.assertEqual(type_file, IntentType.FILE_TASK)

        # 4. Browser task
        type_browser, _ = self.router.classify("Search for weather in Tokyo")
        self.assertEqual(type_browser, IntentType.BROWSER_TASK)

        # 5. Normal conversation
        type_norm1, _ = self.router.classify("What is the capital of France?")
        type_norm2, _ = self.router.classify("Explain quantum entanglement step by step")
        self.assertEqual(type_norm1, IntentType.NORMAL_CONVERSATION)
        self.assertEqual(type_norm2, IntentType.NORMAL_CONVERSATION)

    def test_model_switching_command_execution(self):
        # Initial state
        self.agent.force_model = None
        
        # Test explicit model lock
        res = self.router.execute_application_command("Switch model to qwen2.5-coder:7b")
        self.assertEqual(self.agent.force_model, "qwen2.5-coder:7b")
        self.assertIn("LUMIN model target locked to: qwen2.5-coder:7b", res)

        # Test model unlock/auto
        res_auto = self.router.execute_application_command("Unlock model")
        self.assertIsNone(self.agent.force_model)
        self.assertIn("unlocked", res_auto)

        # Test "Switch to another model" rotation
        res_rot = self.router.execute_application_command("Switch to another model")
        self.assertIn("model target", res_rot.lower())

    def test_tts_engine_and_mode_execution(self):
        # Test TTS toggle off
        res_off = self.router.execute_application_command("Disable TTS")
        self.assertFalse(self.agent.tts_enabled)
        self.assertIn("OFF", res_off)

        # Test TTS toggle on
        res_on = self.router.execute_application_command("Enable TTS")
        self.assertTrue(self.agent.tts_enabled)
        self.assertIn("ON", res_on)

        # Test TTS engine change
        res_engine = self.router.execute_application_command("Change TTS engine to piper")
        self.assertEqual(self.agent.local_tts.engine_type, "local_piper")
        self.assertIn("local_piper", res_engine)

    def test_natural_language_tts_mode_phrasings(self):
        # 1. Level-1 exact phrasing ("Speak the next reply using the short confirmation TTS mode")
        query = "Speak the next reply using the short confirmation TTS mode"
        intent_type, _ = self.router.classify(query)
        self.assertEqual(intent_type, IntentType.APPLICATION_COMMAND)

        is_intercepted, res = self.router.route(query)
        self.assertTrue(is_intercepted)
        self.assertEqual(self.agent.tts_mode, "short")
        self.assertTrue(self.agent.tts_enabled)
        self.assertIn("SHORT", res)

        # 2. Brief replies phrasing
        is_intercepted_brief, res_brief = self.router.route("Switch to brief replies")
        self.assertTrue(is_intercepted_brief)
        self.assertEqual(self.agent.tts_mode, "short")
        self.assertIn("SHORT", res_brief)

        # 3. Full responses phrasing
        is_intercepted_full, res_full = self.router.route("full responses")
        self.assertTrue(is_intercepted_full)
        self.assertEqual(self.agent.tts_mode, "full")
        self.assertTrue(self.agent.tts_enabled)
        self.assertIn("ON", res_full)

        # 4. Stop speaking replies phrasing
        is_intercepted_mute, res_mute = self.router.route("stop speaking replies")
        self.assertTrue(is_intercepted_mute)
        self.assertEqual(self.agent.tts_mode, "off")
        self.assertFalse(self.agent.tts_enabled)
        self.assertIn("OFF", res_mute)

    def test_deterministic_module_purpose_extraction(self):
        # 1. Test extraction on core modules
        with open("core/router.py") as f:
            router_lines = f.readlines()
        p_router = self.agent._extract_python_module_purpose_deterministic("core/router.py", router_lines)
        self.assertIn("Intent Router", p_router)
        self.assertNotIn("Provides function(s):", p_router)

        with open("core/agent.py") as f:
            agent_lines = f.readlines()
        p_agent = self.agent._extract_python_module_purpose_deterministic("core/agent.py", agent_lines)
        self.assertIn("Orchestrator", p_agent)
        self.assertNotIn("Provides function(s): detect_web_blocker", p_agent)

        with open("tools/registry.py") as f:
            registry_lines = f.readlines()
        p_registry = self.agent._extract_python_module_purpose_deterministic("tools/registry.py", registry_lines)
        self.assertIn("Registry", p_registry)

        # 2. Test workspace listing command in offline mode
        self.agent._fetch_local_models = lambda: []
        res_ws = self.agent._handle_workspace_listing_command("List files in workspace and describe largest 3 python modules")
        self.assertIn("Largest 3 Python Module(s) Purpose Summary:", res_ws)
        self.assertNotIn("Provides function(s): detect_web_blocker", res_ws)
        self.assertNotIn("core application features and utilities", res_ws)

    def test_capabilities_and_status_command_execution(self):
        res_caps = self.router.execute_application_command("Show capabilities")
        self.assertIn("LUMIN Capability & Privacy Matrix", res_caps)

        res_model = self.router.execute_application_command("Show current model")
        self.assertIn("Active locked model:", res_model)

    def test_youtube_and_google_direct_actions(self):
        # YouTube search
        res1 = self.agent._execute_single_intent('open youtube and search "Gorillaz Demon Days Era Vibe"')
        self.assertIn("YouTube search for 'Gorillaz Demon Days Era Vibe'", res1)

        # YouTube autoplay 1st video
        res2 = self.agent._execute_single_intent('Open YouTube search "Gorillaz Demon Days Era Vibe" and click on the 1st video')
        self.assertIn("playing top YouTube result", res2)

        # Google search
        res3 = self.agent._execute_single_intent("open google an search for top vpn's of 2026")
        self.assertIn("Google Search executed for 'top vpn's of 2026'", res3)

    def test_visualizer_theme_and_shape_change(self):
        # 1. Direct theme change execution
        res_theme = self.agent._execute_direct_command("Switch the visualizer theme to matrix and confirm the change.")
        self.assertIsInstance(res_theme, str)
        self.assertIn("MATRIX", res_theme.upper())
        self.assertIn("CHANGE_THEME=matrix", res_theme)

        # 2. Direct shape change execution
        res_shape = self.agent._execute_direct_command("Set the visualizer shape to cube")
        self.assertIsInstance(res_shape, str)
        self.assertIn("CUBE", res_shape.upper())
        self.assertIn("SET_SHAPE=cube", res_shape)

    def test_tool_result_to_display_helper(self):
        from core.agent import _tool_result_to_display
        from tools.registry import ToolResult

        # String input
        self.assertEqual(_tool_result_to_display("hello"), "hello")

        # ToolResult input with succeeded
        tr = ToolResult(
            status="succeeded",
            tool="change_theme",
            succeeded="Successfully executed theme transition. Selected visual skin: MATRIX. [COMMAND: CHANGE_THEME=matrix]"
        )
        disp = _tool_result_to_display(tr)
        self.assertIsInstance(disp, str)
        self.assertIn("MATRIX", disp)
        self.assertIn("CHANGE_THEME=matrix", disp)

        # Dict input with completed
        dict_input = {
            "status": "success",
            "completed": ["Theme updated to hotpink"],
            "tool": "change_theme"
        }
        disp_dict = _tool_result_to_display(dict_input)
        self.assertIsInstance(disp_dict, str)
        self.assertIn("hotpink", disp_dict)

        # None input
        self.assertEqual(_tool_result_to_display(None), "")

    def test_hardware_profile_query_handling(self):
        queries = [
            "What is the current hardware profile this instance is running on? Summarize RAM, GPU/VRAM, and system class.",
            "Show hardware profile, RAM, GPU/VRAM, and system class.",
            "What is the system profile and resource governor status?",
            "Check hardware status, RAM, and GPU specs."
        ]

        for q in queries:
            # 1. Intent Classification Assertions
            intent_type, _ = self.router.classify(q)
            self.assertEqual(intent_type, IntentType.APPLICATION_COMMAND, f"Query '{q}' was not classified as APPLICATION_COMMAND")

            # 2. Execution & Response Assertions
            res = self.router.execute_application_command(q)
            self.assertIsInstance(res, str)
            self.assertIn("RAM", res.upper())
            self.assertTrue("GPU" in res.upper() or "VRAM" in res.upper())
            self.assertNotIn("no document is currently loaded", res.lower())
            self.assertNotIn("no document", res.lower())

            # 3. Process Query Assertions (Full Pipeline Interception)
            proc_res = self.agent.process_query(q)
            self.assertIsInstance(proc_res, str)
            self.assertIn("RAM", proc_res.upper())
            self.assertTrue("GPU" in proc_res.upper() or "VRAM" in proc_res.upper())
            self.assertNotIn("no document is currently loaded", proc_res.lower())
            self.assertNotIn("no document", proc_res.lower())

    def test_workspace_listing_query_handling(self):
        query = "List the files in the current workspace and briefly describe the purpose of the three largest Python modules."
        
        # 1. Intent Classification Assertion
        intent_type, _ = self.router.classify(query)
        self.assertEqual(intent_type, IntentType.APPLICATION_COMMAND, f"Query '{query}' was not classified as APPLICATION_COMMAND")

        # 2. Command Execution Assertion
        res = self.router.execute_application_command(query)
        self.assertIsInstance(res, str)
        self.assertIn("WORKSPACE FILE LISTING", res.upper())
        self.assertIn("LARGEST", res.upper())
        self.assertNotIn("no document is currently loaded", res.lower())

        # 3. Process Query Assertion & Guard Verification (No web search, no write_file)
        called_tools = []
        orig_execute = self.agent.tool_registry.execute_tool

        def tracking_execute(tool_name, *args, **kwargs):
            called_tools.append(tool_name)
            return orig_execute(tool_name, *args, **kwargs)

        self.agent.tool_registry.execute_tool = tracking_execute
        try:
            proc_res = self.agent.process_query(query)
            self.assertIsInstance(proc_res, str)
            self.assertIn("WORKSPACE FILE LISTING", proc_res.upper())
            self.assertNotIn("no document is currently loaded", proc_res.lower())

            # Assert no web_search or write_file called
            self.assertNotIn("web_search", called_tools)
            self.assertNotIn("write_file", called_tools)
            self.assertNotIn("write_docx", called_tools)
        finally:
            self.agent.tool_registry.execute_tool = orig_execute

    def test_workspace_listing_refuses_forbidden_tools(self):
        # Set active query on agent to workspace listing query
        self.agent._active_query = "List files in the current workspace and describe python modules."
        
        # Attempting write_file or web_search must fail validation
        is_val, _, err = self.agent._validate_tool_call("write_file", "notes.txt")
        self.assertFalse(is_val)
        self.assertIn("forbidden", err.lower())

        is_val_web, _, err_web = self.agent._validate_tool_call("web_search", "python modules")
        self.assertFalse(is_val_web)
        self.assertIn("forbidden", err_web.lower())

    def test_degraded_local_llm_meta_commands_resilience(self):
        """Ensure pure tool and meta commands succeed even when LOCAL_LLM has 0 models without attempting model inference."""
        # Simulate 0 Ollama models installed
        self.agent._fetch_local_models = lambda: []
        
        # Ensure generate_content on ollama_client raises an error if ever called
        def failing_generate_content(*args, **kwargs):
            raise RuntimeError("LLM inference attempted during pure meta/tool command!")

        self.agent.ollama_client.generate_content = failing_generate_content

        meta_queries = [
            "What is the current hardware profile this instance is running on?",
            "List the files in the current workspace.",
            "Show capabilities",
            "Show status",
            "Show current model",
            "Disable TTS",
            "Switch visualizer theme to cyber"
        ]

        for q in meta_queries:
            proc_res = self.agent.process_query(q)
            self.assertIsNotNone(proc_res)
            self.assertNotIn("No document is currently loaded", str(proc_res))

    def test_four_prompt_sequence_offline_resilience(self):
        """Runs the 4 prompt sequence against a live agent with 0 models installed (tool-only path)."""
        # 0. Set up agent with 0 installed models and failing LLM inference guard
        self.agent._fetch_local_models = lambda: []
        
        def failing_generate_content(*args, **kwargs):
            raise RuntimeError("LLM inference attempted during pure meta/tool command!")

        self.agent.ollama_client.generate_content = failing_generate_content

        # Track tool calls during prompt 3
        called_tools = []
        orig_execute = self.agent.tool_registry.execute_tool

        def spy_execute(tool_name, *args, **kwargs):
            called_tools.append(tool_name)
            return orig_execute(tool_name, *args, **kwargs)

        self.agent.tool_registry.execute_tool = spy_execute

        try:
            # 1. Theme change
            res1 = self.agent.process_query("Switch visualizer theme to matrix")
            self.assertIsInstance(res1, str)
            self.assertIn("matrix", res1.lower())
            self.assertNotIn("no document", res1.lower())

            # 2. Hardware profile
            res2 = self.agent.process_query("What is the hardware profile this instance is running on?")
            self.assertIsInstance(res2, str)
            self.assertIn("ram", res2.lower())
            self.assertTrue("gpu" in res2.lower() or "vram" in res2.lower())
            self.assertNotIn("no document", res2.lower())

            # 3. List workspace + describe three largest Python modules
            res3 = self.agent.process_query("List the files in the current workspace and describe the purpose of the three largest Python modules.")
            self.assertIsInstance(res3, str)
            self.assertIn("workspace file listing", res3.lower())
            self.assertIn(".py", res3.lower())
            self.assertNotIn("no document", res3.lower())

            # Assert write_file and web_search were never called
            self.assertNotIn("write_file", called_tools)
            self.assertNotIn("web_search", called_tools)

            # 4. "Switch to the coding-oriented model if available, otherwise tell me what is active and why."
            res4 = self.agent.process_query("Switch to the coding-oriented model if available, otherwise tell me what is active and why.")
            self.assertIsInstance(res4, str)
            self.assertTrue("not available" in res4.lower() or "0 local" in res4.lower() or "offline" in res4.lower())
            self.assertIn("active", res4.lower())
            self.assertNotIn("no document", res4.lower())
        finally:
            self.agent.tool_registry.execute_tool = orig_execute

    def test_explain_local_source_file_structure(self):
        """Asserts that local source-file explanation requests route exclusively to file analysis without research or file writes."""
        # Setup 0 models and failing LLM guard to verify deterministic/tool path resilience
        self.agent._fetch_local_models = lambda: []
        
        def failing_generate_content(*args, **kwargs):
            raise RuntimeError("LLM inference attempted during local source-file analysis!")

        self.agent.ollama_client.generate_content = failing_generate_content

        # Spy on tool executions and research calls
        executed_tools = []
        orig_execute = self.agent.tool_registry.execute_tool
        
        def spy_execute(tool_name, *args, **kwargs):
            executed_tools.append(tool_name)
            return orig_execute(tool_name, *args, **kwargs)

        self.agent.tool_registry.execute_tool = spy_execute

        research_called = []
        orig_research = getattr(self.agent.writing_generator, "gather_web_research_context", None)
        if orig_research:
            def spy_research(*args, **kwargs):
                research_called.append(True)
                return ""
            self.agent.writing_generator.gather_web_research_context = spy_research

        prompts = [
            "Explain the structure of core/router.py in plain language",
            "Summarize the structure and main functions of core/router.py",
            "What does core/router.py do? Describe its structure."
        ]

        try:
            for prompt in prompts:
                executed_tools.clear()
                research_called.clear()

                classified_intent, _ = self.router.classify(prompt)
                self.assertEqual(classified_intent, IntentType.FILE_TASK, f"Prompt '{prompt}' was classified as {classified_intent} instead of FILE_TASK")

                res = self.agent.process_query(prompt)

                self.assertIsInstance(res, str)
                self.assertNotIn("write_file", executed_tools, f"write_file was improperly called for prompt: {prompt}")
                self.assertNotIn("web_search", executed_tools, f"web_search was improperly called for prompt: {prompt}")
                self.assertFalse(research_called, f"gather_web_research_context was improperly called for prompt: {prompt}")

                res_low = res.lower()
                self.assertNotIn("no document", res_low)
                self.assertTrue(
                    "router.py" in res_low or "intentrouter" in res_low or "classify" in res_low,
                    f"Response for '{prompt}' missing structural info from router.py: {res[:200]}"
                )
        finally:
            self.agent.tool_registry.execute_tool = orig_execute
            if orig_research:
                self.agent.writing_generator.gather_web_research_context = orig_research

if __name__ == "__main__":
    unittest.main()
