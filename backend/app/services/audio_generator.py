"""
Audio Generator Service - ElevenLabs Text-to-Speech Integration

Converts walkthrough scripts into high-quality AI voice narration
using the ElevenLabs API.  Falls back to silent mock audio when
the API key is not configured.
"""

import os
import struct
from typing import Optional, AsyncIterator

import httpx
import aiofiles

from app.config import get_settings

settings = get_settings()

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"


class AudioGeneratorService:
    """
    ElevenLabs-powered audio synthesis service.

    Converts text scripts into natural-sounding speech via the
    ElevenLabs REST API (MP3).  When the API key is absent the
    service falls back to a tiny silent WAV so the rest of the
    pipeline keeps working.
    """

    def __init__(self):
        self._api_key: str = settings.elevenlabs_api_key
        self._voice_id: str = settings.elevenlabs_voice_id
        self._model_id: str = settings.elevenlabs_model_id
        self._client: Optional[httpx.AsyncClient] = None
        self._mode: str = "elevenlabs" if self._api_key else "mock"

        if self._mode == "mock":
            print("⚠️  ELEVENLABS_API_KEY not set – using silent mock audio")
        else:
            print(f"✅ ElevenLabs TTS ready  (voice={self._voice_id}, model={self._model_id})")

    # ------------------------------------------------------------------
    # HTTP client (lazy, reusable)
    # ------------------------------------------------------------------

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=ELEVENLABS_BASE_URL,
                headers={
                    "xi-api-key": self._api_key,
                    "Content-Type": "application/json",
                },
                timeout=60.0,
            )
        return self._client

    def _voice_body(self, text: str) -> dict:
        """Build the JSON payload shared by generate / stream calls."""
        return {
            "text": text,
            "model_id": self._model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }

    # ------------------------------------------------------------------
    # Core generation
    # ------------------------------------------------------------------

    async def generate_segment_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> bytes:
        """
        Generate audio for a single text segment.

        Returns MP3 bytes (ElevenLabs) or WAV bytes (mock).
        """
        if self._mode == "mock":
            return self._generate_mock_audio(text)

        try:
            client = await self._get_client()
            vid = voice_id or self._voice_id

            resp = await client.post(
                f"/text-to-speech/{vid}",
                json=self._voice_body(text),
            )
            resp.raise_for_status()
            return resp.content

        except Exception as e:
            print(f"⚠️  ElevenLabs API error: {e}")
            return self._generate_mock_audio(text)

    async def generate_full_audio(
        self,
        segments: list[str],
        voice_id: Optional[str] = None,
    ) -> bytes:
        """Generate and concatenate audio for multiple text segments."""
        chunks: list[bytes] = []
        for text in segments:
            chunk = await self.generate_segment_audio(text, voice_id)
            chunks.append(chunk)
        return b"".join(chunks)

    async def stream_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> AsyncIterator[bytes]:
        """
        Stream audio via the ElevenLabs streaming endpoint.

        Yields MP3 chunks suitable for a StreamingResponse.
        Falls back to the mock WAV generator when the key is missing.
        """
        if self._mode == "mock":
            data = self._generate_mock_audio(text)
            chunk_size = 4096
            for i in range(0, len(data), chunk_size):
                yield data[i : i + chunk_size]
            return

        try:
            client = await self._get_client()
            vid = voice_id or self._voice_id

            async with client.stream(
                "POST",
                f"/text-to-speech/{vid}/stream",
                json=self._voice_body(text),
            ) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=4096):
                    yield chunk

        except Exception as e:
            print(f"⚠️  ElevenLabs streaming error: {e}")
            yield self._generate_mock_audio(text)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def estimate_duration(self, text: str) -> float:
        """Estimate audio duration (seconds) at ~150 wpm."""
        words = len(text.split())
        return (words / 150) * 60

    def _generate_mock_audio(self, text: str) -> bytes:
        """Return a minimal silent WAV so the pipeline never breaks."""
        sample_rate = 22050
        bits_per_sample = 16
        num_channels = 1
        duration = self.estimate_duration(text)
        num_samples = int(sample_rate * min(duration, 5))

        audio_data = b"\x00\x00" * num_samples
        data_size = len(audio_data)
        file_size = 36 + data_size

        wav_header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF",
            file_size,
            b"WAVE",
            b"fmt ",
            16,
            1,
            num_channels,
            sample_rate,
            sample_rate * num_channels * bits_per_sample // 8,
            num_channels * bits_per_sample // 8,
            bits_per_sample,
            b"data",
            data_size,
        )
        return wav_header + audio_data

    async def get_available_voices(self) -> list[dict]:
        """Fetch the voice catalogue from ElevenLabs (or a mock entry)."""
        if self._mode == "mock":
            return [
                {
                    "voice_id": "mock",
                    "name": "Mock Voice",
                    "description": "Silent placeholder – set ELEVENLABS_API_KEY to enable real voices",
                }
            ]

        try:
            client = await self._get_client()
            resp = await client.get("/voices")
            resp.raise_for_status()
            data = resp.json()
            return [
                {
                    "voice_id": v["voice_id"],
                    "name": v["name"],
                    "description": v.get("description", ""),
                }
                for v in data.get("voices", [])
            ]
        except Exception as e:
            print(f"Error fetching voices: {e}")
            return []

    async def save_audio_file(self, audio_data: bytes, file_path: str) -> bool:
        """Persist audio bytes to disk."""
        try:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(audio_data)
            return True
        except Exception as e:
            print(f"Error saving audio file: {e}")
            return False

    async def close(self):
        """Shut down the underlying HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

