@echo off
title The Flannels Pocket - Demucs AI Server (RTX 2050)
echo ===================================================
echo   The Flannels Pocket - Demucs AI Neural Engine
echo   Model: Meta Demucs htdemucs_6s (GPU Accelerated)
echo ===================================================
cd /d "%~dp0"
"%~dp0.venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
