import os
import uuid
import tempfile
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from separator_worker import DemucsSeparatorWorker

app = FastAPI(title="The Flannels Pocket - Demucs AI HF Cloud", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS_DIR = os.path.join(tempfile.gettempdir(), "flannels_hf_jobs")
os.makedirs(JOBS_DIR, exist_ok=True)

jobs: dict[str, dict] = {}
worker = DemucsSeparatorWorker(model_name="htdemucs_6s")

@app.get("/")
@app.get("/api/health")
def health():
    return {
        "status": "online",
        "engine": "Meta Demucs htdemucs_6s (Hugging Face Spaces Cloud)",
        "device": "cpu",
        "cloud": True
    }

def run_job(job_id: str, input_path: str, output_dir: str):
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = 0.1
    jobs[job_id]["message"] = "Memulai neural stem separation di cloud..."

    def on_progress(p: float, m: str):
        jobs[job_id]["progress"] = p
        jobs[job_id]["message"] = m

    try:
        paths = worker.separate_to_flac(input_path, output_dir, on_progress)
        urls = {}
        for stem_name in paths.keys():
            urls[stem_name] = f"/api/stems/{job_id}/{stem_name}"
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["message"] = "Pemisahan selesai!"
        jobs[job_id]["stems"] = urls
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["message"] = f"Gagal: {e}"
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except _:
                pass

@app.post("/api/separate")
async def separate_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    input_ext = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
    input_path = os.path.join(job_dir, f"source{input_ext}")

    content = await file.read()
    with open(input_path, "wb") as f:
        f.write(content)

    jobs[job_id] = {
        "id": job_id,
        "filename": file.filename,
        "status": "queued",
        "progress": 0.05,
        "message": "File diterima server Hugging Face...",
        "stems": {},
        "dir": job_dir
    }

    background_tasks.add_task(run_job, job_id, input_path, job_dir)

    return {
        "job_id": job_id,
        "status": "queued",
        "check_status_url": f"/api/status/{job_id}"
    }

@app.get("/api/status/{job_id}")
def check_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    j = jobs[job_id]
    return {
        "job_id": job_id,
        "status": j.get("status"),
        "progress": j.get("progress", 0),
        "message": j.get("message", ""),
        "stems": j.get("stems", {}),
        "error": j.get("error")
    }

@app.get("/api/stems/{job_id}/{stem_name}")
def get_stem_file(job_id: str, stem_name: str):
    job_dir = os.path.join(JOBS_DIR, job_id)
    flac_path = os.path.join(job_dir, f"{stem_name}.flac")
    if not os.path.exists(flac_path):
        raise HTTPException(status_code=404, detail=f"File {stem_name}.flac tidak ditemukan")
    return FileResponse(flac_path, media_type="audio/flac", filename=f"{stem_name}.flac")
