import unittest
import os
import json
import wave
import struct
from unittest.mock import patch, MagicMock
from core.agent import Agent, AgentResult

class TestAudioTranscriptOverride(unittest.TestCase):
    def setUp(self):
        self.test_audio_path = os.path.abspath(os.path.join("uploads", "LUMIN_Test_Audio.wav"))
        os.makedirs(os.path.dirname(self.test_audio_path), exist_ok=True)
        # Create a synthetic WAV file
        with wave.open(self.test_audio_path, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(16000)
            data = struct.pack("<" + ("h" * 16000), *([0] * 16000))
            wav.writeframes(data)

    def tearDown(self):
        if os.path.exists(self.test_audio_path):
            try:
                os.remove(self.test_audio_path)
            except Exception:
                pass

    @patch("core.agent.Agent._fetch_local_models", return_value=[])
    @patch("core.upload_pipeline.UploadPipeline.parse_audio")
    def test_audio_override_when_no_local_models(self, mock_parse_audio, mock_fetch_models):
        audio_text = (
            "### Audio Media Analysis: LUMIN_Test_Audio.wav\n"
            "- **Engine**: Faster-Whisper base (Local)\n"
            "- **Duration**: 00:00:03\n"
            "- **Language**: English\n\n"
            "### Audio Transcription:\n"
            "Welcome to LUMIN desktop audio intelligence testing."
        )
        mock_parse_audio.return_value = (audio_text, "Audio File (Duration: 00:00:03, 1 segments)")

        agent = Agent()
        agent.local_models = []

        query_payload = json.dumps({
            "text": "Transcribe this audio",
            "attachment": {
                "name": "LUMIN_Test_Audio.wav",
                "path": self.test_audio_path,
                "mimeType": "audio/wav",
                "type": "audio"
            }
        })

        result = agent.process_query(query_payload)

        self.assertNotIn("Greetings! I am LUMIN", result)
        self.assertNotIn("Local Ollama model is currently offline", result)
        self.assertIn("### Audio Transcription:", result)
        self.assertIn("Welcome to LUMIN desktop audio intelligence testing.", result)
        self.assertIn("Faster-Whisper base", result)

    @patch("core.agent.Agent._fetch_local_models", return_value=[])
    @patch("core.upload_pipeline.UploadPipeline.parse_audio")
    def test_audio_override_with_file_type_fallback(self, mock_parse_audio, mock_fetch_models):
        # Even if frontend sends type: 'file' for .wav
        audio_text = (
            "### Audio Media Analysis: LUMIN_Test_Audio.wav\n"
            "- **Engine**: OpenAI Whisper base (Local)\n"
            "- **Duration**: 00:00:02\n\n"
            "### Audio Transcription:\n"
            "Testing speech to text transcription override."
        )
        mock_parse_audio.return_value = (audio_text, "Audio File (Duration: 00:00:02, 1 segments)")

        agent = Agent()
        agent.local_models = []

        query_payload = json.dumps({
            "text": "Transcribe this audio",
            "attachment": {
                "name": "LUMIN_Test_Audio.wav",
                "path": self.test_audio_path,
                "mimeType": "audio/wav",
                "type": "file" # Frontend legacy fallback type
            }
        })

        result = agent.process_query(query_payload)

        self.assertNotIn("Greetings! I am LUMIN", result)
        self.assertIn("### Audio Transcription:", result)
        self.assertIn("Testing speech to text transcription override.", result)

    @patch("core.agent.Agent._fetch_local_models", return_value=["llama3.2:3b"])
    @patch("core.upload_pipeline.UploadPipeline.parse_audio")
    def test_audio_followup_analysis_does_not_override(self, mock_parse_audio, mock_fetch_models):
        audio_text = (
            "### Audio Media Analysis: song.mp3\n"
            "- **Engine**: Faster-Whisper base (Local)\n"
            "- **Duration**: 00:03:30\n"
            "- **Language**: English\n\n"
            "### Audio Transcription:\n"
            "I keep walking down this lonely road thinking about tomorrow."
        )
        mock_parse_audio.return_value = (audio_text, "Audio File")

        agent = Agent()
        agent.local_models = ["llama3.2:3b"]
        agent.ollama_client.generate_content = MagicMock(return_value="The song portrays a contemplative journey of solitude and hope for the future.")

        # Step 1: Upload and transcribe
        upload_payload = json.dumps({
            "text": "Transcribe this audio",
            "attachment": {
                "name": "song.mp3",
                "path": self.test_audio_path,
                "mimeType": "audio/mpeg",
                "type": "audio"
            }
        })
        res1 = agent.process_query(upload_payload)
        self.assertIn("### Audio Transcription:", res1)

        # Step 2: Follow-up question: "what is the song about"
        res2 = agent.process_query("what is the song about")
        self.assertNotIn("### Audio Transcription:", res2)
        self.assertIn("The song portrays a contemplative journey", res2)

    @patch("core.agent.Agent._fetch_local_models", return_value=["llama3.2:3b"])
    def test_audio_followup_no_unbound_local_error(self, mock_fetch_models):
        agent = Agent()
        agent.local_models = ["llama3.2:3b"]
        agent.ollama_client.generate_content = MagicMock(return_value="Ah, back in my day, songs like this reminded us of wandering the dusty trails.")
        agent.last_analyzed_file = "song.mp3"
        agent.last_analyzed_content = (
            "### Audio Media Analysis: song.mp3\n"
            "### Audio Transcription:\n"
            "Walking in the rain, remembering the old days."
        )

        try:
            res = agent.process_query("tell me about the song as if you're an old man")
            self.assertIn("dusty trails", res)
        except UnboundLocalError as e:
            self.fail(f"UnboundLocalError occurred during audio follow-up: {e}")

if __name__ == "__main__":
    unittest.main()
