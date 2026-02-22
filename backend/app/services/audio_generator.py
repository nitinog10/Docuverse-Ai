"""Audio Generator Service – Text-to-Speech

Converts walkthrough scripts into AI voice narration.

Priority chain:
  1. **ElevenLabs** (set ELEVENLABS_API_KEY) – premium quality.
  2. **Edge-TTS** (free, no key needed) – Microsoft Edge online TTS, produces MP3.

Both paths return MP3 bytes, so the rest of the pipeline can treat all
audio uniformly.
"""

import asyncio
import io
import os
import struct
import time
from typing import Optional, AsyncIterator, List, Tuple

import httpx
import aiofiles

from app.config import get_settings

settings = get_settings()

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

# Edge-TTS voice to use when ElevenLabs is unavailable
EDGE_TTS_VOICE = "en-US-GuyNeural"


class AudioGeneratorService:
    """Text-to-speech service with ElevenLabs → Edge-TTS fallback."""

    def __init__(self):
        self._api_key: str = settings.elevenlabs_api_key
        self._voice_id: str = settings.elevenlabs_voice_id
        self._model_id: str = settings.elevenlabs_model_id
        self._client: Optional[httpx.AsyncClient] = None

        if self._api_key:
            self._mode = "elevenlabs"
            print(f"✅ ElevenLabs TTS ready  (voice={self._voice_id}, model={self._model_id})")
        else:
            self._mode = "edge-tts"
            print(f"ℹ️  ELEVENLABS_API_KEY not set – using free Edge-TTS (voice={EDGE_TTS_VOICE})")

    # ------------------------------------------------------------------
    # HTTP client (lazy, reusable) – ElevenLabs only
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
    # Edge-TTS helper (free fallback)
    # ------------------------------------------------------------------

    async def _generate_edge_tts(self, text: str) -> bytes:
        """Generate MP3 bytes via Microsoft Edge-TTS (free, no key)."""
        import edge_tts

        communicate = edge_tts.Communicate(text, EDGE_TTS_VOICE)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        return buf.getvalue()

    # ------------------------------------------------------------------
    # Core generation
    # ------------------------------------------------------------------

    async def generate_segment_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> bytes:
        """Generate MP3 audio for a single text segment."""
        if self._mode == "edge-tts":
            try:
                return await self._generate_edge_tts(text)
            except Exception as e:
                print(f"⚠️  Edge-TTS error: {e}")
                return b""  # empty fallback; browser TTS will kick in

        # ElevenLabs path
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
            print(f"⚠️  ElevenLabs API error, falling back to Edge-TTS: {e}")
            try:
                return await self._generate_edge_tts(text)
            except Exception as e2:
                print(f"⚠️  Edge-TTS also failed: {e2}")
                return b""

    async def generate_full_audio(
        self,
        segments: list[str],
        voice_id: Optional[str] = None,
    ) -> bytes:
        """Generate and concatenate MP3 audio for multiple text segments."""
        chunks: list[bytes] = []
        for text in segments:
            chunk = await self.generate_segment_audio(text, voice_id)
            chunks.append(chunk)
        return b"".join(chunks)

    async def generate_segments_parallel(
        self,
        texts: List[str],
        voice_id: Optional[str] = None,
        max_concurrent: int = 4,
    ) -> List[bytes]:
        """Generate audio for multiple segments in parallel (up to max_concurrent at a time).

        Returns a list of bytes in the same order as *texts*.
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def _gen(text: str) -> bytes:
            async with semaphore:
                return await self.generate_segment_audio(text, voice_id)

        start = time.perf_counter()
        results = await asyncio.gather(*[_gen(t) for t in texts], return_exceptions=True)
        elapsed = time.perf_counter() - start
        print(f"⚡ Parallel audio generation for {len(texts)} segments completed in {elapsed:.1f}s")

        # Replace exceptions with empty bytes
        return [r if isinstance(r, bytes) else b"" for r in results]

    async def stream_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> AsyncIterator[bytes]:
        """Yield MP3 chunks for a StreamingResponse."""
        if self._mode == "edge-tts":
            data = await self._generate_edge_tts(text)
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
            print(f"⚠️  ElevenLabs streaming error, falling back to Edge-TTS: {e}")
            data = await self._generate_edge_tts(text)
            yield data

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def estimate_duration(self, text: str) -> float:
        """Estimate audio duration (seconds) at ~150 wpm."""
        words = len(text.split())
        return (words / 150) * 60

    async def get_available_voices(self) -> list[dict]:
        """Fetch the voice catalogue from ElevenLabs (or an Edge-TTS entry)."""
        if self._mode == "edge-tts":
            return [
                {
                    "voice_id": EDGE_TTS_VOICE,
                    "name": "Edge-TTS (free)",
                    "description": f"Microsoft Edge neural voice ({EDGE_TTS_VOICE}) – set ELEVENLABS_API_KEY for premium voices",
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

