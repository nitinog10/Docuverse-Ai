"""Test dependency injection with Depends(get_current_user)"""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.api.endpoints.auth import users_db, create_access_token
from app.models.schemas import User
from datetime import datetime


@pytest.fixture
def client():
    """Create a test client"""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def mock_user():
    """Create a mock user"""
    user = User(
        id="user_test123",
        github_id=99999,
        username="testuser",
        email="test@example.com",
        avatar_url="https://example.com/avatar.png",
        access_token="github_token_123",
        created_at=datetime.utcnow()
    )
    users_db[user.id] = user
    yield user
    # Cleanup
    if user.id in users_db:
        del users_db[user.id]


@pytest.fixture
def auth_headers(mock_user):
    """Create authorization headers with valid token"""
    token = create_access_token({"user_id": mock_user.id})
    return {"Authorization": f"Bearer {token}"}


def test_auth_endpoint_uses_depends(client, auth_headers):
    """Test /api/auth/me endpoint uses Depends(get_current_user)"""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"


def test_auth_endpoint_rejects_invalid_token(client):
    """Test /api/auth/me endpoint rejects invalid tokens"""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401


def test_repositories_list_uses_depends(client, auth_headers):
    """Test /api/repositories/ endpoint uses Depends(get_current_user)"""
    response = client.get("/api/repositories/", headers=auth_headers)
    # Should succeed (empty list is fine)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_repositories_list_rejects_no_auth(client):
    """Test /api/repositories/ endpoint rejects requests without auth"""
    response = client.get("/api/repositories/")
    assert response.status_code == 401


def test_repositories_github_uses_depends(client, auth_headers, mock_user):
    """Test /api/repositories/github endpoint uses Depends(get_current_user)"""
    # This will fail at GitHub API call level, but should pass auth
    response = client.get("/api/repositories/github", headers=auth_headers)
    # May fail due to invalid GitHub token, but should not be 401
    # It should either succeed or fail with a different error
    assert response.status_code != 401


def test_files_tree_uses_depends(client, auth_headers):
    """Test /api/files/{repo_id}/tree endpoint uses Depends(get_current_user)"""
    response = client.get("/api/files/nonexistent_repo/tree", headers=auth_headers)
    # Should fail with 404 (repo not found), not 401 (not authenticated)
    assert response.status_code == 404


def test_files_tree_rejects_no_auth(client):
    """Test /api/files/{repo_id}/tree endpoint rejects requests without auth"""
    response = client.get("/api/files/nonexistent_repo/tree")
    assert response.status_code == 401


def test_walkthroughs_get_uses_depends(client, auth_headers):
    """Test /api/walkthroughs/{id} endpoint uses Depends(get_current_user)"""
    response = client.get("/api/walkthroughs/nonexistent_id", headers=auth_headers)
    # Should fail with 404 (not found), not 401 (not authenticated)
    assert response.status_code == 404


def test_walkthroughs_get_rejects_no_auth(client):
    """Test /api/walkthroughs/{id} endpoint rejects requests without auth"""
    response = client.get("/api/walkthroughs/nonexistent_id")
    assert response.status_code == 401


def test_diagrams_get_uses_depends(client, auth_headers):
    """Test /api/diagrams/{id} endpoint uses Depends(get_current_user)"""
    response = client.get("/api/diagrams/nonexistent_id", headers=auth_headers)
    # Should fail with 404 (not found), not 401 (not authenticated)
    assert response.status_code == 404


def test_diagrams_get_rejects_no_auth(client):
    """Test /api/diagrams/{id} endpoint rejects requests without auth"""
    response = client.get("/api/diagrams/nonexistent_id")
    assert response.status_code == 401


def test_sandbox_languages_uses_depends(client, auth_headers):
    """Test /api/sandbox/languages endpoint uses Depends(get_current_user)"""
    response = client.get("/api/sandbox/languages", headers=auth_headers)
    # Should succeed
    assert response.status_code == 200
    assert "languages" in response.json()


def test_sandbox_languages_rejects_no_auth(client):
    """Test /api/sandbox/languages endpoint rejects requests without auth"""
    response = client.get("/api/sandbox/languages")
    assert response.status_code == 401


def test_logout_uses_depends(client, auth_headers):
    """Test /api/auth/logout endpoint uses Depends(get_current_user)"""
    response = client.post("/api/auth/logout", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_logout_rejects_no_auth(client):
    """Test /api/auth/logout endpoint rejects requests without auth"""
    response = client.post("/api/auth/logout")
    assert response.status_code == 401


def test_no_manual_auth_checks_in_endpoints(client, auth_headers):
    """Test that endpoints don't have manual 'if not user' checks"""
    # The dependency injection should handle all auth checks
    # If we get past 401, we should get business logic errors (404, 400, etc.)

    endpoints = [
        ("/api/repositories/nonexistent", "get", 404),
        ("/api/files/nonexistent/tree", "get", 404),
        ("/api/walkthroughs/nonexistent", "get", 404),
        ("/api/diagrams/nonexistent", "get", 404),
    ]

    for endpoint, method, expected_status in endpoints:
        if method == "get":
            response = client.get(endpoint, headers=auth_headers)
        elif method == "post":
            response = client.post(endpoint, headers=auth_headers, json={})

        # Should not be 401 (auth is valid)
        assert response.status_code != 401, f"Endpoint {endpoint} returned 401 with valid auth"
        # Should be the expected business logic error
        assert response.status_code == expected_status, f"Endpoint {endpoint} returned {response.status_code} instead of {expected_status}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
