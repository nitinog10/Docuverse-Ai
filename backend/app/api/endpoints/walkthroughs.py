"""
Walkthrough Generation Endpoints - The Core Auto-Cast Feature
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Depends
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.models.schemas import (
    WalkthroughRequest,
    WalkthroughScript,
    ScriptSegment,
    AudioWalkthrough,
    AudioSegment,
    ViewMode,
    APIResponse,
    User,
)
from app.api.endpoints.auth import get_current_user
from app.api.endpoints.repositories import repositories_db

router = APIRouter()
settings = get_settings()

# In-memory walkthrough store
walkthroughs_db: dict[str, WalkthroughScript] = {}
audio_walkthroughs_db: dict[str, AudioWalkthrough] = {}


@router.post("/generate", response_model=WalkthroughScript)
async def generate_walkthrough(
    request: WalkthroughRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """Generate a walkthrough script for a file"""
    from app.services.script_generator import ScriptGeneratorService
    from app.services.parser import ParserService

    repo = repositories_db.get(request.repository_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if not repo.local_path:
        raise HTTPException(status_code=400, detail="Repository not cloned yet")
    
    # Read file content
    safe_path = os.path.normpath(request.file_path).lstrip(os.sep).lstrip("/")
    full_path = os.path.join(repo.local_path, safe_path)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")
    
    # Parse file to get structure
    parser = ParserService()
    language = parser.detect_language(safe_path)
    
    if not language:
        raise HTTPException(status_code=400, detail="Unsupported file type for walkthrough")
    
    ast_nodes = parser.parse_file(content, language, safe_path)
    
    # Generate walkthrough script
    script_generator = ScriptGeneratorService()
    
    try:
        script = await script_generator.generate_script(
            file_path=safe_path,
            content=content,
            ast_nodes=ast_nodes,
            view_mode=request.view_mode,
            repository=repo,
        )
        
        walkthroughs_db[script.id] = script
        
        # Queue audio generation in background
        background_tasks.add_task(
            generate_audio_for_walkthrough,
            script.id
        )
        
        return script
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating walkthrough: {str(e)}")


@router.get("/{walkthrough_id}", response_model=WalkthroughScript)
async def get_walkthrough(walkthrough_id: str, user: User = Depends(get_current_user)):
    """Get a walkthrough script by ID"""
    walkthrough = walkthroughs_db.get(walkthrough_id)
    
    if not walkthrough:
        raise HTTPException(status_code=404, detail="Walkthrough not found")
    
    return walkthrough


@router.get("/{walkthrough_id}/audio", response_model=AudioWalkthrough)
async def get_walkthrough_audio(walkthrough_id: str, user: User = Depends(get_current_user)):
    """Get audio data for a walkthrough"""
    audio = audio_walkthroughs_db.get(walkthrough_id)
    
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not ready yet")
    
    return audio


@router.get("/{walkthrough_id}/audio/stream")
async def stream_walkthrough_audio(walkthrough_id: str, user: User = Depends(get_current_user)):
    """Stream audio for a walkthrough"""
    from app.services.audio_generator import AudioGeneratorService

    walkthrough = walkthroughs_db.get(walkthrough_id)
    
    if not walkthrough:
        raise HTTPException(status_code=404, detail="Walkthrough not found")
    
    audio_generator = AudioGeneratorService()
    
    async def audio_stream():
        for segment in walkthrough.segments:
            audio_data = await audio_generator.generate_segment_audio(segment.text)
            yield audio_data
    
    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": f"inline; filename=walkthrough_{walkthrough_id}.mp3"
        }
    )


@router.get("/file/{repo_id}")
async def get_walkthroughs_for_file(
    repo_id: str,
    file_path: str,
    user: User = Depends(get_current_user)
) -> List[WalkthroughScript]:
    """Get all walkthroughs for a specific file"""
    repo = repositories_db.get(repo_id)
    
    if not repo or repo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Find walkthroughs for this file
    walkthroughs = [
        wt for wt in walkthroughs_db.values()
        if wt.file_path == file_path
    ]
    
    return walkthroughs


@router.delete("/{walkthrough_id}")
async def delete_walkthrough(walkthrough_id: str, user: User = Depends(get_current_user)):
    """Delete a walkthrough"""
    if walkthrough_id not in walkthroughs_db:
        raise HTTPException(status_code=404, detail="Walkthrough not found")
    
    del walkthroughs_db[walkthrough_id]
    
    # Also delete audio if exists
    if walkthrough_id in audio_walkthroughs_db:
        del audio_walkthroughs_db[walkthrough_id]
    
    return APIResponse(success=True, message="Walkthrough deleted")


async def generate_audio_for_walkthrough(walkthrough_id: str):
    """Background task to generate audio for walkthrough"""
    from app.services.audio_generator import AudioGeneratorService
    
    walkthrough = walkthroughs_db.get(walkthrough_id)
    
    if not walkthrough:
        return
    
    audio_generator = AudioGeneratorService()
    
    audio_segments = []
    current_time = 0.0
    
    for segment in walkthrough.segments:
        try:
            audio_data = await audio_generator.generate_segment_audio(segment.text)
            duration = audio_generator.estimate_duration(segment.text)
            
            audio_segment = AudioSegment(
                id=f"audio_{uuid.uuid4().hex[:8]}",
                script_segment_id=segment.id,
                audio_url=f"/api/walkthroughs/{walkthrough_id}/audio/segment/{segment.id}",
                duration=duration,
                start_time=current_time,
                end_time=current_time + duration,
            )
            
            audio_segments.append(audio_segment)
            current_time += duration
            
        except Exception as e:
            print(f"Error generating audio for segment {segment.id}: {e}")
            continue
    
    # Create audio walkthrough record
    audio_walkthrough = AudioWalkthrough(
        id=walkthrough_id,
        walkthrough_script_id=walkthrough_id,
        file_path=walkthrough.file_path,
        audio_segments=audio_segments,
        full_audio_url=f"/api/walkthroughs/{walkthrough_id}/audio/stream",
        total_duration=current_time,
    )
    
    audio_walkthroughs_db[walkthrough_id] = audio_walkthrough

