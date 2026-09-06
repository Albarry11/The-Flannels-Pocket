import { useState, useEffect, useRef, useCallback } from 'react';
import type { Song, LoopRegion } from './types';
import { globalAudioEngine } from './services/audioEngine';
import { globalMetronome } from './services/metronomeEngine';
import { listAllSongsFromStorage, saveSongToStorage } from './services/storage';
import { Header } from './components/Header';
import { MasterPlayer } from './components/MasterPlayer';
import { VerticalStemMixer } from './components/VerticalStemMixer';
import { CoverSongLibrary } from './components/CoverSongLibrary';
import { LyricsManager } from './components/LyricsManager';
import { AIBrainAndAnalyzer } from './components/AIBrainAndAnalyzer';
import { MetronomeDrawer } from './components/MetronomeDrawer';
import { Sliders, Folder, FileText, Brain, Radio, Loader2 } from 'lucide-react';

export type ActiveNavTab = 'mixer' | 'library' | 'lyrics' | 'brain' | 'metronome';

export function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('mixer');

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

  // Load song library on mount (Base library starts empty as requested in Point 3)
  const refreshSongs = useCallback(async () => {
    try {
      const stored = await listAllSongsFromStorage();
      if (stored.length > 0) {
        setSongs(stored);
        if (!currentSong) {
          selectSong(stored[0]);
        }
      } else {
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

  // Audio Engine time & VU meter listeners
  useEffect(() => {
    globalAudioEngine.onTimeUpdate((time) => {
      setCurrentTime(time);
    });

    globalAudioEngine.onEnded(() => {
      setIsPlaying(false);
    });

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
    setActiveTab('mixer'); // Switch to mixer console when a song is chosen
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

  // Quick Access Shortcuts (SEAMLESS - NO PLAYBACK RESTART!)
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

  const handleUpdateSongInfo = async (bpm: number, key: string) => {
    if (!currentSong) return;
    const updated = { ...currentSong, bpm, originalKey: key };
    setCurrentSong(updated);
    globalMetronome.setBpm(bpm);
    await saveSongToStorage(updated);
  };

  const activeSoloNames = currentSong?.stems.filter((s) => s.solo).map((s) => s.name) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#040814] text-cyan-200 gap-3">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <h2 className="text-base font-bold text-white tracking-tight">The Flannel pocket</h2>
        <p className="text-xs text-slate-400">Menyiapkan workstation musik...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#040814] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header without logo/emote (Point 5) */}
      <Header
        currentSong={currentSong}
        activeSoloNames={activeSoloNames}
        onClearAllSolos={handleClearAllSolos}
      />

      {/* Main Spacious App Body with Vertical Navigation Sidebar (Point 8) */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full p-2 sm:p-4 gap-3">
        
        {/* Sleek Vertical Navigation Sidebar */}
        <aside className="w-full md:w-56 flex-shrink-0 flex md:flex-col gap-1.5 p-2 rounded-2xl bg-[#070f1e]/80 border border-cyan-500/20 backdrop-blur-xl shadow-lg justify-around md:justify-start">
          <button
            onClick={() => setActiveTab('mixer')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition w-full ${
              activeTab === 'mixer'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-[#0c1930]'
            }`}
          >
            <Sliders className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Mixer Console</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition w-full ${
              activeTab === 'library'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-[#0c1930]'
            }`}
          >
            <Folder className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Library Lagu</span>
          </button>

          <button
            onClick={() => setActiveTab('lyrics')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition w-full ${
              activeTab === 'lyrics'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-[#0c1930]'
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Lirik & Chord</span>
          </button>

          <button
            onClick={() => setActiveTab('brain')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition w-full ${
              activeTab === 'brain'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-[#0c1930]'
            }`}
          >
            <Brain className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">AI Brain & Analisis</span>
          </button>

          <button
            onClick={() => setActiveTab('metronome')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition w-full ${
              activeTab === 'metronome'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-[#0c1930]'
            }`}
          >
            <Radio className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Metronome</span>
          </button>
        </aside>

        {/* Center Workspace Content */}
        <main className="flex-1 flex flex-col min-w-0 pb-36">
          {activeTab === 'mixer' && (
            currentSong && currentSong.stems.length > 0 ? (
              <VerticalStemMixer
                stems={currentSong.stems}
                stemLevels={stemLevels}
                onVolumeChange={handleVolumeChange}
                onPanChange={handlePanChange}
                onToggleMute={handleToggleMute}
                onToggleSolo={handleToggleSolo}
                onSoloVocalOnly={handleSoloVocalOnly}
                onSoloRhythmSection={handleSoloRhythmSection}
                onResetAllStems={handleResetAllStems}
              />
            ) : (
              <CoverSongLibrary
                songs={songs}
                currentSongId={currentSong?.id || null}
                onSelectSong={selectSong}
                onRefreshSongs={refreshSongs}
              />
            )
          )}

          {activeTab === 'library' && (
            <CoverSongLibrary
              songs={songs}
              currentSongId={currentSong?.id || null}
              onSelectSong={selectSong}
              onRefreshSongs={refreshSongs}
            />
          )}

          {activeTab === 'lyrics' && (
            <LyricsManager
              currentSong={currentSong}
              currentTime={currentTime}
              pitchSemitones={pitchSemitones}
              onSeek={handleSeek}
              onUpdateLyrics={handleUpdateLyrics}
            />
          )}

          {activeTab === 'brain' && (
            <AIBrainAndAnalyzer
              currentSong={currentSong}
              replayGainEnabled={replayGainEnabled}
              onToggleReplayGain={handleToggleReplayGain}
              onUpdateSongInfo={handleUpdateSongInfo}
            />
          )}

          {activeTab === 'metronome' && (
            <div className="p-4 rounded-3xl bg-[#080f1e]/80 border border-cyan-500/25 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
              <MetronomeDrawer
                isOpen={true}
                onClose={() => setActiveTab('mixer')}
                defaultBpm={currentSong?.bpm || 115}
                songBpm={currentSong?.bpm}
                isSongPlaying={isPlaying}
              />
            </div>
          )}
        </main>

      </div>

      {/* Persistent Master Player Bottom Bar (WMP 11/12 Aero Frutiger) */}
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
      />
    </div>
  );
}

export default App;
