"""Test auth persistence and dependency injection"""

import os
import json
import tempfile
import shutil
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pytest

from app.main import create_app
from app.api.endpoints.auth import users_db, _save_users, _load_users, DATA_DIR
from app.models.schemas import User


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for testing"""
    temp_dir = tempfile.mkdtemp()
    with patch('app.api.endpoints.auth.DATA_DIR', temp_dir):
        yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def client():
    """Create a test client"""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def mock_user():
    """Create a mock user"""
    return User(
        id="user_123",
        github_id=123,
        username="testuser",
        email="test@example.com",
        avatar_url="https://example.com/avatar.png",
        access_token="test_token_123",
        created_at=datetime.utcnow()
    )


def test_save_users_creates_directory(temp_data_dir):
    """Test that _save_users creates data directory if it doesn't exist"""
    users_db.clear()
    user = User(
        id="user_1",
        github_id=1,
        username="test",
        email="test@test.com",
        avatar_url=None,
        access_token="token",
        created_at=datetime.utcnow()
    )
    users_db["user_1"] = user

    with patch('app.api.endpoints.auth.DATA_DIR', temp_data_dir):
        _save_users()

    assert os.path.exists(temp_data_dir)
    assert os.path.exists(os.path.join(temp_data_dir, "users.json"))


def test_save_and_load_users(temp_data_dir):
    """Test that users can be saved and loaded from disk"""
    users_db.clear()

    user1 = User(
        id="user_1",
        github_id=1,
        username="user1",
        email="user1@test.com",
        avatar_url="http://example.com/1.png",
        access_token="token1",
        created_at=datetime.utcnow()
    )
    user2 = User(
        id="user_2",
        github_id=2,
        username="user2",
        email="user2@test.com",
        avatar_url=None,
        access_token="token2",
        created_at=datetime.utcnow()
    )

    users_db["user_1"] = user1
    users_db["user_2"] = user2

    with patch('app.api.endpoints.auth.DATA_DIR', temp_data_dir):
        _save_users()

        # Clear in-memory store
        users_db.clear()
        assert len(users_db) == 0

        # Load from disk
        _load_users()

        assert len(users_db) == 2
        assert "user_1" in users_db
        assert "user_2" in users_db
        assert users_db["user_1"].username == "user1"
        assert users_db["user_2"].username == "user2"


def test_load_users_handles_missing_file(temp_data_dir):
    """Test that _load_users handles missing file gracefully"""
    users_db.clear()

    with patch('app.api.endpoints.auth.DATA_DIR', temp_data_dir):
        # Should not raise exception
        _load_users()
        assert len(users_db) == 0


def test_load_users_handles_corrupted_file(temp_data_dir):
    """Test that _load_users handles corrupted file gracefully"""
    users_db.clear()

    # Write corrupted JSON
    os.makedirs(temp_data_dir, exist_ok=True)
    with open(os.path.join(temp_data_dir, "users.json"), "w") as f:
        f.write("not valid json {{{")

    with patch('app.api.endpoints.auth.DATA_DIR', temp_data_dir):
        # Should not raise exception
        _load_users()
        assert len(users_db) == 0


def test_get_current_user_raises_401_without_token(client):
    """Test that endpoints raise 401 without authorization header"""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_get_current_user_raises_401_with_invalid_token(client):
    """Test that endpoints raise 401 with invalid token"""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"


def test_get_current_user_raises_401_for_expired_user(client, mock_user):
    """Test that endpoints raise 401 when user is not in users_db"""
    from app.api.endpoints.auth import create_access_token

    # Create token for non-existent user
    token = create_access_token({"user_id": "nonexistent_user"})

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert "session expired" in response.json()["detail"].lower()


def test_get_me_with_valid_token(client, mock_user):
    """Test /me endpoint with valid token"""
    from app.api.endpoints.auth import create_access_token

    users_db[mock_user.id] = mock_user
    token = create_access_token({"user_id": mock_user.id})

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == mock_user.id
    assert data["username"] == mock_user.username
    assert data["email"] == mock_user.email
    # access_token should not be in response
    assert "access_token" not in data


def test_logout_endpoint(client, mock_user):
    """Test logout endpoint"""
    from app.api.endpoints.auth import create_access_token

    users_db[mock_user.id] = mock_user
    token = create_access_token({"user_id": mock_user.id})

    response = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.json()["success"] is True


def test_protected_endpoints_require_auth(client):
    """Test that protected endpoints require authentication"""
    # Test various endpoints
    endpoints = [
        ("/api/repositories/", "get"),
        ("/api/repositories/github", "get"),
        ("/api/files/repo123/tree", "get"),
        ("/api/sandbox/languages", "get"),
    ]

    for endpoint, method in endpoints:
        if method == "get":
            response = client.get(endpoint)
        elif method == "post":
            response = client.post(endpoint)

        assert response.status_code == 401, f"Endpoint {endpoint} should require auth"


def test_github_callback_saves_user(client, temp_data_dir):
    """Test that GitHub callback saves user to disk"""
    users_db.clear()

    # Mock the GitHub OAuth flow
    mock_token_response = MagicMock()
    mock_token_response.status_code = 200
    mock_token_response.json.return_value = {"access_token": "test_access_token"}

    mock_user_response = MagicMock()
    mock_user_response.status_code = 200
    mock_user_response.json.return_value = {
        "id": 12345,
        "login": "testuser",
        "avatar_url": "https://example.com/avatar.png"
    }

    mock_emails_response = MagicMock()
    mock_emails_response.status_code = 200
    mock_emails_response.json.return_value = [
        {"email": "test@example.com", "primary": True}
    ]

    with patch('app.api.endpoints.auth.DATA_DIR', temp_data_dir), \
         patch('httpx.AsyncClient') as mock_client:

        mock_client_instance = MagicMock()
        mock_client_instance.__aenter__.return_value = mock_client_instance
        mock_client_instance.__aexit__.return_value = None
        mock_client_instance.post.return_value = mock_token_response
        mock_client_instance.get.side_effect = [mock_user_response, mock_emails_response]
        mock_client.return_value = mock_client_instance

        response = client.get("/api/auth/github/callback?code=test_code&state=test_state")

        # Should redirect
        assert response.status_code == 200

        # User should be saved
        assert len(users_db) == 1
        user_id = list(users_db.keys())[0]
        assert users_db[user_id].username == "testuser"

        # File should exist
        assert os.path.exists(os.path.join(temp_data_dir, "users.json"))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
