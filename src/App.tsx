import { useState, useEffect, useRef, useCallback } from 'react';
import type { Song, StemTrack, LoopRegion } from './types';
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
import { Loader2 } from 'lucide-react';

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

  // Real-time VU Levels for stems
  const [stemLevels, setStemLevels] = useState<Record<string, number>>({});
  const vuAnimationFrameRef = useRef<number | null>(null);

  // Modals state
  const [isMetronomeOpen, setIsMetronomeOpen] = useState<boolean>(false);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState<boolean>(false);

  // Load song library on initial mount
  const refreshSongs = useCallback(async () => {
    try {
      const stored = await listAllSongsFromStorage();
      if (stored.length > 0) {
        setSongs(stored);
        if (!currentSong) {
          selectSong(stored[0]);
        }
      } else {
        // First-time visit: generate default high-fidelity procedural demo
        const demoSong = await createProceduralDemoSong(
          'Midnight Groove (Rock/Funk)',
          'The Flannels',
          115,
          'Em',
          24
        );
        // Analyze demo song stems/master
        const masterStem = demoSong.stems[0]?.audioBuffer;
        if (masterStem) {
          try {
            demoSong.qualityAnalysis = await analyzeAudioQuality(masterStem);
            demoSong.bpmKeyAnalysis = await analyzeBpmAndKey(masterStem);
            demoSong.replayGain = calculateReplayGain(masterStem);
          } catch (_) {}
        }
        await saveSongToStorage(demoSong);
        setSongs([demoSong]);
        selectSong(demoSong);
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

    // Real-time VU meter level polling
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

  const handlePlay = () => {
    globalAudioEngine.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    globalAudioEngine.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    globalAudioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
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

  // Stems manipulation
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
    globalAudioEngine.toggleStemMute(stemId);
    if (currentSong) {
      const updatedStems = currentSong.stems.map((s) =>
        s.id === stemId ? { ...s, muted: !s.muted } : s
      );
      setCurrentSong({ ...currentSong, stems: updatedStems });
    }
  };

  const handleToggleSolo = (stemId: string) => {
    globalAudioEngine.toggleStemSolo(stemId);
    if (currentSong) {
      const updatedStems = currentSong.stems.map((s) =>
        s.id === stemId ? { ...s, solo: !s.solo } : s
      );
      setCurrentSong({ ...currentSong, stems: updatedStems });
    }
  };

  // Quick solo presets for rehearsal
  const handleSoloVocalOnly = () => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) => ({
      ...s,
      solo: s.role === 'vocal',
      muted: false,
    }));
    applyUpdatedStems(updated);
  };

  const handleSoloRhythmSection = () => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) => ({
      ...s,
      solo: s.role === 'bass' || s.role === 'drums',
      muted: false,
    }));
    applyUpdatedStems(updated);
  };

  const handleResetAllStems = () => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) => ({
      ...s,
      solo: false,
      muted: false,
    }));
    applyUpdatedStems(updated);
  };

  const applyUpdatedStems = (updatedStems: StemTrack[]) => {
    if (!currentSong) return;
    const song = { ...currentSong, stems: updatedStems };
    setCurrentSong(song);
    globalAudioEngine.setSong(song);
    if (isPlaying) {
      globalAudioEngine.play();
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-flannel-dark text-slate-300 gap-3">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <h2 className="text-base font-bold text-white tracking-tight">The Flannels Pocket</h2>
        <p className="text-xs text-slate-400">Menyiapkan workstation kulik band...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0b10] text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentSong={currentSong}
        metronomeActive={isMetronomeOpen}
        onToggleMetronome={() => setIsMetronomeOpen(!isMetronomeOpen)}
        onOpenAnalyzer={() => setIsAnalyzerOpen(true)}
        onOpenLyrics={() => setIsLyricsOpen(true)}
        onOpenFileManager={() => setIsFileManagerOpen(true)}
        onResetAllStems={handleResetAllStems}
        onSoloVocalOnly={handleSoloVocalOnly}
        onSoloRhythmSection={handleSoloRhythmSection}
      />

      {/* Main Channel Strips Workspace */}
      <main className="flex-1 pb-32">
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
          <div className="text-center py-20 text-slate-500">
            <p>Tidak ada stem audio yang dimuat.</p>
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
        onPlay={handlePlay}
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
      />

      {/* Metronome Drawer */}
      <MetronomeDrawer
        isOpen={isMetronomeOpen}
        onClose={() => setIsMetronomeOpen(false)}
        defaultBpm={currentSong?.bpm || 115}
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
      />
    </div>
  );
}

export default App;
