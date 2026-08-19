"""
Unit tests for Concurrent Request Cancellation & Task Lifecycle Control.
Covers:
- Agent cancellation state management (cancel_task, is_cancelled, reset_cancellation)
- Asynchronous task cancellation in concurrent thread execution
- Task progress event emissions and cancellation callbacks
"""

import time
import threading
import unittest

from core.agent import LuminAgent


class TestConcurrentRequestCancellation(unittest.TestCase):
    def setUp(self):
        self.agent = LuminAgent()

    def test_cancellation_flag_lifecycle(self):
        """cancellation_requested flag transitions correctly through task lifecycle."""
        self.assertFalse(self.agent.is_cancelled())

        self.agent.cancel_task()
        self.assertTrue(self.agent.is_cancelled())

        self.agent.reset_cancellation()
        self.assertFalse(self.agent.is_cancelled())

    def test_concurrent_task_cancellation_in_thread(self):
        """A background agent task checks cancellation flag and aborts promptly when cancelled."""
        task_started = threading.Event()
        task_aborted = threading.Event()
        loop_counter = [0]

        def long_running_agent_task():
            task_started.set()
            for _ in range(100):
                if self.agent.is_cancelled():
                    task_aborted.set()
                    return
                loop_counter[0] += 1
                time.sleep(0.01)

        # Launch background task
        worker = threading.Thread(target=long_running_agent_task, daemon=True)
        worker.start()

        # Wait for worker to start
        self.assertTrue(task_started.wait(timeout=2.0))

        # Trigger concurrent cancellation
        self.agent.cancel_task()

        # Wait for worker thread to terminate via cancellation check
        worker.join(timeout=2.0)

        self.assertTrue(task_aborted.is_set())
        self.assertLess(loop_counter[0], 100, "Task should have stopped before completing all 100 iterations.")

    def test_progress_callback_emission_during_cancellation(self):
        """Emitted progress events trigger registered callback functions."""
        received_events = []

        def handle_progress(evt):
            received_events.append(evt)

        self.agent.set_progress_callback(handle_progress)

        # Emit normal progress
        self.agent._emit_progress_event({"status": "running", "percent": 50})
        self.assertEqual(len(received_events), 1)
        self.assertEqual(received_events[0]["status"], "running")

        # Emit cancellation progress
        self.agent.cancel_task()
        self.agent._emit_progress_event({"status": "cancelled", "reason": "User cancelled task"})

        self.assertEqual(len(received_events), 2)
        self.assertEqual(received_events[1]["status"], "cancelled")


if __name__ == "__main__":
    unittest.main()
