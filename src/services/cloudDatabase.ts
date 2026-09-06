import type { Song, StemTrack, CloudDbConfig } from '../types';
import { saveSongToStorage, loadSongFromStorage, listAllSongsFromStorage } from './storage';

const CLOUD_CONFIG_KEY = 'flannels_cloud_config';

const DEFAULT_CONFIG: CloudDbConfig = {
  provider: 'supabase',
  supabaseUrl: '',
  supabaseAnonKey: '',
  bucketName: 'flannels-songs',
  autoSync: false,
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
 * Tes koneksi ke Supabase Storage / REST API
 */
export async function testCloudConnection(config: CloudDbConfig): Promise<{ success: boolean; message: string }> {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { success: false, message: 'URL Supabase dan Anon Key wajib diisi.' };
  }

  const cleanUrl = config.supabaseUrl.replace(/\/$/, '');
  try {
    // Test fetch bucket list from Supabase Storage API
    const res = await fetch(`${cleanUrl}/storage/v1/bucket`, {
      method: 'GET',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Gagal tersambung (Status ${res.status}): ${errText || 'Periksa URL dan Anon Key.'}` };
    }

    const buckets = await res.json();
    const bucketExists = Array.isArray(buckets) && buckets.some((b: { name: string }) => b.name === config.bucketName);

    if (!bucketExists) {
      return {
        success: true,
        message: `Tersambung ke Supabase! Catatan: Bucket '${config.bucketName}' belum ditemukan. Buat bucket publik '${config.bucketName}' di dashboard Supabase Storage.`,
      };
    }

    return { success: true, message: `Koneksi berhasil! Bucket '${config.bucketName}' siap digunakan untuk file FLAC & stem.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Koneksi gagal: ${msg}` };
  }
}

/**
 * Upload satu lagu beserta stem audionya ke Supabase Storage
 */
export async function uploadSongToCloud(
  songId: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string }> {
  const config = getCloudConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { success: false, message: 'Konfigurasi cloud database belum diatur.' };
  }

  const song = await loadSongFromStorage(songId);
  if (!song) {
    return { success: false, message: 'Lagu lokal tidak ditemukan.' };
  }

  const cleanUrl = config.supabaseUrl.replace(/\/$/, '');
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
  };

  try {
    // 1. Upload each stem audio blob to Storage
    for (let i = 0; i < song.stems.length; i++) {
      const stem = song.stems[i];
      if (stem.blob) {
        onProgress?.(`Mengunggah stem ${stem.name} (${i + 1}/${song.stems.length})...`);
        const filePath = `${song.id}/${stem.id}_${stem.fileName || 'audio.flac'}`;

        const uploadRes = await fetch(`${cleanUrl}/storage/v1/object/${config.bucketName}/${filePath}`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': stem.blob.type || 'audio/flac',
            'x-upsert': 'true',
          },
          body: stem.blob,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          console.warn(`Upload stem failed for ${stem.id}:`, errText);
        }
      }
    }

    // 2. Upload song metadata JSON to Storage
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

    const metaRes = await fetch(`${cleanUrl}/storage/v1/object/${config.bucketName}/${metaPath}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body: metaBlob,
    });

    if (!metaRes.ok) {
      throw new Error(`Gagal menyimpan metadata di cloud: ${await metaRes.text()}`);
    }

    // Update local song status
    song.cloudSynced = true;
    await saveSongToStorage(song);

    return { success: true, message: `Lagu "${song.title}" berhasil diunggah ke database cloud!` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal upload: ${msg}` };
  }
}

/**
 * Unduh daftar lagu dari Supabase Storage dan simpan ke IndexedDB lokal
 */
export async function syncSongsFromCloud(
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; count: number; message: string }> {
  const config = getCloudConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { success: false, count: 0, message: 'Supabase URL dan Anon Key belum diatur.' };
  }

  const cleanUrl = config.supabaseUrl.replace(/\/$/, '');
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
  };

  try {
    onProgress?.('Mencari lagu di cloud storage...');
    // List folders inside bucket
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

    if (!listRes.ok) {
      throw new Error(`Gagal membaca isi cloud: ${await listRes.text()}`);
    }

    const items: { name: string; id: string }[] = await listRes.json();
    let syncedCount = 0;

    // Filter folder/prefixes or direct metadata files
    for (const item of items) {
      if (item.name.endsWith('meta.json')) {
        onProgress?.(`Sinkronisasi ${item.name}...`);
        // Download meta.json
        const metaRes = await fetch(`${cleanUrl}/storage/v1/object/public/${config.bucketName}/${item.name}`);
        if (metaRes.ok) {
          const metaJson: Song = await metaRes.json();
          // Check if we already have it
          const existing = await loadSongFromStorage(metaJson.id);
          if (!existing) {
            // Download stem files for this song
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

    return { success: true, count: syncedCount, message: `Sinkronisasi selesai! ${syncedCount} lagu berhasil diunduh dari cloud.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, message: `Gagal sinkronisasi: ${msg}` };
  }
}

/**
 * Export semua lagu sebagai satu file JSON (Backup / Offline Share antar personil)
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
