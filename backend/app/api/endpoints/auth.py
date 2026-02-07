"""
Authentication Endpoints - GitHub OAuth
"""

import secrets
import json
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Response, Header
from fastapi.responses import RedirectResponse
from typing import Optional as Opt
import httpx
from jose import jwt

from app.config import get_settings
from app.models.schemas import User, UserResponse, APIResponse

router = APIRouter()
settings = get_settings()

# In-memory user store (replace with database in production)
users_db: dict[str, User] = {}
sessions_db: dict[str, str] = {}  # session_token -> user_id

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")


def _save_users():
    """Persist users to disk"""
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, "users.json")
    data = {}
    for uid, user in users_db.items():
        data[uid] = user.model_dump()
        # Convert datetime to ISO string for JSON serialization
        if data[uid].get("created_at"):
            data[uid]["created_at"] = data[uid]["created_at"].isoformat()
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)


def _load_users():
    """Load users from disk"""
    filepath = os.path.join(DATA_DIR, "users.json")
    if not os.path.exists(filepath):
        return
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        for uid, udata in data.items():
            users_db[uid] = User(**udata)
    except Exception:
        pass  # Start fresh if file is corrupted


# Load users on module init
_load_users()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> Optional[dict]:
    """Decode JWT access token"""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except Exception:
        return None


async def get_current_user(authorization: str = Header(None, alias="Authorization")) -> User:
    """Get current authenticated user - use as Depends(get_current_user)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)

    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = users_db.get(payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User session expired. Please login again.")

    return user


@router.get("/github")
async def github_auth():
    """Initiate GitHub OAuth flow"""
    state = secrets.token_urlsafe(32)
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        f"&redirect_uri={settings.github_redirect_uri}"
        f"&scope=repo,read:user,user:email"
        f"&state={state}"
    )
    
    return {"auth_url": github_auth_url, "state": state}


@router.get("/github/callback")
async def github_callback(code: str, state: str):
    """Handle GitHub OAuth callback"""
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_redirect_uri,
            },
            headers={"Accept": "application/json"}
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Get user info from GitHub
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        github_user = user_response.json()
        
        # Get user email
        emails_response = await client.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }
        )
        
        primary_email = None
        if emails_response.status_code == 200:
            emails = emails_response.json()
            for email in emails:
                if email.get("primary"):
                    primary_email = email.get("email")
                    break
    
    # Create or update user
    user_id = f"user_{github_user['id']}"
    user = User(
        id=user_id,
        github_id=github_user["id"],
        username=github_user["login"],
        email=primary_email,
        avatar_url=github_user.get("avatar_url"),
        access_token=access_token,
    )
    
    users_db[user_id] = user
    _save_users()

    # Create session token
    session_token = create_access_token({"user_id": user_id})
    
    # Redirect to frontend with token (302 is standard for OAuth)
    return RedirectResponse(
        url=f"{settings.frontend_url}/auth/callback?token={session_token}",
        status_code=302
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        avatar_url=user.avatar_url
    )


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    """Logout current user"""
    # In production, invalidate the token
    return APIResponse(success=True, message="Logged out successfully")

