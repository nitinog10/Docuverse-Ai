"""
Main API Router - Combines all route modules
"""

from fastapi import APIRouter

from app.api.endpoints import auth, repositories, files, walkthroughs, diagrams, sandbox, documentation

router = APIRouter()

# Include all endpoint routers
router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

router.include_router(
    repositories.router,
    prefix="/repositories",
    tags=["Repositories"]
)

router.include_router(
    files.router,
    prefix="/files",
    tags=["Files"]
)

router.include_router(
    walkthroughs.router,
    prefix="/walkthroughs",
    tags=["Walkthroughs"]
)

router.include_router(
    diagrams.router,
    prefix="/diagrams",
    tags=["Diagrams"]
)

router.include_router(
    sandbox.router,
    prefix="/sandbox",
    tags=["Sandbox"]
)

router.include_router(
    documentation.router,
    prefix="/documentation",
    tags=["Documentation"]
)

