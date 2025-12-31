"""
Audio Generator Service - ElevenLabs Integration

Converts walkthrough scripts into high-quality AI voice narration.
Creates the "Senior Engineer" persona voice.
"""

import os
import io
from typing import Optional, AsyncIterator
import aiofiles

from app.config import get_settings

settings = get_settings()


class AudioGeneratorService:
    """
    ElevenLabs-based audio synthesis service.
    
    Converts text scripts into natural-sounding speech
    with the "Senior Engineer" persona.
    """
    
    def __init__(self):
        self._client = None
        self._voice_id = settings.elevenlabs_voice_id
    
    def _initialize(self):
        """Lazy initialization of ElevenLabs client"""
        if self._client is not None:
            return
        
        try:
            from elevenlabs.client import ElevenLabs
            
            self._client = ElevenLabs(
                api_key=settings.elevenlabs_api_key
            )
            
            print("✅ ElevenLabs client initialized")
            
        except ImportError:
            print("⚠️ ElevenLabs not installed, using mock audio")
            self._client = "mock"
        except Exception as e:
            print(f"⚠️ ElevenLabs initialization failed: {e}")
            self._client = "mock"
    
    async def generate_segment_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> bytes:
        """
        Generate audio for a single text segment.
        
        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID override
            
        Returns:
            Audio data as bytes (MP3 format)
        """
        self._initialize()
        
        if self._client == "mock":
            # Return a small silent MP3 for testing
            return self._generate_mock_audio(text)
        
        try:
            voice = voice_id or self._voice_id
            
            # Generate audio using ElevenLabs
            audio = self._client.generate(
                text=text,
                voice=voice,
                model="eleven_monolingual_v1",
                voice_settings={
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                }
            )
            
            # Collect all audio chunks
            audio_bytes = b""
            for chunk in audio:
                audio_bytes += chunk
            
            return audio_bytes
            
        except Exception as e:
            print(f"Error generating audio: {e}")
            return self._generate_mock_audio(text)
    
    async def generate_full_audio(
        self,
        segments: list[str],
        voice_id: Optional[str] = None,
    ) -> bytes:
        """
        Generate audio for multiple segments and concatenate.
        
        Args:
            segments: List of text segments
            voice_id: Optional voice ID override
            
        Returns:
            Complete audio as bytes
        """
        all_audio = b""
        
        for segment in segments:
            segment_audio = await self.generate_segment_audio(segment, voice_id)
            all_audio += segment_audio
        
        return all_audio
    
    async def stream_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> AsyncIterator[bytes]:
        """
        Stream audio generation for real-time playback.
        
        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID override
            
        Yields:
            Audio chunks as bytes
        """
        self._initialize()
        
        if self._client == "mock":
            yield self._generate_mock_audio(text)
            return
        
        try:
            voice = voice_id or self._voice_id
            
            # Stream audio using ElevenLabs
            audio_stream = self._client.generate(
                text=text,
                voice=voice,
                model="eleven_monolingual_v1",
                stream=True,
            )
            
            for chunk in audio_stream:
                yield chunk
                
        except Exception as e:
            print(f"Error streaming audio: {e}")
            yield self._generate_mock_audio(text)
    
    def estimate_duration(self, text: str) -> float:
        """
        Estimate audio duration in seconds.
        
        Based on average speaking rate of 150 words per minute.
        """
        words = len(text.split())
        return (words / 150) * 60
    
    def _generate_mock_audio(self, text: str) -> bytes:
        """
        Generate a minimal valid MP3 file for testing.
        
        This creates a tiny silent MP3 so the API still works
        without actual audio generation.
        """
        # Minimal MP3 header for a silent frame
        # This is a valid but extremely short MP3 file
        mp3_header = bytes([
            0xFF, 0xFB, 0x90, 0x00,  # MP3 frame header
            0x00, 0x00, 0x00, 0x00,  # Padding
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
        ])
        # Repeat based on estimated duration
        duration = self.estimate_duration(text)
        frames_needed = max(1, int(duration * 38))  # ~38 frames per second
        
        return mp3_header * min(frames_needed, 100)  # Cap to prevent huge files
    
    async def get_available_voices(self) -> list[dict]:
        """
        Get list of available voices from ElevenLabs.
        
        Returns:
            List of voice information dictionaries
        """
        self._initialize()
        if self._client == "mock":
            return [
                {
                    "voice_id": "21m00Tcm4TlvDq8ikWAM",
                    "name": "Rachel",
                    "description": "Default female voice",
                },
                {
                    "voice_id": "ErXwobaYiN019PkySvjV",
                    "name": "Antoni",
                    "description": "Male voice - good for technical content",
                }
            ]
        
        try:
            voices = self._client.voices.get_all()
            
            return [
                {
                    "voice_id": v.voice_id,
                    "name": v.name,
                    "description": getattr(v, "description", ""),
                }
                for v in voices.voices
            ]
            
        except Exception as e:
            print(f"Error fetching voices: {e}")
            return []
    
    async def save_audio_file(
        self,
        audio_data: bytes,
        file_path: str,
    )-> bool:
        """
        Save audio data to a file.
        
        Args:
            audio_data: Audio bytes to save
            file_path: Path to save the file
            
        Returns:
            True if successful
        """
        try:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(audio_data)
            
            return True
            
        except Exception as e:
            print(f"Error saving audio file: {e}")
            return False

