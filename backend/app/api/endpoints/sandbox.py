"""
Live Sandbox Endpoints - Code Execution
"""

import subprocess
import tempfile
import os
import asyncio
from typing import Dict, Any
import uuid
import time

from fastapi import APIRouter, HTTPException, Header

from app.config import get_settings
from app.models.schemas import (
    SandboxExecutionRequest,
    SandboxExecutionResult,
    APIResponse,
)
from app.api.endpoints.auth import get_current_user

router = APIRouter()
settings = get_settings()

# Supported languages and their execution commands
LANGUAGE_CONFIG = {
    "python": {
        "extension": ".py",
        "command": ["python", "-u"],
        "timeout": 10,
    },
    "javascript": {
        "extension": ".js",
        "command": ["node"],
        "timeout": 10,
    },
    "typescript": {
        "extension": ".ts",
        "command": ["npx", "ts-node"],
        "timeout": 15,
    },
}

# Dangerous patterns to block
DANGEROUS_PATTERNS = [
    "import os",
    "import subprocess",
    "import sys",
    "__import__",
    "eval(",
    "exec(",
    "open(",
    "file(",
    "require('fs')",
    "require('child_process')",
    "require('os')",
    "process.env",
    "rm -rf",
    "del /",
]


def sanitize_code(code: str, language: str) -> tuple[bool, str]:
    """Check code for dangerous patterns"""
    code_lower = code.lower()
    
    for pattern in DANGEROUS_PATTERNS:
        if pattern.lower() in code_lower:
            return False, f"Blocked dangerous pattern: {pattern}"
    
    return True, ""


async def execute_code_async(
    code: str,
    language: str,
    variables: Dict[str, Any]
) -> SandboxExecutionResult:
    """Execute code in isolated environment"""
    
    if language not in LANGUAGE_CONFIG:
        return SandboxExecutionResult(
            success=False,
            output="",
            error=f"Unsupported language: {language}",
            execution_time=0,
        )
    
    # Sanitize code
    is_safe, error_msg = sanitize_code(code, language)
    if not is_safe:
        return SandboxExecutionResult(
            success=False,
            output="",
            error=error_msg,
            execution_time=0,
        )
    
    config = LANGUAGE_CONFIG[language]
    
    # Prepare code with variables
    if language == "python":
        var_code = "\n".join(
            f"{k} = {repr(v)}" for k, v in variables.items()
        )
        full_code = f"{var_code}\n\n{code}" if var_code else code
    elif language in ["javascript", "typescript"]:
        var_code = "\n".join(
            f"const {k} = {json_stringify(v)};" for k, v in variables.items()
        )
        full_code = f"{var_code}\n\n{code}" if var_code else code
    else:
        full_code = code
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=config["extension"],
        delete=False,
        encoding="utf-8"
    ) as f:
        f.write(full_code)
        temp_path = f.name
    
    start_time = time.time()
    
    try:
        # Execute with timeout
        process = await asyncio.create_subprocess_exec(
            *config["command"],
            temp_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=config["timeout"]
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return SandboxExecutionResult(
                success=False,
                output="",
                error=f"Execution timed out after {config['timeout']} seconds",
                execution_time=config["timeout"] * 1000,
            )
        
        execution_time = (time.time() - start_time) * 1000  # Convert to ms
        
        if process.returncode == 0:
            return SandboxExecutionResult(
                success=True,
                output=stdout.decode("utf-8", errors="replace"),
                error=None,
                execution_time=execution_time,
            )
        else:
            return SandboxExecutionResult(
                success=False,
                output=stdout.decode("utf-8", errors="replace"),
                error=stderr.decode("utf-8", errors="replace"),
                execution_time=execution_time,
            )
            
    except Exception as e:
        return SandboxExecutionResult(
            success=False,
            output="",
            error=str(e),
            execution_time=(time.time() - start_time) * 1000,
        )
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_path)
        except:
            pass


def json_stringify(value: Any) -> str:
    """Convert Python value to JavaScript literal"""
    import json
    return json.dumps(value)


@router.post("/execute", response_model=SandboxExecutionResult)
async def execute_code(
    request: SandboxExecutionRequest,
    authorization: str = Header(None)
):
    """Execute code in sandbox environment"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await execute_code_async(
        code=request.code,
        language=request.language,
        variables=request.variables,
    )
    
    return result


@router.get("/languages")
async def get_supported_languages(authorization: str = Header(None)):
    """Get list of supported languages for sandbox"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "languages": list(LANGUAGE_CONFIG.keys()),
        "details": {
            lang: {
                "extension": config["extension"],
                "timeout": config["timeout"],
            }
            for lang, config in LANGUAGE_CONFIG.items()
        }
    }


@router.post("/validate")
async def validate_code(
    request: SandboxExecutionRequest,
    authorization: str = Header(None)
):
    """Validate code without executing"""
    user = await get_current_user(authorization)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    is_safe, error_msg = sanitize_code(request.code, request.language)
    
    if not is_safe:
        return APIResponse(
            success=False,
            message=error_msg,
        )
    
    return APIResponse(
        success=True,
        message="Code is valid and safe to execute",
    )

