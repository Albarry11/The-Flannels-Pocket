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
import { Sliders, Folder, FileText, Brain, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export type ActiveNavTab = 'mixer' | 'library' | 'lyrics' | 'brain';

export function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('mixer');
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true); // Point 7: Nav Bar Hide & Show

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

  // Integrated Metronome State in Master Player (Point 2 & 4)
  const [metronomeClickActive, setMetronomeClickActive] = useState<boolean>(false);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(120);

  // Real-time VU Levels for stems
  const [stemLevels, setStemLevels] = useState<Record<string, number>>({});
  const vuAnimationFrameRef = useRef<number | null>(null);

  // Load song library on mount
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
    setMetronomeBpm(song.bpm);
    globalMetronome.setBpm(song.bpm);
    setActiveTab('mixer');
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

  // Metronome in player control bar (Point 2 & 4)
  const handleToggleMetronomeClick = () => {
    const next = !metronomeClickActive;
    setMetronomeClickActive(next);
    globalAudioEngine.setMetronomeSync(next, 0.8);
  };

  const handleMetronomeBpmChange = (newBpm: number) => {
    const clamped = Math.max(30, Math.min(260, newBpm));
    setMetronomeBpm(clamped);
    globalMetronome.setBpm(clamped);
    if (currentSong) {
      currentSong.bpm = clamped;
    }
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

  // Quick Access Shortcuts
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
      <div className="min-h-screen flex flex-col items-center justify-center text-sky-800 gap-3">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
        <h2 className="text-base font-bold text-[#0f2942] tracking-tight">The Flannels pocket</h2>
        <p className="text-xs text-sky-700">Menyiapkan workstation musik...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex text-[#0f2942] font-sans selection:bg-sky-500 selection:text-white relative">
      {/* Sidebar Toggle Floating Button (Point 7: Nav Bar Hide & Show) */}
      <button
        onClick={() => setIsNavOpen(!isNavOpen)}
        className="fixed left-2.5 top-3 z-50 p-2 rounded-full bg-white/80 border border-sky-300 shadow-md text-sky-800 hover:text-sky-600 hover:bg-white transition active:scale-90"
        title={isNavOpen ? 'Sembunyikan Menu Samping' : 'Tampilkan Menu Samping'}
      >
        {isNavOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </button>

      {/* 1. Navbar Flush to the Absolute Left Frame (Point 3 & 7) */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 w-16 md:w-20 bg-white/75 backdrop-blur-2xl border-r border-white/80 flex flex-col items-center py-16 justify-center shadow-[4px_0_24px_rgba(2,132,199,0.1)] transition-transform duration-300 ${
          isNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation Buttons (Mixer, Library, Lirik, Tilikan) */}
        <div className="flex flex-col gap-4 w-full px-2">
          <button
            onClick={() => setActiveTab('mixer')}
            className={`w-full py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition shadow-xs ${
              activeTab === 'mixer'
                ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
                : 'text-sky-900 hover:text-sky-600 hover:bg-sky-100/60'
            }`}
            title="Mixer Console"
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-tight">Mixer</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition shadow-xs ${
              activeTab === 'library'
                ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
                : 'text-sky-900 hover:text-sky-600 hover:bg-sky-100/60'
            }`}
            title="Library Lagu Cover"
          >
            <Folder className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-tight">Library</span>
          </button>

          <button
            onClick={() => setActiveTab('lyrics')}
            className={`w-full py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition shadow-xs ${
              activeTab === 'lyrics'
                ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
                : 'text-sky-900 hover:text-sky-600 hover:bg-sky-100/60'
            }`}
            title="Lirik & Chord"
          >
            <FileText className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-tight">Lirik</span>
          </button>

          {/* Point 8: Menu AI Brain rename jadi Tilikan */}
          <button
            onClick={() => setActiveTab('brain')}
            className={`w-full py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition shadow-xs ${
              activeTab === 'brain'
                ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/30'
                : 'text-sky-900 hover:text-sky-600 hover:bg-sky-100/60'
            }`}
            title="Tilikan"
          >
            <Brain className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-tight">Tilikan</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area (Smooth padding adjustment when sidebar toggled) */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          isNavOpen ? 'pl-16 md:pl-20' : 'pl-0'
        }`}
      >
        {/* Seamless Header (Point 1 & 4) */}
        <div className={isNavOpen ? 'pl-0' : 'pl-12'}>
          <Header
            currentSong={currentSong}
            activeSoloNames={activeSoloNames}
            onClearAllSolos={handleClearAllSolos}
          />
        </div>

        {/* Main Spacious View with generous bottom clearance (Point 5: scale robust & no overlap) */}
        <main className="flex-1 p-3 sm:p-5 pb-56 sm:pb-64 overflow-y-auto">
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
            />
          )}
        </main>

        {/* 3. Master Player (Glassy iOS Floating Capsule with Attached Metronome & Key) (Point 2, 4, 6) */}
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
          metronomeClickActive={metronomeClickActive}
          metronomeBpm={metronomeBpm}
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
          onToggleMetronomeClick={handleToggleMetronomeClick}
          onMetronomeBpmChange={handleMetronomeBpmChange}
        />
      </div>
    </div>
  );
}

export default App;
