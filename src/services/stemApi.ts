import type { StemTrack, StemRole } from '../types';
import { globalAudioEngine } from './audioEngine';
import { separateAudioIntoStems as separateLocalDSP } from './stemSeparator';

// Default fallback to public Cloudflare Tunnel, local dev, or environment variable
export const DEMUCS_BACKEND_URL =
  (import.meta as any).env?.VITE_DEMUCS_BACKEND_URL ||
  'https://extends-psychological-review-metal.trycloudflare.com';

export interface DemucsJobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  stems: Record<string, string>;
  error?: string;
}

/**
 * Checks if the Demucs neural separation backend is running
 */
export async function checkDemucsBackendHealth(): Promise<{ online: boolean; device?: string }> {
  try {
    const res = await fetch(`${DEMUCS_BACKEND_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1800) });
    if (res.ok) {
      const data = await res.json();
      return { online: true, device: data.device };
    }
  } catch (_) {}
  return { online: false };
}

/**
 * Production-grade Stem Separation:
 * First attempts true neural separation via Demucs (htdemucs_6s).
 * If Demucs backend is offline or unreachable, seamlessly falls back to high-order DSP matrix.
 */
export async function processSeparationWithFallback(
  file: File,
  audioBuffer: AudioBuffer,
  onProgress?: (status: string) => void
): Promise<StemTrack[]> {
  const health = await checkDemucsBackendHealth();

  if (health.online) {
    onProgress?.(`Demucs Neural Server terdeteksi (${health.device?.toUpperCase() || 'CPU'}). Mengunggah audio...`);
    try {
      return await separateViaDemucsBackend(file, onProgress);
    } catch (err) {
      console.warn('Demucs backend separation failed, falling back to local DSP:', err);
      onProgress?.('Demucs backend mengalami kendala, melanjutkan via DSP multi-stage matrix...');
    }
  } else {
    onProgress?.('Server Demucs AI offline. Memproses audio via matriks Mid/Side internal browser...');
  }

  // Local fallback
  return await separateLocalDSP(audioBuffer, onProgress);
}

/**
 * Calls FastAPI Demucs backend to produce discrete lossless FLAC stems
 */
export async function separateViaDemucsBackend(
  file: File,
  onProgress?: (status: string) => void
): Promise<StemTrack[]> {
  const formData = new FormData();
  formData.append('file', file);

  // 1. Submit separation job
  onProgress?.('Mengunggah file ke engine Meta Demucs...');
  const uploadRes = await fetch(`${DEMUCS_BACKEND_URL}/api/separate`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`Gagal mengirim file ke backend Demucs: ${uploadRes.statusText}`);
  }

  const { job_id } = await uploadRes.json();

  // 2. Poll job status
  let completed = false;
  let statusData: DemucsJobStatus | null = null;
  const pollInterval = 1200;

  while (!completed) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    const statusRes = await fetch(`${DEMUCS_BACKEND_URL}/api/status/${job_id}`);
    if (!statusRes.ok) throw new Error('Gagal memeriksa status pemisahan');

    statusData = await statusRes.json();
    if (statusData?.status === 'processing') {
      const pct = Math.round((statusData.progress || 0) * 100);
      onProgress?.(`Demucs (htdemucs_6s): ${statusData.message} (${pct}%)`);
    } else if (statusData?.status === 'completed') {
      completed = true;
    } else if (statusData?.status === 'failed') {
      throw new Error(statusData.error || 'Pemisahan stem gagal di backend Demucs');
    }
  }

  // 3. Download generated lossless FLAC stems and decode into AudioBuffers
  const ctx = globalAudioEngine.getContext();
  const stems: StemTrack[] = [];
  const stemMap: Record<string, { role: StemRole; name: string; pan: number }> = {
    vocals: { role: 'vocal', name: 'Vocal', pan: 0 },
    guitar: { role: 'guitar', name: 'Guitar', pan: 0 },
    bass: { role: 'bass', name: 'Bass', pan: 0 },
    drums: { role: 'drums', name: 'Drums', pan: 0 },
  };

  const stemKeys = Object.keys(statusData?.stems || {});
  let downloadedIdx = 0;

  for (const stemKey of stemKeys) {
    downloadedIdx++;
    const stemUrl = `${DEMUCS_BACKEND_URL}${statusData!.stems[stemKey]}`;
    onProgress?.(`Mengunduh stem terpisah: ${stemKey}.flac (${downloadedIdx}/${stemKeys.length})...`);

    const res = await fetch(stemUrl);
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const config = stemMap[stemKey] || { role: 'other' as StemRole, name: stemKey, pan: 0 };

    stems.push({
      id: `stem-demucs-${stemKey}-${Date.now()}`,
      role: config.role,
      name: config.name,
      volume: 0.85,
      pan: config.pan,
      muted: false,
      solo: false,
      audioBuffer,
      blob,
      fileName: `${stemKey}.flac`,
    });
  }

  return stems;
}
