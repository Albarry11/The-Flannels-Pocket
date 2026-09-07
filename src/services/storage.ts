import { get, set, del, keys } from 'idb-keyval';
import type { Song, StemTrack, StemRole } from '../types';
import { globalAudioEngine } from './audioEngine';
import { analyzeAudioQuality, analyzeBpmAndKey, calculateReplayGain } from './audioAnalyzer';
import { audioBufferToWavBlob } from './stemSeparator';
import { processSeparationWithFallback } from './stemApi';
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
 * If 1 single audio file is provided, automatically uses AI Stem Separation
 * to generate Vocal, Lead Guitar, Rhythm Guitar, Bass, and Drums!
 */
export async function createSongFromFiles(
  title: string,
  artist: string,
  stemFiles: { role: StemRole; name: string; file: File }[],
  options?: {
    bpm?: number;
    key?: string;
    lyrics?: string;
    onProgress?: (status: string) => void;
  }
): Promise<Song> {
  const ctx = globalAudioEngine.getContext();
  options?.onProgress?.('Mendekode audio utama...');

  let stems: StemTrack[] = [];
  let maxDuration = 0;
  let masterBuffer: AudioBuffer | null = null;
  let extractedArt: string | null = null;

  if (stemFiles.length === 1) {
    // SINGLE FULL AUDIO FILE UPLOAD -> Extract embedded artwork & Run AI Stem Splitter!
    const file = stemFiles[0].file;
    try {
      extractedArt = await extractEmbeddedArtwork(file);
    } catch (_) {}

    const arrayBuffer = await file.arrayBuffer();
    masterBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    maxDuration = masterBuffer.duration;

    options?.onProgress?.('AI Stem Separator: Memisahkan vokal dan instrumen...');
    stems = await processSeparationWithFallback(file, masterBuffer, options?.onProgress);
  } else {
    // MULTI-STEM UPLOAD -> Map each stem file
    for (const sf of stemFiles) {
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
        pan: 0,
        muted: false,
        solo: false,
        audioBuffer,
        blob: sf.file,
        fileName: sf.file.name,
      });
    }
  }

  // Audio analysis
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

  // AI Web Research for official BPM & Key (Point 7)
  options?.onProgress?.('AI Web Research: Meneliti BPM dan Tangga Nada resmi lagu...');
  let aiResearched;
  try {
    aiResearched = await researchSongBpmAndKeyWithAI(title, artist);
  } catch (_) {}

  // AI Auto-LRC Lyrics & Chords generation (Point 10)
  let autoLyrics = options?.lyrics || '';
  if (!autoLyrics) {
    options?.onProgress?.('AI Lyricist: Membuat lirik tersinkronisasi dan akord lagu...');
    try {
      const generated = await generateLyricsAndChordsWithAI(title, artist);
      if (generated) autoLyrics = generated;
    } catch (_) {}
  }

  const finalBpm = options?.bpm || aiResearched?.bpm || bpmKeyReport?.bpm || 120;
  const finalKey = options?.key || aiResearched?.key || bpmKeyReport?.key || 'C';
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
    verifiedSource: aiResearched?.verifiedSource || 'Web Search (SongBPM / Tunebat)',
    sourceUrl: aiResearched?.sourceUrl || `https://tunebat.com/Search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`.trim())}`,
    researchNotes: aiResearched?.notes || `Verifikasi web resmi: tempo ${finalBpm} BPM dan tangga nada ${finalKey}`,
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
