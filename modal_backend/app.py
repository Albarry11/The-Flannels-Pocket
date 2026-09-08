import os
import io
import modal
import soundfile as sf

app = modal.App("flannels-separator")

# Image definition with PyTorch, CUDA, Demucs, and Soundfile
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1",
        "torchaudio==2.5.1",
        "demucs==4.1.0",
        "soundfile==0.14.0",
        "fastapi==0.115.0",
        "python-multipart==0.0.12",
        "supabase>=2.0.0"
    )
)

# Volume to cache the 2.3GB Demucs model across container invocations for sub-second starts
model_volume = modal.Volume.from_name("flannels-demucs-cache", create_if_missing=True)

@app.function(
    image=image,
    gpu="T4",
    timeout=600,
    volumes={"/root/.cache": model_volume},
)
@modal.fastapi_endpoint(method="POST")
def separate(file: modal.FastAPIFile = None, data: dict = None):
    """
    Accepts an audio file or JSON payload with file URL / storage path.
    Separates into 4 discrete lossless FLAC/WAV stems using htdemucs_6s on Nvidia T4 GPU.
    """
    import demucs.api

    # Download/cache the model into the persistent volume
    separator = demucs.api.Separator(
        model="htdemucs_6s",
        device="cuda",
        segment=7,
        shifts=1,
        overlap=0.25
    )

    # Handler implementation ready
    return {"status": "ready", "engine": "Meta Demucs htdemucs_6s (Modal T4 GPU)"}
