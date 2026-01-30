"""
Audio Generator Service - Text-to-Speech Integration

Converts walkthrough scripts into AI voice narration using pyttsx3.
Creates the "Senior Engineer" persona voice.
"""

import os
import io
import tempfile
from typing import Optional, AsyncIterator
import aiofiles

from app.config import get_settings

settings = get_settings()


class AudioGeneratorService:
    """
    pyttsx3-based audio synthesis service.
    
    Converts text scripts into speech using the system's
    text-to-speech engine (offline, no API key required).
    """
    
    def __init__(self):
        self._engine = None
        self._voice_id = settings.tts_voice_id
        self._rate = settings.tts_rate
    
    def _initialize(self):
        """Lazy initialization of pyttsx3 engine"""
        if self._engine is not None:
            return
        
        try:
            import pyttsx3
            
            self._engine = pyttsx3.init()
            
            # Configure voice settings
            self._engine.setProperty('rate', self._rate)
            
            # Try to set the voice if specified
            if self._voice_id:
                voices = self._engine.getProperty('voices')
                for voice in voices:
                    if self._voice_id in voice.id:
                        self._engine.setProperty('voice', voice.id)
                        break
            
            print("✅ pyttsx3 TTS engine initialized")
            
        except ImportError:
            print("⚠️ pyttsx3 not installed, using mock audio")
            self._engine = "mock"
        except Exception as e:
            print(f"⚠️ pyttsx3 initialization failed: {e}")
            self._engine = "mock"
    
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
            Audio data as bytes (WAV format)
        """
        self._initialize()
        
        if self._engine == "mock":
            # Return a small silent audio for testing
            return self._generate_mock_audio(text)
        
        try:
            # Set voice if override provided
            if voice_id:
                voices = self._engine.getProperty('voices')
                for voice in voices:
                    if voice_id in voice.id:
                        self._engine.setProperty('voice', voice.id)
                        break
            
            # Generate audio to a temporary file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            self._engine.save_to_file(text, tmp_path)
            self._engine.runAndWait()
            
            # Read the generated audio
            with open(tmp_path, 'rb') as f:
                audio_bytes = f.read()
            
            # Clean up temp file
            os.unlink(tmp_path)
            
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
        # Combine all segments into one text for smoother audio
        full_text = " ".join(segments)
        return await self.generate_segment_audio(full_text, voice_id)
    
    async def stream_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> AsyncIterator[bytes]:
        """
        Stream audio generation for real-time playback.
        
        Note: pyttsx3 doesn't support true streaming, so we generate
        the full audio and yield it in chunks.
        
        Args:
            text: Text to convert to speech
            voice_id: Optional voice ID override
            
        Yields:
            Audio chunks as bytes
        """
        audio_data = await self.generate_segment_audio(text, voice_id)
        
        # Yield in chunks of 4KB
        chunk_size = 4096
        for i in range(0, len(audio_data), chunk_size):
            yield audio_data[i:i + chunk_size]
    
    def estimate_duration(self, text: str) -> float:
        """
        Estimate audio duration in seconds.
        
        Based on average speaking rate of 150 words per minute.
        """
        words = len(text.split())
        return (words / 150) * 60
    
    def _generate_mock_audio(self, text: str) -> bytes:
        """
        Generate a minimal valid WAV file for testing.
        
        This creates a tiny silent WAV so the API still works
        without actual audio generation.
        """
        import struct
        
        # WAV file parameters
        sample_rate = 22050
        bits_per_sample = 16
        num_channels = 1
        
        # Calculate duration based on text
        duration = self.estimate_duration(text)
        num_samples = int(sample_rate * min(duration, 5))  # Cap at 5 seconds
        
        # Generate silent audio data
        audio_data = b'\x00\x00' * num_samples
        
        # Build WAV header
        data_size = len(audio_data)
        file_size = 36 + data_size
        
        wav_header = struct.pack(
            '<4sI4s4sIHHIIHH4sI',
            b'RIFF',
            file_size,
            b'WAVE',
            b'fmt ',
            16,  # Subchunk1Size
            1,   # AudioFormat (PCM)
            num_channels,
            sample_rate,
            sample_rate * num_channels * bits_per_sample // 8,  # ByteRate
            num_channels * bits_per_sample // 8,  # BlockAlign
            bits_per_sample,
            b'data',
            data_size,
        )
        
        return wav_header + audio_data
    
    async def get_available_voices(self) -> list[dict]:
        """
        Get list of available voices from the system.
        
        Returns:
            List of voice information dictionaries
        """
        self._initialize()
        if self._engine == "mock":
            return [
                {
                    "voice_id": "default",
                    "name": "Default Voice",
                    "description": "System default text-to-speech voice",
                }
            ]
        
        try:
            voices = self._engine.getProperty('voices')
            
            return [
                {
                    "voice_id": voice.id,
                    "name": voice.name,
                    "description": f"Language: {getattr(voice, 'languages', ['Unknown'])}",
                }
                for voice in voices
            ]
            
        except Exception as e:
            print(f"Error fetching voices: {e}")
            return []
    
    async def save_audio_file(
        self,
        audio_data: bytes,
        file_path: str,
    ) -> bool:
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

