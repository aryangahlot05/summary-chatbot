# DocuMind AI Full Stack Launcher for Windows
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "    Starting DocuMind AI (FastAPI + React)          " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend
Write-Host "`n[1/2] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\.venv\Scripts\uvicorn main:app --reload --port 8000" -PassThru

# 2. Start Vite React Frontend
Write-Host "[2/2] Launching Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
$frontendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -PassThru

Write-Host "`nServices started!" -ForegroundColor Green
Write-Host "Backend API:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "Frontend Web: http://localhost:5173" -ForegroundColor White
Write-Host "====================================================" -ForegroundColor Cyan
