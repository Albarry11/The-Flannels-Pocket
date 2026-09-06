import type { Song, StemTrack, CloudDbConfig } from '../types';
import { saveSongToStorage, loadSongFromStorage, listAllSongsFromStorage } from './storage';

const CLOUD_CONFIG_KEY = 'flannels_cloud_config';

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
 * Upload satu lagu ke Supabase Storage (Vercel Serverless Function atau Client Direct)
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
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
  };

  try {
    // 1. Upload each stem audio
    for (let i = 0; i < song.stems.length; i++) {
      const stem = song.stems[i];
      if (stem.blob) {
        onProgress?.(`Mengunggah stem ${stem.name} (${i + 1}/${song.stems.length})...`);
        const filePath = `${song.id}/${stem.id}_${stem.fileName || 'audio.flac'}`;

        let uploaded = false;

        // Try Vercel Serverless Function first
        try {
          const apiRes = await fetch(`/api/cloud-sync?action=upload`, {
            method: 'POST',
            headers: {
              'Content-Type': stem.blob.type || 'audio/flac',
              'x-file-path': filePath,
            },
            body: stem.blob,
          });
          if (apiRes.ok) uploaded = true;
        } catch (_) {}

        // Fallback to client-direct Supabase API
        if (!uploaded) {
          await fetch(`${cleanUrl}/storage/v1/object/${config.bucketName}/${filePath}`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': stem.blob.type || 'audio/flac',
              'x-upsert': 'true',
            },
            body: stem.blob,
          });
        }
      }
    }

    // 2. Upload song metadata
    onProgress?.('Menyimpan metadata lagu ke cloud...');
    const metaPayload: Omit<Song, 'stems'> & { stems: Omit<StemTrack, 'audioBuffer' | 'blob'>[] } = {
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
      })),
      cloudSynced: true,
    };

    const metaBlob = new Blob([JSON.stringify(metaPayload, null, 2)], { type: 'application/json' });
    const metaPath = `${song.id}/meta.json`;

    let metaUploaded = false;
    try {
      const apiRes = await fetch(`/api/cloud-sync?action=upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-file-path': metaPath,
        },
        body: metaBlob,
      });
      if (apiRes.ok) metaUploaded = true;
    } catch (_) {}

    if (!metaUploaded) {
      await fetch(`${cleanUrl}/storage/v1/object/${config.bucketName}/${metaPath}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: metaBlob,
      });
    }

    song.cloudSynced = true;
    await saveSongToStorage(song);

    return { success: true, message: `Lagu "${song.title}" berhasil diunggah ke database cloud!` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal upload: ${msg}` };
  }
}

/**
 * Unduh daftar lagu dari Supabase Storage ke IndexedDB lokal
 */
export async function syncSongsFromCloud(
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; count: number; message: string }> {
  const config = getCloudConfig();
  const cleanUrl = config.supabaseUrl.replace(/\/$/, '');
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
  };

  try {
    onProgress?.('Mencari lagu di cloud storage...');

    let items: { name: string; id: string }[] = [];

    // Try Vercel Serverless route first
    try {
      const apiRes = await fetch(`/api/cloud-sync?action=list`);
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.items) items = json.items;
      }
    } catch (_) {}

    // Fallback to direct Supabase list
    if (items.length === 0) {
      const listRes = await fetch(`${cleanUrl}/storage/v1/object/list/${config.bucketName}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: '',
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        }),
      });

      if (listRes.ok) {
        items = await listRes.json();
      }
    }

    let syncedCount = 0;

    for (const item of items) {
      if (item.name.endsWith('meta.json')) {
        onProgress?.(`Sinkronisasi ${item.name}...`);
        const metaRes = await fetch(`${cleanUrl}/storage/v1/object/public/${config.bucketName}/${item.name}`);
        if (metaRes.ok) {
          const metaJson: Song = await metaRes.json();
          const existing = await loadSongFromStorage(metaJson.id);
          if (!existing) {
            for (const stem of metaJson.stems) {
              const stemPath = `${metaJson.id}/${stem.id}_${stem.fileName || 'audio.flac'}`;
              try {
                const audioRes = await fetch(`${cleanUrl}/storage/v1/object/public/${config.bucketName}/${stemPath}`);
                if (audioRes.ok) {
                  stem.blob = await audioRes.blob();
                }
              } catch (_) {}
            }
            await saveSongToStorage(metaJson);
            syncedCount++;
          }
        }
      }
    }

    return { success: true, count: syncedCount, message: `Sinkronisasi selesai! ${syncedCount} lagu berhasil diunduh.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, message: `Gagal sinkronisasi: ${msg}` };
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
      })),
    })),
  };

  return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
}
