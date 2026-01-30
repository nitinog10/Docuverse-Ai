# Install dependencies with retry logic and extended timeout

Write-Host "📥 Installing DocuVerse dependencies..." -ForegroundColor Cyan
Write-Host "   This may take several minutes depending on your connection speed`n" -ForegroundColor Yellow

# Activate virtual environment if not already activated
if (-not $env:VIRTUAL_ENV) {
    if (Test-Path "venv\Scripts\Activate.ps1") {
        Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
        & .\venv\Scripts\Activate.ps1
    } else {
        Write-Host "❌ Virtual environment not found! Run setup_windows.ps1 first." -ForegroundColor Red
        exit 1
    }
}

# Function to install with retry
function Install-WithRetry {
    param(
        [string]$Command,
        [int]$MaxRetries = 3
    )
    
    $retryCount = 0
    while ($retryCount -lt $MaxRetries) {
        try {
            Write-Host "`nAttempt $($retryCount + 1) of $MaxRetries..." -ForegroundColor Yellow
            Invoke-Expression $Command
            if ($LASTEXITCODE -eq 0) {
                return $true
            }
        } catch {
            Write-Host "❌ Error: $_" -ForegroundColor Red
        }
        
        $retryCount++
        if ($retryCount -lt $MaxRetries) {
            $waitTime = [math]::Min($retryCount * 10, 30)
            Write-Host "⏳ Waiting $waitTime seconds before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds $waitTime
        }
    }
    
    return $false
}

# Try installing with extended timeout
$success = Install-WithRetry -Command "pip install --default-timeout=300 --retries=3 -r requirements.txt"

if (-not $success) {
    Write-Host "`n❌ Installation failed after multiple retries." -ForegroundColor Red
    Write-Host "`n💡 Alternative solutions:" -ForegroundColor Cyan
    Write-Host "   1. Install packages in smaller batches:" -ForegroundColor White
    Write-Host "      pip install --default-timeout=300 fastapi uvicorn pydantic" -ForegroundColor Gray
    Write-Host "      pip install --default-timeout=300 tree-sitter tree-sitter-python" -ForegroundColor Gray
    Write-Host "      pip install --default-timeout=300 langchain langchain-openai openai" -ForegroundColor Gray
    Write-Host "      pip install --default-timeout=300 chromadb pyttsx3" -ForegroundColor Gray
    Write-Host "      pip install --default-timeout=300 -r requirements.txt" -ForegroundColor Gray
    Write-Host "`n   2. Use a different PyPI mirror:" -ForegroundColor White
    Write-Host "      pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt" -ForegroundColor Gray
    Write-Host "`n   3. Check your internet connection and firewall settings" -ForegroundColor White
    exit 1
}

Write-Host "`n✅ All dependencies installed successfully!" -ForegroundColor Green

