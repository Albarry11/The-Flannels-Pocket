import os
import uuid
import asyncio
import shutil
import tempfile
import torch
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from separator_worker import DemucsSeparatorWorker

app = FastAPI(title="The Flannels Pocket - Demucs Audio Separation API", version="1.0.0")

# Enable CORS for frontend client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS_DIR = os.path.join(tempfile.gettempdir(), "flannels_demucs_jobs")
os.makedirs(JOBS_DIR, exist_ok=True)

# In-memory job state store
jobs: dict[str, dict] = {}
worker: DemucsSeparatorWorker | None = None

def get_worker():
    global worker
    if worker is None:
        worker = DemucsSeparatorWorker(model_name="htdemucs_6s")
    return worker

@app.get("/api/health")
def health_check():
    # Keep health checks lightweight. Never load the 2+ GB Demucs model here.
    # This allows server + Cloudflare Tunnel to idle with negligible GPU load.
    cuda_available = torch.cuda.is_available()
    return {
        "status": "online",
        "engine": "Meta Demucs htdemucs_6s",
        "device": "cuda" if cuda_available else "cpu",
        "cuda_available": cuda_available,
        "model_loaded": worker is not None,
        "idle_mode": worker is None,
    }

def run_separation_job(job_id: str, input_path: str, output_dir: str):
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = 0.1
    jobs[job_id]["message"] = "Memulai neural stem separation..."

    def on_progress(percent: float, message: str):
        jobs[job_id]["progress"] = percent
        jobs[job_id]["message"] = message

    try:
        w = get_worker()
        stem_paths = w.separate_to_flac(input_path, output_dir, progress_callback=on_progress)

        stem_urls = {}
        for stem_name in stem_paths.keys():
            stem_urls[stem_name] = f"/api/stems/{job_id}/{stem_name}"

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["message"] = "Pemisahan selesai!"
        jobs[job_id]["stems"] = stem_urls
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["message"] = f"Gagal memisahkan stem: {e}"
    finally:
        # Release model and GPU VRAM after every job.
        # Server stays online/lightweight for future friend uploads.
        if worker is not None:
            worker.unload_model()

        # Clean up original input file to save disk space
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except _:
                pass

@app.post("/api/separate")
async def create_separation_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    # Save uploaded audio file
    input_ext = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
    input_path = os.path.join(job_dir, f"source{input_ext}")

    with open(input_path, "wb") as f:
        content = await file.read()
        f.write(content)

    jobs[job_id] = {
        "id": job_id,
        "filename": file.filename,
        "status": "queued",
        "progress": 0.05,
        "message": "File audio diunggah, menunggu worker...",
        "stems": {},
        "dir": job_dir,
    }

    # Dispatch to background task queue
    background_tasks.add_task(run_separation_job, job_id, input_path, job_dir)

    return {
        "job_id": job_id,
        "status": "queued",
        "check_status_url": f"/api/status/{job_id}",
    }

@app.get("/api/status/{job_id}")
def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    job = jobs[job_id]
    return {
        "job_id": job_id,
        "status": job.get("status"),
        "progress": job.get("progress", 0),
        "message": job.get("message", ""),
        "stems": job.get("stems", {}),
        "error": job.get("error"),
    }

@app.get("/api/stems/{job_id}/{stem_name}")
def download_stem(job_id: str, stem_name: str):
    job_dir = os.path.join(JOBS_DIR, job_id)
    wav_path = os.path.join(job_dir, f"{stem_name}.wav")
    flac_path = os.path.join(job_dir, f"{stem_name}.flac")

    file_path = wav_path if os.path.exists(wav_path) else flac_path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Stem '{stem_name}' tidak ditemukan")

    media_type = "audio/wav" if file_path.endswith(".wav") else "audio/flac"
    return FileResponse(
        file_path,
        media_type=media_type,
        content_disposition_type="inline",
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
