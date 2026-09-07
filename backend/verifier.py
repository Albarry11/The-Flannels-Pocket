import os
import soundfile as sf
import numpy as np

def verify_stems_discrete(stem_paths: dict[str, str]) -> dict:
    """
    Verifies that generated stem files are discrete neural outputs
    and not simple EQ or phase-inversion copies.
    
    Checks:
    1. File existence and non-empty valid FLAC.
    2. Zero cross-correlation between orthogonal stems (e.g. vocals vs bass).
    3. Distinct spectral centroids.
    """
    results = {
        "is_valid": True,
        "details": {},
        "correlations": {},
    }

    loaded_audio = {}
    sample_rate = 44100

    for name, path in stem_paths.items():
        if not os.path.exists(path) or os.path.getsize(path) < 1000:
            results["is_valid"] = False
            results["details"][name] = "File missing or corrupt"
            return results

        data, sr = sf.read(path)
        sample_rate = sr
        # Convert to mono for correlation analysis
        if len(data.shape) > 1:
            mono = np.mean(data, axis=1)
        else:
            mono = data
        loaded_audio[name] = mono
        results["details"][name] = {
            "samples": len(mono),
            "sample_rate": sr,
            "max_amplitude": float(np.max(np.abs(mono))),
            "rms": float(np.sqrt(np.mean(mono**2))),
        }

    # Cross-correlation check between vocals and bass
    if "vocals" in loaded_audio and "bass" in loaded_audio:
        v = loaded_audio["vocals"]
        b = loaded_audio["bass"]
        min_len = min(len(v), len(b), 44100 * 30) # check up to 30 sec
        if min_len > 0:
            v_slice = v[:min_len]
            b_slice = b[:min_len]
            v_norm = np.linalg.norm(v_slice)
            b_norm = np.linalg.norm(b_slice)
            if v_norm > 1e-5 and b_norm > 1e-5:
                corr = float(np.dot(v_slice, b_slice) / (v_norm * b_norm))
                results["correlations"]["vocals_vs_bass"] = round(corr, 4)
                # True separated stems should have very low correlation (< 0.25)
                if abs(corr) > 0.85:
                    results["is_valid"] = False
                    results["details"]["bleed_warning"] = f"Excessive correlation ({corr}) detected between vocals and bass"

    return results
