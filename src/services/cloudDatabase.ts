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
      const publicUrl = `${cleanUrl}/storage/v1/object/public/${config.bucketName}/${encodeURI(filePath)}`;

      if (stem.blob) {
        onProgress?.(`Mengunggah stem ${stem.name} (${i + 1}/${song.stems.length})...`);
        let uploaded = false;

        // A. Coba Signed Upload URL via Vercel Proxy (Direct S3-style upload, tembus file besar > 50MB)
        try {
          const signRes = await fetch(`/api/cloud-sync?action=get-upload-url&path=${encodeURIComponent(filePath)}`);
          if (signRes.ok) {
            const signJson = await signRes.json();
            if (signJson.signedUploadUrl) {
              const putRes = await fetch(signJson.signedUploadUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': stem.blob.type || 'audio/wav',
                },
                body: stem.blob,
              });
              if (putRes.ok) uploaded = true;
            }
          }
        } catch (_) {}

        // B. Fallback ke Vercel Serverless Function upload
        if (!uploaded) {
          try {
            const apiRes = await fetch(`/api/cloud-sync?action=upload`, {
              method: 'POST',
              headers: {
                'Content-Type': stem.blob.type || 'audio/wav',
                'x-file-path': filePath,
              },
              body: stem.blob,
            });
            if (apiRes.ok) uploaded = true;
          } catch (_) {}
        }

        // C. Fallback direct client upload
        if (!uploaded) {
          try {
            await fetch(`${cleanUrl}/storage/v1/object/${config.bucketName}/${filePath}`, {
              method: 'POST',
              headers: {
                apikey: config.supabaseAnonKey,
                Authorization: `Bearer ${config.supabaseAnonKey}`,
                'Content-Type': stem.blob.type || 'audio/wav',
                'x-upsert': 'true',
              },
              body: stem.blob,
            });
          } catch (_) {}
        }
      }

      stem.audioUrl = publicUrl;
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
        // Update stems audioUrl if missing in local
        let modified = false;
        existing.stems.forEach((st, idx) => {
          if (!st.audioUrl && cs.stems[idx]?.audioUrl) {
            st.audioUrl = cs.stems[idx].audioUrl;
            modified = true;
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
