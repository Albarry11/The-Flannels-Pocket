import { get, set, del, keys } from 'idb-keyval';
import type { Song, StemTrack, StemRole } from '../types';
import { globalAudioEngine } from './audioEngine';
import { analyzeAudioQuality, analyzeBpmAndKey, calculateReplayGain } from './audioAnalyzer';

const SONGS_KEY_PREFIX = 'flannels_song_';
const AUDIO_BLOB_PREFIX = 'flannels_audio_';

export async function saveSongToStorage(song: Song): Promise<void> {
  // Store audio blobs separately in IndexedDB to avoid serializing huge objects into one key
  for (const stem of song.stems) {
    if (stem.blob) {
      await set(`${AUDIO_BLOB_PREFIX}${stem.id}`, stem.blob);
    }
  }

  // Create lightweight metadata representation
  const meta: Omit<Song, 'stems'> & { stems: Omit<StemTrack, 'audioBuffer' | 'blob'>[] } = {
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
  };

  await set(`${SONGS_KEY_PREFIX}${song.id}`, meta);
}

export async function loadSongFromStorage(songId: string): Promise<Song | null> {
  const meta = await get(`${SONGS_KEY_PREFIX}${songId}`);
  if (!meta) return null;

  const ctx = globalAudioEngine.getContext();
  const stems: StemTrack[] = [];

  for (const stemMeta of meta.stems) {
    const blob: Blob | undefined = await get(`${AUDIO_BLOB_PREFIX}${stemMeta.id}`);
    let audioBuffer: AudioBuffer | undefined;

    if (blob) {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      } catch (err) {
        console.warn(`Failed to decode audio for stem ${stemMeta.id}:`, err);
      }
    }

    stems.push({
      ...stemMeta,
      blob,
      audioBuffer,
    });
  }

  return {
    ...meta,
    stems,
  };
}

export async function listAllSongsFromStorage(): Promise<Song[]> {
  const allKeys = await keys();
  const songKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(SONGS_KEY_PREFIX));

  const result: Song[] = [];
  for (const key of songKeys) {
    const songId = (key as string).replace(SONGS_KEY_PREFIX, '');
    const song = await loadSongFromStorage(songId);
    if (song) result.push(song);
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSongFromStorage(songId: string): Promise<void> {
  const song = await loadSongFromStorage(songId);
  if (song) {
    for (const stem of song.stems) {
      await del(`${AUDIO_BLOB_PREFIX}${stem.id}`);
    }
  }
  await del(`${SONGS_KEY_PREFIX}${songId}`);
}

/**
 * Creates a new song from uploaded audio files
 */
export async function createSongFromFiles(
  title: string,
  artist: string,
  stemFiles: { role: StemRole; name: string; file: File }[],
  options?: { bpm?: number; key?: string; lyrics?: string }
): Promise<Song> {
  const ctx = globalAudioEngine.getContext();
  const stems: StemTrack[] = [];
  let maxDuration = 0;
  let masterBuffer: AudioBuffer | null = null;

  for (const sf of stemFiles) {
    const arrayBuffer = await sf.file.arrayBuffer();
    // decodeAudioData consumes arrayBuffer, clone if needed
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    if (audioBuffer.duration > maxDuration) {
      maxDuration = audioBuffer.duration;
    }
    if (!masterBuffer) {
      masterBuffer = audioBuffer;
    }

    stems.push({
      id: `stem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      role: sf.role,
      name: sf.name,
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      audioBuffer,
      blob: sf.file,
      fileName: sf.file.name,
    });
  }

  // Run analytical engines if we have an audio buffer
  let qualityReport;
  let bpmKeyReport;
  let replayGainReport;

  if (masterBuffer) {
    try {
      qualityReport = await analyzeAudioQuality(masterBuffer);
    } catch (_) {}
    try {
      bpmKeyReport = await analyzeBpmAndKey(masterBuffer);
    } catch (_) {}
    try {
      replayGainReport = calculateReplayGain(masterBuffer);
    } catch (_) {}
  }

  const newSong: Song = {
    id: `song-${Date.now()}`,
    title: title.trim() || 'Untitled Track',
    artist: artist.trim() || 'The Flannels',
    duration: maxDuration,
    bpm: options?.bpm || bpmKeyReport?.bpm || 120,
    originalKey: options?.key || bpmKeyReport?.key || 'C',
    timeSignature: '4/4',
    lyrics: options?.lyrics || '',
    stems,
    createdAt: Date.now(),
    qualityAnalysis: qualityReport,
    bpmKeyAnalysis: bpmKeyReport,
    replayGain: replayGainReport,
  };

  await saveSongToStorage(newSong);
  return newSong;
}
