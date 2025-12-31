# DocuVerse API Contracts

## Base URL
```
http://localhost:8000/api
```

## Authentication

All authenticated endpoints require the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### GET /auth/github
Initiate GitHub OAuth flow.

**Response:**
```json
{
  "auth_url": "https://github.com/login/oauth/authorize?...",
  "state": "random_state_string"
}
```

### GET /auth/github/callback
Handle OAuth callback and create session.

**Query Parameters:**
- `code` (string): OAuth authorization code
- `state` (string): State parameter for CSRF protection

**Response:** Redirects to frontend with token

### GET /auth/me
Get current authenticated user.

**Response:**
```json
{
  "id": "user_123456",
  "username": "developer",
  "email": "dev@example.com",
  "avatar_url": "https://avatars.githubusercontent.com/..."
}
```

---

## Repository Endpoints

### GET /repositories/github
List user's GitHub repositories.

**Response:**
```json
[
  {
    "id": 12345678,
    "name": "my-repo",
    "full_name": "user/my-repo",
    "description": "Repository description",
    "language": "Python",
    "stars": 42,
    "updated_at": "2024-01-15T10:30:00Z",
    "private": false
  }
]
```

### POST /repositories/connect
Connect a GitHub repository.

**Request:**
```json
{
  "full_name": "user/my-repo"
}
```

**Response:**
```json
{
  "id": "repo_abc123",
  "name": "my-repo",
  "full_name": "user/my-repo",
  "description": "Repository description",
  "language": "Python",
  "is_indexed": false,
  "indexed_at": null
}
```

### GET /repositories/
List connected repositories.

**Response:**
```json
[
  {
    "id": "repo_abc123",
    "name": "my-repo",
    "full_name": "user/my-repo",
    "description": "Repository description",
    "language": "Python",
    "is_indexed": true,
    "indexed_at": "2024-01-15T10:30:00Z"
  }
]
```

### GET /repositories/{repo_id}
Get repository details.

**Response:** Same as single item in list above.

### POST /repositories/{repo_id}/index
Start repository indexing.

**Response:**
```json
{
  "success": true,
  "message": "Repository indexing started"
}
```

### DELETE /repositories/{repo_id}
Delete a connected repository.

**Response:**
```json
{
  "success": true,
  "message": "Repository deleted"
}
```

---

## File Endpoints

### GET /files/{repo_id}/tree
Get repository file tree.

**Response:**
```json
[
  {
    "id": "src",
    "path": "src",
    "name": "src",
    "is_directory": true,
    "language": null,
    "size": null,
    "children": [
      {
        "id": "src_main_py",
        "path": "src/main.py",
        "name": "main.py",
        "is_directory": false,
        "language": "python",
        "size": 2048,
        "children": []
      }
    ]
  }
]
```

### GET /files/{repo_id}/content
Get file content.

**Query Parameters:**
- `path` (string): File path within repository

**Response:** Plain text file content

### GET /files/{repo_id}/ast
Get AST for a file.

**Query Parameters:**
- `path` (string): File path within repository

**Response:**
```json
[
  {
    "id": "src/main.py:1:abc123",
    "type": "function",
    "name": "main",
    "start_line": 1,
    "end_line": 15,
    "start_col": 0,
    "end_col": 0,
    "docstring": "Main entry point",
    "parameters": ["args", "kwargs"],
    "return_type": "None",
    "children": []
  }
]
```

### GET /files/{repo_id}/dependencies
Get dependency graph.

**Response:**
```json
{
  "nodes": ["src/main.py", "src/utils.py", "src/config.py"],
  "edges": [
    {
      "source": "src/main.py",
      "target": "src/utils.py",
      "import_name": "utils",
      "is_external": false
    }
  ]
}
```

---

## Walkthrough Endpoints

### POST /walkthroughs/generate
Generate a walkthrough for a file.

**Request:**
```json
{
  "repository_id": "repo_abc123",
  "file_path": "src/auth/auth_flow.py",
  "view_mode": "developer"
}
```

**Response:**
```json
{
  "id": "wt_xyz789",
  "file_path": "src/auth/auth_flow.py",
  "title": "Walkthrough: auth_flow.py",
  "summary": "Technical walkthrough covering authentication flow...",
  "view_mode": "developer",
  "segments": [
    {
      "id": "seg_001",
      "order": 0,
      "text": "Welcome to the walkthrough of auth_flow.py...",
      "start_line": 1,
      "end_line": 10,
      "highlight_lines": [1, 2, 3, 4, 5],
      "duration_estimate": 18.5
    }
  ],
  "total_duration": 245.0,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### GET /walkthroughs/{walkthrough_id}
Get walkthrough script.

**Response:** Same as POST response above.

### GET /walkthroughs/{walkthrough_id}/audio
Get audio walkthrough data.

**Response:**
```json
{
  "id": "wt_xyz789",
  "walkthrough_script_id": "wt_xyz789",
  "file_path": "src/auth/auth_flow.py",
  "audio_segments": [
    {
      "id": "audio_001",
      "script_segment_id": "seg_001",
      "audio_url": "/api/walkthroughs/wt_xyz789/audio/segment/seg_001",
      "duration": 18.5,
      "start_time": 0.0,
      "end_time": 18.5
    }
  ],
  "full_audio_url": "/api/walkthroughs/wt_xyz789/audio/stream",
  "total_duration": 245.0,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### GET /walkthroughs/{walkthrough_id}/audio/stream
Stream full walkthrough audio.

**Response:** Audio stream (audio/mpeg)

### DELETE /walkthroughs/{walkthrough_id}
Delete a walkthrough.

**Response:**
```json
{
  "success": true,
  "message": "Walkthrough deleted"
}
```

---

## Diagram Endpoints

### POST /diagrams/generate
Generate a Mermaid diagram.

**Request:**
```json
{
  "repository_id": "repo_abc123",
  "diagram_type": "flowchart",
  "file_path": "src/auth/auth_flow.py"
}
```

**Diagram Types:**
- `flowchart`
- `classDiagram`
- `sequenceDiagram`
- `erDiagram`

**Response:**
```json
{
  "id": "diagram_def456",
  "type": "flowchart",
  "title": "flowchart for auth_flow.py",
  "mermaid_code": "flowchart TD\n    A[Start] --> B[Process]\n    B --> C[End]",
  "source_file": "src/auth/auth_flow.py",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### GET /diagrams/{diagram_id}
Get diagram by ID.

**Response:** Same as POST response above.

---

## Sandbox Endpoints

### POST /sandbox/execute
Execute code in sandbox.

**Request:**
```json
{
  "code": "print('Hello, World!')",
  "language": "python",
  "variables": {
    "name": "DocuVerse",
    "count": 42
  }
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello, World!\n",
  "error": null,
  "execution_time": 45.2
}
```

### GET /sandbox/languages
Get supported languages.

**Response:**
```json
{
  "languages": ["python", "javascript", "typescript"],
  "details": {
    "python": {
      "extension": ".py",
      "timeout": 10
    },
    "javascript": {
      "extension": ".js",
      "timeout": 10
    }
  }
}
```

### POST /sandbox/validate
Validate code without executing.

**Request:**
```json
{
  "code": "print('test')",
  "language": "python",
  "variables": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code is valid and safe to execute"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (no access to resource)
- `404` - Not Found
- `500` - Internal Server Error

