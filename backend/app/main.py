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
    
    # CORS Configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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
        reload=True,
        reload_dirs=["app"],
        reload_excludes=["repos", "chroma_db", "*.pyc"],
    )

