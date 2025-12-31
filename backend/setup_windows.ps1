# DocuVerse Backend Setup Script for Windows PowerShell

Write-Host "🚀 Setting up DocuVerse Backend..." -ForegroundColor Cyan

# Check if Python is installed
Write-Host "`n📋 Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✅ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found! Please install Python 3.10+ from python.org" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location $PSScriptRoot

# Create virtual environment
Write-Host "`n📦 Creating virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "⚠️  Virtual environment already exists. Removing old one..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force venv
}

python -m venv venv

if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Failed to create virtual environment!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment created" -ForegroundColor Green

# Activate virtual environment
Write-Host "`n🔧 Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Upgrade pip
Write-Host "`n⬆️  Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
Write-Host "✅ pip upgraded" -ForegroundColor Green

# Install dependencies
Write-Host "`n📥 Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host "   Using extended timeout for slow connections..." -ForegroundColor Gray
pip install --default-timeout=300 -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Copy .env file if it doesn't exist
Write-Host "`n⚙️  Setting up environment variables..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item .env.example .env
        Write-Host "✅ Created .env file from .env.example" -ForegroundColor Green
        Write-Host "⚠️  Please edit .env file with your API keys!" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  .env.example not found. Please create .env manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Create necessary directories
Write-Host "`n📁 Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "repos" | Out-Null
New-Item -ItemType Directory -Force -Path "chroma_db" | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Edit .env file with your API keys" -ForegroundColor White
Write-Host "   2. Run: .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   3. Run: uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host "`n"

