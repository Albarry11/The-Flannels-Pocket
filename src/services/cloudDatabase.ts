import type { Song, CloudDbConfig } from '../types';
import { saveSongToStorage, loadSongFromStorage, listAllSongsFromStorage } from './storage';

const CLOUD_CONFIG_KEY = 'flannels_cloud_config';
export const SONGS_INDEX_FILE = 'songs-index.json';

const DEFAULT_CONFIG: CloudDbConfig = {
  provider: 'supabase',
  supabaseUrl: 'https://lrydzxpimekmvrwhnemm.supabase.co',
  supabaseAnonKey: 'sb_publishable_ydMAlr-fznp71OXTedNkaw_6iFXqjSB',
  bucketName: 'flannels-songs',
  autoSync: true,
};

export function getCloudConfig(): CloudDbConfig {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveCloudConfig(config: CloudDbConfig): void {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Tes koneksi ke Supabase Storage
 */
export async function testCloudConnection(config: CloudDbConfig): Promise<{ success: boolean; message: string }> {
  const cleanUrl = (config.supabaseUrl || DEFAULT_CONFIG.supabaseUrl).replace(/\/$/, '');
  const apiKey = config.supabaseAnonKey || DEFAULT_CONFIG.supabaseAnonKey;
  const bucket = config.bucketName || DEFAULT_CONFIG.bucketName;

  try {
    const res = await fetch(`${cleanUrl}/storage/v1/bucket`, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Status ${res.status}: ${errText || 'Koneksi gagal.'}` };
    }

    return { success: true, message: `Koneksi ke Supabase aktif! Bucket '${bucket}' siap digunakan.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Koneksi gagal: ${msg}` };
  }
}

const MAX_UPLOAD_CHUNK_BYTES = 35 * 1024 * 1024; // 35MB per chunk (Supabase free limit is 50MB)

/**
 * Upload single blob or sliced chunks if file > 35MB
 */
async function uploadBlobToSupabaseWithChunking(
  blob: Blob,
  basePath: string,
  onStatus?: (msg: string) => void
): Promise<string[]> {
  const config = getCloudConfig();
  const cleanUrl = config.supabaseUrl.replace(/\/$/, '');

  const uploadSingle = async (targetPath: string, targetBlob: Blob): Promise<string> => {
    let signedUrl: string | null = null;
    let publicUrl = `${cleanUrl}/storage/v1/object/public/${config.bucketName}/${encodeURI(targetPath)}`;

    // 1. Get Signed Upload URL via Vercel Proxy
    try {
      const signRes = await fetch(`/api/cloud-sync?action=get-upload-url&path=${encodeURIComponent(targetPath)}`);
      if (signRes.ok) {
        const signJson = await signRes.json();
        if (signJson.signedUploadUrl) signedUrl = signJson.signedUploadUrl;
        if (signJson.publicUrl) publicUrl = signJson.publicUrl;
      }
    } catch (_) {}

    // 2. Upload using Signed URL (Bypasses serverless payload limit)
    if (signedUrl) {
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: targetBlob,
      });
      if (putRes.ok) {
        return publicUrl;
      }
      const err = await putRes.text();
      console.warn(`Signed upload failed (${putRes.status}):`, err);
    }

    // 3. Direct client upload
    const directRes = await fetch(`${cleanUrl}/storage/v1/object/${config.bucketName}/${targetPath}`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: targetBlob,
    });

    if (directRes.ok) {
      return publicUrl;
    }

    const directErr = await directRes.text();
    throw new Error(`Upload gagal (${directRes.status}): ${directErr.slice(0, 100)}`);
  };

  if (blob.size <= MAX_UPLOAD_CHUNK_BYTES) {
    const url = await uploadSingle(basePath, blob);
    return [url];
  } else {
    // Slicing into safe chunks under 50MB
    const totalParts = Math.ceil(blob.size / MAX_UPLOAD_CHUNK_BYTES);
    const urls: string[] = [];

    for (let part = 0; part < totalParts; part++) {
      const start = part * MAX_UPLOAD_CHUNK_BYTES;
      const end = Math.min(blob.size, start + MAX_UPLOAD_CHUNK_BYTES);
      const slice = blob.slice(start, end);
      const partPath = `${basePath}_part${part + 1}.bin`;
      onStatus?.(`bagian ${part + 1}/${totalParts} (${Math.round(slice.size / 1024 / 1024)} MB)...`);
      const partUrl = await uploadSingle(partPath, slice);
      urls.push(partUrl);
    }

    return urls;
  }
}

/**
 * Upload satu lagu ke Supabase Storage beserta seluruh stem audio diskrit.
 * Memperbarui songs-index.json di cloud agar semua device anggota band bisa mengaksesnya.
 */
export async function uploadSongToCloud(
  songId: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string }> {
  const config = getCloudConfig();
  const song = await loadSongFromStorage(songId);
  if (!song) {
    return { success: false, message: 'Lagu tidak ditemukan di penyimpanan lokal.' };
  }

  const cleanUrl = config.supabaseUrl.replace(/\/$/, '');

  try {
    // 1. Upload each stem audio
    for (let i = 0; i < song.stems.length; i++) {
      const stem = song.stems[i];
      const filePath = `${song.id}/${stem.id}_${stem.fileName || `${stem.role}.wav`}`;

      if (stem.blob) {
        onProgress?.(`Mengunggah stem ${stem.name} (${i + 1}/${song.stems.length})...`);
        const urls = await uploadBlobToSupabaseWithChunking(
          stem.blob,
          filePath,
          (subMsg) => onProgress?.(`Mengunggah stem ${stem.name} ${subMsg}`)
        );
        stem.audioUrls = urls;
        stem.audioUrl = urls[0];
      } else if (!stem.audioUrl && !stem.audioUrls) {
        throw new Error(`Stem ${stem.name} tidak memiliki berkas audio lokal maupun URL cloud.`);
      }
    }

    // 2. Perbarui master songs-index.json di cloud
    onProgress?.('Mendaftarkan lagu ke katalog cloud band...');
    const indexUrl = `${cleanUrl}/storage/v1/object/public/${config.bucketName}/${SONGS_INDEX_FILE}`;
    let existingSongs: Song[] = [];

    try {
      const idxRes = await fetch(`${indexUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (idxRes.ok) {
        const text = await idxRes.text();
        if (text && text.trim().startsWith('[')) {
          existingSongs = JSON.parse(text);
        }
      }
    } catch (_) {}

    // Clean metadata without giant in-memory buffers for JSON index
    const cleanSongMeta: Song = {
      ...song,
      stems: song.stems.map((s) => ({
        id: s.id,
        role: s.role,
        name: s.name,
        volume: s.volume,
        pan: s.pan,
        muted: s.muted,
        solo: s.solo,
        fileName: s.fileName,
        audioUrl: s.audioUrl,
        audioUrls: s.audioUrls,
      })),
      cloudSynced: true,
    };

    const map = new Map<string, Song>();
    existingSongs.forEach((s) => map.set(s.id, s));
    map.set(cleanSongMeta.id, cleanSongMeta);
    const updatedIndex = Array.from(map.values());

    // Upload index
    try {
      await fetch('/api/cloud-sync?action=upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-file-path': SONGS_INDEX_FILE,
        },
        body: JSON.stringify(updatedIndex, null, 2),
      });
    } catch (_) {}

    // Simpan status lokal
    song.cloudSynced = true;
    await saveSongToStorage(song);

    return { success: true, message: `Lagu "${song.title}" berhasil disinkronkan ke seluruh perangkat band!` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal upload: ${msg}` };
  }
}

/**
 * Unduh dan sinkronisasikan katalog lagu dari Supabase Storage ke IndexedDB lokal.
 * Membuat lagu yang diinput admin langsung muncul di device seluruh personil band.
 */
export async function syncSongsFromCloud(
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; count: number; songs: Song[]; message: string }> {
  const config = getCloudConfig();
  const cleanUrl = config.supabaseUrl.replace(/\/$/, '');
  const indexUrl = `${cleanUrl}/storage/v1/object/public/${config.bucketName}/${SONGS_INDEX_FILE}`;

  try {
    onProgress?.('Memeriksa katalog lagu cloud...');
    const res = await fetch(`${indexUrl}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) {
      const local = await listAllSongsFromStorage();
      return { success: true, count: local.length, songs: local, message: 'Menggunakan database lokal' };
    }

    const text = await res.text();
    if (!text || !text.trim().startsWith('[')) {
      const local = await listAllSongsFromStorage();
      return { success: true, count: local.length, songs: local, message: 'Katalog cloud kosong' };
    }

    const cloudSongs: Song[] = JSON.parse(text);
    let newOrUpdatedCount = 0;

    for (const cs of cloudSongs) {
      const existing = await loadSongFromStorage(cs.id);
      if (!existing) {
        await saveSongToStorage(cs);
        newOrUpdatedCount++;
      } else {
        // Update stems audioUrl and audioUrls if missing or updated in cloud
        let modified = false;
        existing.stems.forEach((st, idx) => {
          const cloudStem = cs.stems[idx];
          if (cloudStem) {
            if (cloudStem.audioUrl && st.audioUrl !== cloudStem.audioUrl) {
              st.audioUrl = cloudStem.audioUrl;
              modified = true;
            }
            if (cloudStem.audioUrls && JSON.stringify(st.audioUrls) !== JSON.stringify(cloudStem.audioUrls)) {
              st.audioUrls = cloudStem.audioUrls;
              modified = true;
            }
          }
        });
        if (modified) {
          await saveSongToStorage(existing);
        }
      }
    }

    const all = await listAllSongsFromStorage();
    return {
      success: true,
      count: newOrUpdatedCount,
      songs: all,
      message: `Sinkronisasi cloud berhasil. ${all.length} lagu tersedia.`,
    };
  } catch (err: unknown) {
    const local = await listAllSongsFromStorage();
    return { success: false, count: local.length, songs: local, message: 'Offline mode' };
  }
}

/**
 * Ekspor paket lagu lokal sebagai satu file JSON
 */
export async function exportSongPackage(): Promise<Blob> {
  const songs = await listAllSongsFromStorage();
  const exportData = {
    app: 'The Flannels Pocket',
    version: '2.0.0',
    exportedAt: Date.now(),
    songs: songs.map((s) => ({
      ...s,
      stems: s.stems.map((stem) => ({
        id: stem.id,
        role: stem.role,
        name: stem.name,
        volume: stem.volume,
        pan: stem.pan,
        muted: stem.muted,
        solo: stem.solo,
        fileName: stem.fileName,
        audioUrl: stem.audioUrl,
      })),
    })),
  };

  return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
}
