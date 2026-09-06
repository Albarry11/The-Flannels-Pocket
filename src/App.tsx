import { useState, useEffect, useRef, useCallback } from 'react';
import type { Song, LoopRegion } from './types';
import { globalAudioEngine } from './services/audioEngine';
import { globalMetronome } from './services/metronomeEngine';
import { createProceduralDemoSong } from './services/proceduralSongs';
import { listAllSongsFromStorage, saveSongToStorage } from './services/storage';
import { analyzeAudioQuality, analyzeBpmAndKey, calculateReplayGain } from './services/audioAnalyzer';
import { Header } from './components/Header';
import { MasterPlayer } from './components/MasterPlayer';
import { StemTrackList } from './components/StemTrackList';
import { MetronomeDrawer } from './components/MetronomeDrawer';
import { AnalyzerModal } from './components/AnalyzerModal';
import { LyricsModal } from './components/LyricsModal';
import { FileManagerModal } from './components/FileManagerModal';
import { AIBrainModal } from './components/AIBrainModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { Loader2, Music2, Sparkles, FolderPlus, Cloud } from 'lucide-react';

export function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitchSemitones, setPitchSemitones] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(0.9);
  const [replayGainEnabled, setReplayGainEnabled] = useState<boolean>(false);
  const [loopRegion, setLoopRegion] = useState<LoopRegion>({ enabled: false, start: 0, end: 0 });

  // 1-Bar Count-In state
  const [countInActive, setCountInActive] = useState<boolean>(false);
  const [countInBeat, setCountInBeat] = useState<number>(1);

  // Real-time VU Levels for stems
  const [stemLevels, setStemLevels] = useState<Record<string, number>>({});
  const vuAnimationFrameRef = useRef<number | null>(null);

  // Modals state
  const [isMetronomeOpen, setIsMetronomeOpen] = useState<boolean>(false);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState<boolean>(false);
  const [isAIBrainOpen, setIsAIBrainOpen] = useState<boolean>(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState<boolean>(false);

  // Load song library on mount (Point 3: KOSONGKAN UNTUK BASE)
  const refreshSongs = useCallback(async () => {
    try {
      const stored = await listAllSongsFromStorage();
      if (stored.length > 0) {
        setSongs(stored);
        if (!currentSong) {
          selectSong(stored[0]);
        }
      } else {
        // Base library start empty as requested
        setSongs([]);
        setCurrentSong(null);
      }
    } catch (err) {
      console.error('Failed to load songs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentSong]);

  useEffect(() => {
    refreshSongs();
  }, [refreshSongs]);

  // Set up Audio Engine listeners
  useEffect(() => {
    globalAudioEngine.onTimeUpdate((time) => {
      setCurrentTime(time);
    });

    globalAudioEngine.onEnded(() => {
      setIsPlaying(false);
    });

    // Real-time VU meter polling
    const pollVU = () => {
      if (globalAudioEngine.getIsPlaying() && currentSong) {
        const levels: Record<string, number> = {};
        currentSong.stems.forEach((s) => {
          levels[s.id] = globalAudioEngine.getStemLevel(s.id);
        });
        setStemLevels(levels);
      } else {
        setStemLevels({});
      }
      vuAnimationFrameRef.current = requestAnimationFrame(pollVU);
    };

    vuAnimationFrameRef.current = requestAnimationFrame(pollVU);

    return () => {
      if (vuAnimationFrameRef.current) {
        cancelAnimationFrame(vuAnimationFrameRef.current);
      }
    };
  }, [currentSong]);

  const selectSong = (song: Song) => {
    globalAudioEngine.setSong(song);
    setCurrentSong({ ...song });
    setCurrentTime(0);
    setIsPlaying(false);
    setPitchSemitones(0);
    setLoopRegion({ enabled: false, start: 0, end: song.duration });
    globalMetronome.setBpm(song.bpm);
  };

  const handleLoadDemoSong = async () => {
    const demoSong = await createProceduralDemoSong(
      'Midnight Groove (Rock/Funk)',
      'The Flannels',
      115,
      'Em',
      24
    );
    const masterStem = demoSong.stems[0]?.audioBuffer;
    if (masterStem) {
      try {
        demoSong.qualityAnalysis = await analyzeAudioQuality(masterStem);
        demoSong.bpmKeyAnalysis = await analyzeBpmAndKey(masterStem);
        demoSong.replayGain = calculateReplayGain(masterStem);
      } catch (_) {}
    }
    await saveSongToStorage(demoSong);
    await refreshSongs();
    selectSong(demoSong);
  };

  const handlePlay = () => {
    globalAudioEngine.play();
    setIsPlaying(true);
  };

  const handlePlayWithCountIn = () => {
    if (!currentSong || isPlaying) return;
    setCountInActive(true);
    setCountInBeat(1);
    globalAudioEngine.playWithCountIn(
      (beat) => setCountInBeat(beat),
      () => {
        setCountInActive(false);
        setIsPlaying(true);
      }
    );
  };

  const handlePause = () => {
    globalAudioEngine.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    globalAudioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    setCountInActive(false);
  };

  const handleSeek = (time: number) => {
    globalAudioEngine.seek(time);
    setCurrentTime(time);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    globalAudioEngine.setSpeed(newSpeed);
  };

  const handlePitchChange = (semitones: number) => {
    const clamped = Math.max(-6, Math.min(6, semitones));
    setPitchSemitones(clamped);
    globalAudioEngine.setPitch(clamped);
  };

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    globalAudioEngine.setMasterVolume(vol);
  };

  const handleToggleReplayGain = () => {
    const next = !replayGainEnabled;
    setReplayGainEnabled(next);
    const gainDb = currentSong?.replayGain?.recommendedGainDb || 0;
    globalAudioEngine.setReplayGain(gainDb, next);
  };

  // Stems manipulation (SEAMLESS - NO AUDIO RESTART!)
  const handleVolumeChange = (stemId: string, vol: number) => {
    globalAudioEngine.setStemVolume(stemId, vol);
    if (currentSong) {
      const updatedStems = currentSong.stems.map((s) =>
        s.id === stemId ? { ...s, volume: vol } : s
      );
      setCurrentSong({ ...currentSong, stems: updatedStems });
    }
  };

  const handlePanChange = (stemId: string, pan: number) => {
    globalAudioEngine.setStemPan(stemId, pan);
    if (currentSong) {
      const updatedStems = currentSong.stems.map((s) =>
        s.id === stemId ? { ...s, pan } : s
      );
      setCurrentSong({ ...currentSong, stems: updatedStems });
    }
  };

  const handleToggleMute = (stemId: string) => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) =>
      s.id === stemId ? { ...s, muted: !s.muted } : s
    );
    setCurrentSong({ ...currentSong, stems: updated });
    globalAudioEngine.updateStemMuteSoloBatch(updated);
  };

  const handleToggleSolo = (stemId: string) => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) =>
      s.id === stemId ? { ...s, solo: !s.solo } : s
    );
    setCurrentSong({ ...currentSong, stems: updated });
    globalAudioEngine.updateStemMuteSoloBatch(updated);
  };

  // Quick solo presets for rehearsal (SEAMLESS - NO RESTART!)
  const handleSoloVocalOnly = () => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) => ({
      ...s,
      solo: s.role === 'vocal',
      muted: false,
    }));
    setCurrentSong({ ...currentSong, stems: updated });
    globalAudioEngine.updateStemMuteSoloBatch(updated);
  };

  const handleSoloRhythmSection = () => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) => ({
      ...s,
      solo: s.role === 'bass' || s.role === 'drums',
      muted: false,
    }));
    setCurrentSong({ ...currentSong, stems: updated });
    globalAudioEngine.updateStemMuteSoloBatch(updated);
  };

  const handleResetAllStems = () => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) => ({
      ...s,
      solo: false,
      muted: false,
    }));
    setCurrentSong({ ...currentSong, stems: updated });
    globalAudioEngine.updateStemMuteSoloBatch(updated);
  };

  const handleClearAllSolos = () => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) => ({
      ...s,
      solo: false,
    }));
    setCurrentSong({ ...currentSong, stems: updated });
    globalAudioEngine.updateStemMuteSoloBatch(updated);
  };

  // A-B Looper
  const handleSetLoopStart = () => {
    const newLoop = {
      ...loopRegion,
      enabled: true,
      start: currentTime,
      end: Math.max(currentTime + 2, loopRegion.end),
    };
    setLoopRegion(newLoop);
    globalAudioEngine.setLoopRegion(newLoop);
  };

  const handleSetLoopEnd = () => {
    const newLoop = {
      ...loopRegion,
      enabled: true,
      end: currentTime > loopRegion.start ? currentTime : loopRegion.start + 4,
    };
    setLoopRegion(newLoop);
    globalAudioEngine.setLoopRegion(newLoop);
  };

  const handleToggleLoop = () => {
    const newLoop = {
      ...loopRegion,
      enabled: !loopRegion.enabled,
    };
    setLoopRegion(newLoop);
    globalAudioEngine.setLoopRegion(newLoop);
  };

  const handleClearLoop = () => {
    const newLoop = {
      enabled: false,
      start: 0,
      end: currentSong?.duration || 0,
    };
    setLoopRegion(newLoop);
    globalAudioEngine.setLoopRegion(newLoop);
  };

  const handleUpdateLyrics = async (newLyrics: string) => {
    if (!currentSong) return;
    const updated = { ...currentSong, lyrics: newLyrics };
    setCurrentSong(updated);
    await saveSongToStorage(updated);
  };

  const activeSoloNames = currentSong?.stems.filter((s) => s.solo).map((s) => s.name) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#040914] text-cyan-200 gap-3">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <h2 className="text-base font-bold text-white tracking-tight">The Flannels Pocket</h2>
        <p className="text-xs text-slate-400">Menyiapkan workstation Frutiger Aero...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050b16] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        currentSong={currentSong}
        metronomeActive={isMetronomeOpen}
        onToggleMetronome={() => setIsMetronomeOpen(!isMetronomeOpen)}
        onOpenAnalyzer={() => setIsAnalyzerOpen(true)}
        onOpenLyrics={() => setIsLyricsOpen(true)}
        onOpenFileManager={() => setIsFileManagerOpen(true)}
        onOpenAIBrain={() => setIsAIBrainOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onResetAllStems={handleResetAllStems}
        onSoloVocalOnly={handleSoloVocalOnly}
        onSoloRhythmSection={handleSoloRhythmSection}
      />

      {/* Main Channel Strips Workspace */}
      <main className="flex-1 pb-36">
        {currentSong && currentSong.stems.length > 0 ? (
          <StemTrackList
            stems={currentSong.stems}
            currentTime={currentTime}
            duration={currentSong.duration}
            stemLevels={stemLevels}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onSeek={handleSeek}
          />
        ) : (
          /* Empty Base Welcome Screen (Point 3) */
          <div className="max-w-2xl mx-auto my-12 px-4 text-center">
            <div className="p-8 rounded-3xl bg-gradient-to-b from-[#0c182c]/80 via-[#071120]/90 to-[#040914] border border-cyan-500/30 shadow-2xl space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-300/40">
                <Music2 className="w-8 h-8 text-white" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Selamat Datang di The Flannels Pocket
                </h2>
                <p className="text-xs text-slate-300 mt-1.5 max-w-md mx-auto leading-relaxed">
                  Workstation pemutar multi-track, isolasi stem audio (Vocal, Lead, Rhythm, Bass, Drums),
                  dan asisten cerdas 9router untuk latihan band The Flannels.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => setIsFileManagerOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Unggah File Stem Baru</span>
                </button>

                <button
                  onClick={() => setIsCloudSyncOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#0b162a] hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <Cloud className="w-4 h-4 text-cyan-400" />
                  <span>Database Cloud Supabase</span>
                </button>

                <button
                  onClick={handleLoadDemoSong}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Coba Demo Track</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Master Player Bottom Bar */}
      <MasterPlayer
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={currentSong?.duration || 0}
        speed={speed}
        pitchSemitones={pitchSemitones}
        masterVolume={masterVolume}
        loopRegion={loopRegion}
        replayGainEnabled={replayGainEnabled}
        currentSong={currentSong}
        countInActive={countInActive}
        countInBeat={countInBeat}
        activeSoloNames={activeSoloNames}
        onPlay={handlePlay}
        onPlayWithCountIn={handlePlayWithCountIn}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        onSpeedChange={handleSpeedChange}
        onPitchChange={handlePitchChange}
        onMasterVolumeChange={handleMasterVolumeChange}
        onToggleLoop={handleToggleLoop}
        onSetLoopStart={handleSetLoopStart}
        onSetLoopEnd={handleSetLoopEnd}
        onClearLoop={handleClearLoop}
        onToggleReplayGain={handleToggleReplayGain}
        onClearAllSolos={handleClearAllSolos}
      />

      {/* Metronome Drawer */}
      <MetronomeDrawer
        isOpen={isMetronomeOpen}
        onClose={() => setIsMetronomeOpen(false)}
        defaultBpm={currentSong?.bpm || 115}
        songBpm={currentSong?.bpm}
        isSongPlaying={isPlaying}
      />

      {/* Audio Analyzer Modal (SpotiFLAC features) */}
      <AnalyzerModal
        isOpen={isAnalyzerOpen}
        onClose={() => setIsAnalyzerOpen(false)}
        currentSong={currentSong}
        replayGainEnabled={replayGainEnabled}
        onToggleReplayGain={handleToggleReplayGain}
      />

      {/* Lyrics & Chord Sheet Modal */}
      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        currentSong={currentSong}
        currentTime={currentTime}
        pitchSemitones={pitchSemitones}
        onSeek={handleSeek}
        onUpdateLyrics={handleUpdateLyrics}
      />

      {/* File & Song Manager Modal */}
      <FileManagerModal
        isOpen={isFileManagerOpen}
        onClose={() => setIsFileManagerOpen(false)}
        songs={songs}
        currentSongId={currentSong?.id || null}
        onSelectSong={selectSong}
        onRefreshSongs={refreshSongs}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onLoadDemoSong={handleLoadDemoSong}
      />

      {/* AI Brain Modal (9router Engine) */}
      <AIBrainModal
        isOpen={isAIBrainOpen}
        onClose={() => setIsAIBrainOpen(false)}
        currentSong={currentSong}
      />

      {/* Cloud Sync Modal (Supabase) */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        songs={songs}
        onRefreshSongs={refreshSongs}
      />
    </div>
  );
}

export default App;
