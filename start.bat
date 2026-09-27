@echo off
echo Starting DocuMind AI Full Stack...
start "DocuMind Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\.venv\Scripts\activate && uvicorn main:app --reload --port 8000"
start "DocuMind Frontend (React Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both servers initiated!
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173
pause
