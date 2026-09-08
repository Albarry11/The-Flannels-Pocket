import type { StemTrack, StemRole } from '../types';
import { globalAudioEngine } from './audioEngine';

export const DEMUCS_URL_STORAGE = 'flannels_demucs_backend_url';

export interface DemucsJobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  stems: Record<string, string>;
  error?: string;
}

let activeBackendUrl: string | null = null;

export function getCustomBackendUrl(): string {
  try {
    return localStorage.getItem(DEMUCS_URL_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setCustomBackendUrl(url: string) {
  try {
    localStorage.setItem(DEMUCS_URL_STORAGE, url.trim().replace(/\/$/, ''));
    activeBackendUrl = null; // reset cached resolution
  } catch (_) {}
}

/**
 * Resolves candidate backend URLs:
 * 1. User custom configured URL in localStorage (if set)
 * 2. http://localhost:8000 (if running on laptop or local dev)
 * 3. VITE_DEMUCS_BACKEND_URL environment variable
 * 4. Default public Cloudflare Tunnel URL
 */
export async function resolveDemucsBackendUrl(): Promise<string> {
  if (activeBackendUrl) return activeBackendUrl;

  const candidates: string[] = [];

  const custom = getCustomBackendUrl();
  if (custom) candidates.push(custom);

  // If on localhost / desktop browser, check local port 8000 first
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal || window.location.protocol === 'http:') {
      candidates.push('http://localhost:8000');
    }
  }

  const envUrl = (import.meta as any).env?.VITE_DEMUCS_BACKEND_URL;
  if (envUrl && !candidates.includes(envUrl)) candidates.push(envUrl);

  // Default fallback tunnel
  const defaultTunnel = 'https://extends-psychological-review-metal.trycloudflare.com';
  if (!candidates.includes(defaultTunnel)) candidates.push(defaultTunnel);

  for (const url of candidates) {
    try {
      const clean = url.replace(/\/$/, '');
      const res = await fetch(`${clean}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'online') {
          activeBackendUrl = clean;
          return clean;
        }
      }
    } catch (_) {}
  }

  // Fallback to first candidate or local
  activeBackendUrl = candidates[0] || 'http://localhost:8000';
  return activeBackendUrl;
}

/**
 * Checks if the Demucs neural separation backend is running
 */
export async function checkDemucsBackendHealth(): Promise<{ online: boolean; device?: string; url?: string }> {
  try {
    const backendUrl = await resolveDemucsBackendUrl();
    const res = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return { online: true, device: data.device, url: backendUrl };
    }
  } catch (_) {}
  return { online: false };
}

/**
 * Production-grade Stem Separation:
 * Exclusively uses true neural separation via Demucs (htdemucs_6s).
 * STRICT POLICY: NO EQ FALLBACK! If Demucs is offline, informs user honestly.
 */
export async function processSeparationWithFallback(
  file: File,
  _audioBuffer: AudioBuffer,
  onProgress?: (status: string) => void
): Promise<StemTrack[]> {
  onProgress?.('Memeriksa koneksi server AI Demucs (GPU)...');
  const health = await checkDemucsBackendHealth();

  if (!health.online) {
    throw new Error(
      'Server AI Demucs (GPU/Laptop) belum aktif! Jalankan "backend/start_demucs.bat" di laptop. Sistem The Flannels Pocket tidak lagi menggunakan manipulasi equalizer browser palsu agar kualitas audio tetap murni dan tidak bocor.'
    );
  }

  onProgress?.(
    `Demucs Neural Server terdeteksi (${health.device?.toUpperCase() || 'CUDA'}). Mengunggah audio ke model htdemucs_6s...`
  );

  return await separateViaDemucsBackend(file, onProgress);
}

/**
 * Calls FastAPI Demucs backend to produce discrete lossless FLAC stems
 */
export async function separateViaDemucsBackend(
  file: File,
  onProgress?: (status: string) => void
): Promise<StemTrack[]> {
  const backendUrl = await resolveDemucsBackendUrl();
  const formData = new FormData();
  formData.append('file', file);

  // 1. Submit separation job
  onProgress?.('Mengunggah file ke engine Meta Demucs...');
  const uploadRes = await fetch(`${backendUrl}/api/separate`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Gagal mengirim file ke backend Demucs: ${errText || uploadRes.statusText}`);
  }

  const { job_id } = await uploadRes.json();

  // 2. Poll job status
  let completed = false;
  let statusData: DemucsJobStatus | null = null;
  const pollInterval = 1200;

  while (!completed) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    const statusRes = await fetch(`${backendUrl}/api/status/${job_id}`);
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

  // 3. Download generated discrete lossless FLAC stems and decode into AudioBuffers
  const ctx = globalAudioEngine.getContext();
  const stems: StemTrack[] = [];
  const stemMap: Record<string, { role: StemRole; name: string; pan: number }> = {
    vocals: { role: 'vocal', name: 'Vocal', pan: 0 },
    guitar: { role: 'guitar', name: 'Guitar', pan: 0 },
    bass: { role: 'bass', name: 'Bass', pan: 0 },
    drums: { role: 'drums', name: 'Drums', pan: 0 },
  };

  const stemKeys = Object.keys(statusData?.stems || {}).filter((k) => k in stemMap);
  let downloadedIdx = 0;

  for (const stemKey of stemKeys) {
    downloadedIdx++;
    const stemUrl = `${backendUrl}${statusData!.stems[stemKey]}`;
    onProgress?.(`Mengunduh stem terpisah: ${stemKey}.flac (${downloadedIdx}/${stemKeys.length})...`);

    const res = await fetch(stemUrl);
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const config = stemMap[stemKey];

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
