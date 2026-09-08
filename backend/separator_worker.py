import os
import shutil
import tempfile
import torch
import numpy as np
import soundfile as sf
from pathlib import Path
from typing import Callable, Optional
from verifier import verify_stems_discrete

class DemucsSeparatorWorker:
    def __init__(self, model_name: str = "htdemucs_6s"):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._separator = None

    def _get_separator(self):
        if self._separator is None:
            import demucs.api
            print(f"[Demucs Worker] Loading model '{self.model_name}' on device '{self.device}'...")
            self._separator = demucs.api.Separator(
                model=self.model_name,
                device=self.device,
                segment=7,
                shifts=1,
                overlap=0.25,
            )
            print("[Demucs Worker] Model loaded successfully.")
        return self._separator

    def unload_model(self):
        """Release model weights and CUDA cache after a completed job."""
        self._separator = None
        if self.device == "cuda":
            torch.cuda.empty_cache()
        print("[Demucs Worker] Idle mode: model unloaded and GPU VRAM released.")

    def separate_to_flac(
        self,
        input_audio_path: str,
        output_dir: str,
        progress_callback: Optional[Callable[[float, str], None]] = None,
    ) -> dict[str, str]:
        """
        Runs Demucs 6-stem neural separation on input audio.
        Exports discrete physical FLAC files:
        - vocals.flac
        - drums.flac
        - bass.flac
        - guitar.flac
        - piano.flac
        - other.flac
        """
        os.makedirs(output_dir, exist_ok=True)
        separator = self._get_separator()

        if progress_callback:
            progress_callback(0.15, "Memuat model neural Demucs htdemucs_6s...")

        # Run Demucs separation
        # separator.separate_audio_file returns tuple of (origin, separated_dict)
        print(f"[Demucs Worker] Separating '{input_audio_path}'...")
        if progress_callback:
            progress_callback(0.35, "Neural inference: Memisahkan 6 stem audio...")

        origin, separated = separator.separate_audio_file(input_audio_path)

        exported_paths = {}
        total_stems = len(separated)
        current_idx = 0

        # Save each stem to discrete standard 16-bit 44.1kHz WAV and FLAC
        for stem_name, stem_tensor in separated.items():
            current_idx += 1
            wav_path = os.path.join(output_dir, f"{stem_name}.wav")
            flac_path = os.path.join(output_dir, f"{stem_name}.flac")

            if progress_callback:
                pct = 0.5 + (current_idx / total_stems) * 0.4
                progress_callback(pct, f"Mengekspor {stem_name}.wav (Lossless 44.1kHz)...")

            # Demucs tensors are (channels, time) in float32 [-1, 1]
            audio_np = stem_tensor.cpu().numpy()
            if audio_np.ndim == 2:
                audio_np = audio_np.T

            # Clamp float samples to prevent numeric overflow
            audio_np = np.clip(audio_np, -1.0, 1.0)

            # 1. Export standard PCM WAV for instant universal Web Audio decoding
            sf.write(
                wav_path,
                audio_np,
                samplerate=separator.samplerate,
                format="WAV",
                subtype="PCM_16",
            )

            # 2. Export FLAC for compressed archival
            sf.write(
                flac_path,
                audio_np,
                samplerate=separator.samplerate,
                format="FLAC",
                subtype="PCM_16",
            )

            exported_paths[stem_name] = wav_path
            print(f"[Demucs Worker] Exported {wav_path} ({os.path.getsize(wav_path)} bytes)")

        # Verify stems zero-bleed
        if progress_callback:
            progress_callback(0.95, "Memverifikasi zero-bleed dan korelasi spektral...")

        verification = verify_stems_discrete(exported_paths)
        print(f"[Demucs Worker] Verification result: {verification}")

        if progress_callback:
            progress_callback(1.0, "Pemisahan stem selesai!")

        return exported_paths
