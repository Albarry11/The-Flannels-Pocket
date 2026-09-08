@echo off
title The Flannels Pocket - Demucs AI Server + Cloudflare Tunnel
echo ==========================================================
echo   The Flannels Pocket - Demucs AI Neural Engine (RTX 2050)
echo   Starting Local Server (Port 8000) + Cloudflare Tunnel...
echo ==========================================================
cd /d "%~dp0"

echo [1/2] Launching Demucs API Server on Port 8000...
start "Demucs API Server (GPU RTX 2050)" "%~dp0.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000

echo [2/2] Launching Cloudflare Tunnel for Remote Mobile Access...
timeout /t 3 /nobreak >nul
"%~dp0cloudflared.exe" tunnel --url http://localhost:8000
pause
