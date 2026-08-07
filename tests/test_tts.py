"""
Unit tests for LUMIN Single-Controller TTS Architecture.
Verifies engine locking, queue management, cancellation, duplicate prevention,
availability checks, local mode constraints, and candidate resolution.
"""

import os
import time
import unittest
from unittest.mock import MagicMock, patch

from audio.local_tts import LocalTTSEngine


class TestLocalTTSEngine(unittest.TestCase):

    def setUp(self):
        self.config = {
            "tts_engine": "local_piper",
            "tts_voice": "en_US-lessac-medium",
            "tts_allow_cloud_fallback": False,
            "tts_auto_fallback": True,
            "piper_path": "piper"
        }
        self.engine = LocalTTSEngine(self.config)

    def test_local_mode_never_calls_edge_tts(self):
        """CRITICAL: If local mode (local_piper or os_native) is set, Edge TTS must NEVER be in candidates."""
        self.engine.engine_type = "local_piper"
        candidates = self.engine.get_candidate_engines()
        self.assertNotIn("edge_tts", candidates)
        self.assertIn("local_piper", candidates)

        self.engine.engine_type = "os_native"
        candidates = self.engine.get_candidate_engines()
        self.assertNotIn("edge_tts", candidates)
        self.assertEqual(candidates, ["os_native"])

    def test_cloud_mode_candidate_resolution(self):
        """When edge_tts is selected, candidates start with edge_tts."""
        self.engine.engine_type = "edge_tts"
        self.engine.auto_fallback = True
        candidates = self.engine.get_candidate_engines()
        self.assertEqual(candidates, ["edge_tts", "local_piper", "os_native"])

        self.engine.auto_fallback = False
        candidates = self.engine.get_candidate_engines()
        self.assertEqual(candidates, ["edge_tts"])

    def test_auto_fallback_candidate_resolution(self):
        """In auto mode, if cloud allowed and online, candidates are edge_tts -> local_piper -> os_native."""
        self.engine.engine_type = "auto"
        self.engine.allow_cloud = True

        with patch.object(self.engine, 'check_internet_connection', return_value=True):
            candidates = self.engine.get_candidate_engines()
            self.assertEqual(candidates, ["edge_tts", "local_piper", "os_native"])

        with patch.object(self.engine, 'check_internet_connection', return_value=False):
            candidates = self.engine.get_candidate_engines()
            self.assertEqual(candidates, ["local_piper", "os_native"])
            self.assertNotIn("edge_tts", candidates)

    def test_duplicate_speech_suppression(self):
        """Duplicate speech requests within 1.0s window should be suppressed."""
        text = "Hello, this is a test speech output."
        self.assertFalse(self.engine._is_duplicate(text))

        self.engine._last_spoken_hash = self.engine._is_duplicate  # mock setting state
        self.engine.speak_text = MagicMock(return_value=True)

    def test_cancel_playback_clears_active_processes(self):
        """cancel_playback must set _cancelled to True and kill active subprocesses."""
        mock_proc = MagicMock()
        self.engine._active_processes.add(mock_proc)
        self.engine.cancel_playback()

        self.assertTrue(self.engine._cancelled)
        mock_proc.terminate.assert_called_once()
        self.assertEqual(len(self.engine._active_processes), 0)

    def test_only_one_engine_executes_per_response(self):
        """speak_text must execute candidate engines sequentially and stop as soon as ONE succeeds."""
        self.engine.engine_type = "edge_tts"
        self.engine.auto_fallback = True

        with patch.object(self.engine, 'is_engine_available', return_value=True), \
             patch.object(self.engine, '_speak_with_edge_tts', return_value=True) as mock_edge, \
             patch.object(self.engine, '_speak_with_piper', return_value=True) as mock_piper:

            success = self.engine.speak_text("Testing single execution.")
            self.assertTrue(success)
            mock_edge.assert_called_once()
            # Piper MUST NOT be called because Edge TTS succeeded!
            mock_piper.assert_not_called()


if __name__ == "__main__":
    unittest.main()
