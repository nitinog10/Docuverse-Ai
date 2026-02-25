"""
Application configuration using Pydantic Settings
"""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    secret_key: str = "change-me-in-production"
    
    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/docuverse"
    
    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "https://docuverse-ai-y1za.vercel.app/api/auth/callback/github"
    
    # OpenAI
    openai_api_key: str = ""
    
    # ElevenLabs Text-to-Speech
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
    elevenlabs_model_id: str = "eleven_multilingual_v2"
    
    # ChromaDB
    chroma_persist_directory: str = "./chroma_db"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Frontend
    frontend_url: str = "https://docuverse-ai-y1za.vercel.app"
    
    # Repository Storage
    repos_directory: str = "./repos"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra fields in .env file


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

