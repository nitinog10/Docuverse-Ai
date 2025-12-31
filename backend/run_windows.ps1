# DocuVerse Backend Run Script for Windows

Write-Host "🚀 Starting DocuVerse Backend..." -ForegroundColor Cyan

# Navigate to backend directory
Set-Location $PSScriptRoot

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run setup_windows.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "Please create .env file with your API keys" -ForegroundColor Yellow
}

# Activate virtual environment
Write-Host "`n🔧 Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Run the server
Write-Host "`n🌐 Starting FastAPI server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

uvicorn app.main:app --reload --port 8000

