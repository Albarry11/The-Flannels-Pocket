import { get, set, del, keys } from 'idb-keyval';
import type { Song, StemTrack, StemRole } from '../types';
import { globalAudioEngine } from './audioEngine';
import { analyzeAudioQuality, analyzeBpmAndKey, calculateReplayGain } from './audioAnalyzer';
import { audioBufferToWavBlob } from './stemSeparator';
import { researchSongBpmAndKeyWithAI, generateLyricsAndChordsWithAI } from './aiBrain';
import { extractEmbeddedArtwork } from './embeddedArtwork';

const SONGS_KEY_PREFIX = 'flannels_song_';
const AUDIO_BLOB_PREFIX = 'flannels_audio_';

export async function saveSongToStorage(song: Song): Promise<void> {
  for (const stem of song.stems) {
    if (stem.blob) {
      await set(`${AUDIO_BLOB_PREFIX}${stem.id}`, stem.blob);
    }
  }

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
      audioUrl: s.audioUrl,
      audioUrls: s.audioUrls,
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

export async function updateSongMetadata(
  songId: string,
  updates: { title?: string; artist?: string; bpm?: number; originalKey?: string }
): Promise<void> {
  const meta: any = await get(`${SONGS_KEY_PREFIX}${songId}`);
  if (!meta) return;
  if (updates.title) meta.title = updates.title;
  if (updates.artist) meta.artist = updates.artist;
  if (typeof updates.bpm === 'number' && updates.bpm > 0) meta.bpm = updates.bpm;
  if (updates.originalKey) meta.originalKey = updates.originalKey.trim();
  await set(`${SONGS_KEY_PREFIX}${songId}`, meta);
}

/**
 * Mengganti berkas audio satu stem diskrit dalam lagu
 */
export async function replaceStemInSong(
  songId: string,
  stemId: string,
  newFile: File,
  onProgress?: (msg: string) => void
): Promise<Song> {
  const song = await loadSongFromStorage(songId);
  if (!song) throw new Error('Lagu tidak ditemukan.');

  const stem = song.stems.find((s) => s.id === stemId);
  if (!stem) throw new Error('Stem tidak ditemukan.');

  const ctx = globalAudioEngine.getContext();
  onProgress?.('Mendekode audio stem pengganti...');
  const arrayBuffer = await newFile.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

  stem.fileName = newFile.name;
  stem.blob = newFile;
  stem.audioBuffer = audioBuffer;
  stem.audioUrl = undefined;
  stem.audioUrls = undefined;

  // Update durasi lagu jika file baru lebih panjang
  if (audioBuffer.duration > song.duration) {
    song.duration = audioBuffer.duration;
  }

  // Perbarui daftar berkas diskrit
  if (song.discreteFiles) {
    const df = song.discreteFiles.find((d) => d.role === stem.role || d.name === stem.fileName);
    if (df) {
      df.name = newFile.name;
      df.size = newFile.size;
    }
  }

  await set(`${AUDIO_BLOB_PREFIX}${stem.id}`, newFile);
  await saveSongToStorage(song);

  // Sinkronisasi otomatis ke cloud
  try {
    const { uploadSongToCloud } = await import('./cloudDatabase');
    onProgress?.('Menyinkronkan stem baru ke cloud storage...');
    await uploadSongToCloud(song.id, onProgress);
    const refreshed = await loadSongFromStorage(songId);
    if (refreshed) return refreshed;
  } catch (err) {
    console.warn('Cloud sync error on replace stem:', err);
  }

  return song;
}

/**
 * Menambahkan stem diskrit baru ke dalam lagu
 */
export async function addStemToSong(
  songId: string,
  role: StemRole,
  name: string,
  file: File,
  onProgress?: (msg: string) => void
): Promise<Song> {
  const song = await loadSongFromStorage(songId);
  if (!song) throw new Error('Lagu tidak ditemukan.');

  const ctx = globalAudioEngine.getContext();
  onProgress?.('Mendekode berkas audio stem baru...');
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

  const newStem: StemTrack = {
    id: `stem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    role,
    name: name.trim() || role.toUpperCase(),
    volume: 0.85,
    pan: role === 'lead' ? 0.35 : role === 'rhythm' ? -0.35 : 0,
    muted: false,
    solo: false,
    audioBuffer,
    blob: file,
    fileName: file.name,
  };

  song.stems.push(newStem);

  if (audioBuffer.duration > song.duration) {
    song.duration = audioBuffer.duration;
  }

  if (song.discreteFiles) {
    song.discreteFiles.push({
      name: file.name,
      size: file.size,
      role,
    });
  }

  await set(`${AUDIO_BLOB_PREFIX}${newStem.id}`, file);
  await saveSongToStorage(song);

  // Sinkronisasi otomatis ke cloud
  try {
    const { uploadSongToCloud } = await import('./cloudDatabase');
    onProgress?.('Mengunggah stem baru ke cloud...');
    await uploadSongToCloud(song.id, onProgress);
    const refreshed = await loadSongFromStorage(songId);
    if (refreshed) return refreshed;
  } catch (err) {
    console.warn('Cloud sync error on add stem:', err);
  }

  return song;
}

/**
 * Menghapus satu stem diskrit dari lagu
 */
export async function deleteStemFromSong(
  songId: string,
  stemId: string,
  onProgress?: (msg: string) => void
): Promise<Song> {
  const song = await loadSongFromStorage(songId);
  if (!song) throw new Error('Lagu tidak ditemukan.');

  if (song.stems.length <= 1) {
    throw new Error('Lagu harus memiliki minimal 1 stem audio.');
  }

  const stemIndex = song.stems.findIndex((s) => s.id === stemId);
  if (stemIndex === -1) throw new Error('Stem tidak ditemukan.');

  const [removedStem] = song.stems.splice(stemIndex, 1);
  await del(`${AUDIO_BLOB_PREFIX}${stemId}`);

  if (song.discreteFiles) {
    song.discreteFiles = song.discreteFiles.filter(
      (df) => df.name !== removedStem.fileName && df.role !== removedStem.role
    );
  }

  await saveSongToStorage(song);

  // Sinkronisasi pembaruan ke cloud
  try {
    const { uploadSongToCloud } = await import('./cloudDatabase');
    onProgress?.('Memperbarui katalog cloud...');
    await uploadSongToCloud(song.id, onProgress);
    const refreshed = await loadSongFromStorage(songId);
    if (refreshed) return refreshed;
  } catch (err) {
    console.warn('Cloud sync error on delete stem:', err);
  }

  return song;
}

/**
 * Creates a new song from discrete studio stem files uploaded by Admin.
 * 100% discrete, zero-bleed audio without any in-browser DSP filter hacks.
 */
export async function createSongFromFiles(
  title: string,
  artist: string,
  stemFiles: { role: StemRole; name: string; file: File }[],
  options?: {
    bpm?: number;
    key?: string;
    lyrics?: string;
    album?: string;
    artworkUrl?: string;
    onProgress?: (status: string) => void;
  }
): Promise<Song> {
  const ctx = globalAudioEngine.getContext();
  options?.onProgress?.('Mendekode berkas stem studio...');

  const stems: StemTrack[] = [];
  let maxDuration = 0;
  let masterBuffer: AudioBuffer | null = null;
  let extractedArt = options?.artworkUrl || null;

  for (let i = 0; i < stemFiles.length; i++) {
    const sf = stemFiles[i];
    options?.onProgress?.(`Mendekode stem ${sf.name} (${i + 1}/${stemFiles.length})...`);

    if (!extractedArt) {
      try {
        extractedArt = await extractEmbeddedArtwork(sf.file);
      } catch (_) {}
    }

    const arrayBuffer = await sf.file.arrayBuffer();
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
      pan: sf.role === 'lead' ? 0.35 : sf.role === 'rhythm' ? -0.35 : 0,
      muted: false,
      solo: false,
      audioBuffer,
      blob: sf.file,
      fileName: sf.file.name,
    });
  }

  // 1. Prioritize AI Web Research for official BPM & Key (Point 1)
  options?.onProgress?.('AI Web Research: Meneliti BPM dan Tangga Nada resmi lagu...');
  let aiResearched;
  try {
    aiResearched = await researchSongBpmAndKeyWithAI(title, artist);
  } catch (_) {}

  // 2. Audio analytical engines (only used as fallback if AI web research has no result)
  options?.onProgress?.('SpotiFLAC: Menghitung kualitas audio & kelantangan LUFS...');
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

  // AI Auto-LRC Lyrics & Chords generation (Point 10)
  let autoLyrics = options?.lyrics || '';
  if (!autoLyrics) {
    options?.onProgress?.('AI Lyricist: Menelusuri lirik resmi dan progresi akord lagu...');
    try {
      const generated = await generateLyricsAndChordsWithAI(title, artist);
      if (generated) autoLyrics = generated;
    } catch (_) {}
  }

  // STRICT PRIORITY: Manual Admin input ALWAYS wins, followed by AI research
  const finalBpm = options?.bpm || aiResearched?.bpm || 120;
  const finalKey = options?.key || aiResearched?.key || 'C';
  const finalTimeSignature = aiResearched?.timeSignature || '4/4';

  const cleanTitle = title.trim() || 'Untitled Cover';
  const cleanArtist = artist.trim() || 'The Flannels';
  const folderName = `Songs/${cleanTitle.replace(/[\\/:*?"<>|]/g, '_')}/`;

  let masterBlob: Blob | undefined;
  if (masterBuffer) {
    try {
      masterBlob = audioBufferToWavBlob(masterBuffer);
    } catch (_) {}
  }

  const discreteFiles: { name: string; size: number; role: string }[] = [];
  if (masterBlob) {
    discreteFiles.push({ name: 'master.wav', size: masterBlob.size, role: 'master' });
  }

  stems.forEach((s) => {
    discreteFiles.push({
      name: s.fileName || `${s.role}.wav`,
      size: s.blob?.size || 0,
      role: s.role,
    });
  });

  const newSong: Song = {
    id: `song-${Date.now()}`,
    title: cleanTitle,
    artist: cleanArtist,
    duration: maxDuration,
    bpm: finalBpm,
    originalKey: finalKey,
    timeSignature: finalTimeSignature,
    lyrics: autoLyrics,
    artworkUrl: extractedArt || undefined,
    researchNotes: aiResearched?.notes || `Tempo ${finalBpm} BPM, Key ${finalKey}`,
    folderName,
    discreteFiles,
    stems,
    createdAt: Date.now(),
    qualityAnalysis: qualityReport,
    bpmKeyAnalysis: bpmKeyReport,
    replayGain: replayGainReport,
  };

  options?.onProgress?.('Menyimpan berkas master dan 5 stem ke folder lagu...');
  if (masterBlob) {
    await set(`${AUDIO_BLOB_PREFIX}master_${newSong.id}`, masterBlob);
  }
  await saveSongToStorage(newSong);
  return newSong;
}
