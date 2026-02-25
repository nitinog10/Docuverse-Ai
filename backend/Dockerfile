# ---- Base image ----
FROM python:3.11-slim AS base

# Prevent Python from buffering stdout/stderr (useful for logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies:
#  - git: required by GitPython for cloning repos
#  - build-essential: C compiler for tree-sitter native extensions
#  - curl: health-checks
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Dependencies ----
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---- Application code ----
COPY . .

# Create directories that the app expects
RUN mkdir -p repos chroma_db

# Render injects PORT; default to 8000 for local Docker usage
ENV PORT=8000

EXPOSE ${PORT}

# Production server: gunicorn with uvicorn workers
CMD gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT} \
    --workers 2 \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5
