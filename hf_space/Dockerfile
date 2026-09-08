FROM python:3.11-slim

# Install system audio dependencies (ffmpeg, libsndfile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install PyTorch CPU and Demucs dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir \
    torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir \
    demucs==4.1.0 \
    soundfile==0.14.0 \
    numpy \
    fastapi \
    "uvicorn[standard]" \
    python-multipart \
    pydantic

# Pre-download Demucs htdemucs_6s model weights into container cache during build
# This ensures zero download delay at runtime
RUN python3 -c "import demucs.api; print('Pre-caching htdemucs_6s...'); demucs.api.Separator(model='htdemucs_6s', device='cpu')"

# Copy application source code
COPY . /app

# Expose default Hugging Face Spaces port
EXPOSE 7860

# Run FastAPI with Uvicorn on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
