"""
DocuVerse FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.api.routes import router as api_router
from app.services.vector_store import VectorStoreService
from app.services.parser import ParserService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    settings = get_settings()
    
    # Initialize services on startup
    print("🚀 Initializing DocuVerse services...")
    
    # Initialize Vector Store
    vector_store = VectorStoreService()
    app.state.vector_store = vector_store
    
    # Initialize Parser Service
    parser_service = ParserService()
    app.state.parser = parser_service
    
    print("✅ DocuVerse services initialized successfully!")
    
    yield
    
    # Cleanup on shutdown
    print("🛑 Shutting down DocuVerse services...")


def create_app() -> FastAPI:
    """Factory function to create FastAPI application"""
    settings = get_settings()
    
    app = FastAPI(
        title="DocuVerse API",
        description="Generative Media Documentation Engine - Transform codebases into interactive walkthroughs",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    
    # CORS Configuration - Allow frontend to make requests
    import os
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://docuverse-ai-jg3h.vercel.app",
        settings.frontend_url,
    ]
    # Render sets RENDER_EXTERNAL_URL automatically
    render_url = os.getenv("RENDER_EXTERNAL_URL", "")
    if render_url:
        allowed_origins.append(render_url)
    # Also allow any Vercel preview deployments
    extra_origins = os.getenv("EXTRA_CORS_ORIGINS", "")
    if extra_origins:
        allowed_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o for o in allowed_origins if o],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    # Include API routes
    app.include_router(api_router, prefix="/api")
    
    @app.get("/")
    async def root():
        """Root endpoint with API information"""
        return {
            "service": "DocuVerse API",
            "version": "1.0.0",
            "status": "running",
            "docs": "/api/docs",
            "redoc": "/api/redoc",
            "health": "/health"
        }
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "service": "DocuVerse API",
            "version": "1.0.0"
        }
    
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

