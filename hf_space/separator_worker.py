import os
import shutil
import soundfile as sf
from typing import Callable, Optional

class DemucsSeparatorWorker:
    def __init__(self, model_name: str = "htdemucs_6s"):
        self.model_name = model_name
        self.device = "cpu"
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

    def separate_to_flac(
        self,
        input_audio_path: str,
        output_dir: str,
        progress_callback: Optional[Callable[[float, str], None]] = None,
    ) -> dict[str, str]:
        """
        Runs Demucs 6-stem neural separation on input audio.
        Exports discrete physical FLAC files:
        - vocals.flac -> Vocal
        - guitar.flac -> Guitar
        - bass.flac   -> Bass
        - drums.flac  -> Drums
        """
        os.makedirs(output_dir, exist_ok=True)
        separator = self._get_separator()

        if progress_callback:
            progress_callback(0.15, "Model neural Demucs htdemucs_6s siap...")

        print(f"[Demucs Worker] Separating '{input_audio_path}' on CPU...")
        if progress_callback:
            progress_callback(0.35, "Neural inference: Memisahkan vokal, gitar, bass, drum...")

        origin, separated = separator.separate_audio_file(input_audio_path)

        # 4 Core Band Instruments: vocals, guitar, bass, drums
        target_keys = ["vocals", "guitar", "bass", "drums"]
        exported_paths = {}
        total = len(target_keys)

        for idx, stem_name in enumerate(target_keys):
            if stem_name in separated:
                stem_tensor = separated[stem_name]
                flac_path = os.path.join(output_dir, f"{stem_name}.flac")

                if progress_callback:
                    pct = 0.5 + ((idx + 1) / total) * 0.45
                    progress_callback(pct, f"Mengekspor {stem_name}.flac (Lossless 44.1kHz)...")

                audio_np = stem_tensor.cpu().numpy()
                if audio_np.ndim == 2:
                    audio_np = audio_np.T

                sf.write(
                    flac_path,
                    audio_np,
                    samplerate=separator.samplerate,
                    format="FLAC",
                    subtype="PCM_16",
                )
                exported_paths[stem_name] = flac_path

        if progress_callback:
            progress_callback(1.0, "Pemisahan stem selesai!")

        return exported_paths
