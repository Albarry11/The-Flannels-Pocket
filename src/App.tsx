import { useState, useEffect, useCallback } from 'react';
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
import { Sliders, Folder, FileText, Brain, Loader2 } from 'lucide-react';

export type ActiveNavTab = 'mixer' | 'library' | 'lyrics' | 'brain';

export function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('library');
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true);

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

  // Integrated Metronome State in Master Player
  const [metronomeClickActive, setMetronomeClickActive] = useState<boolean>(false);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(120);

  // Video Background GPU Saver Toggle (Point 12)
  const [isVideoBgActive, setIsVideoBgActive] = useState<boolean>(() => {
    return localStorage.getItem('flannels_video_bg') !== 'false';
  });

  const handleToggleVideo = () => {
    const next = !isVideoBgActive;
    setIsVideoBgActive(next);
    localStorage.setItem('flannels_video_bg', String(next));
  };

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

  // Audio Engine time listeners (VU meter animation moved to direct DOM in mixer -> 0 React re-renders)
  useEffect(() => {
    globalAudioEngine.onTimeUpdate((time) => {
      setCurrentTime(time);
    });

    globalAudioEngine.onEnded(() => {
      setIsPlaying(false);
    });
  }, []);

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

  // Metronome in player control bar
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
      saveSongToStorage(currentSong);
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

  const handleSoloGuitarOnly = () => {
    if (!currentSong) return;
    const updated = currentSong.stems.map((s) => ({
      ...s,
      solo: s.role === 'guitar' || s.role === 'lead' || s.role === 'rhythm',
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
      <div className="min-h-screen flex flex-col items-center justify-center text-sky-900 gap-3 bg-sky-100/60">
        <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
        <h2 className="text-base font-black text-[#0f2942] tracking-tight">The Flannels pocket</h2>
        <p className="text-xs text-sky-800 font-medium">Menyiapkan workstation musik...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-[#0b2238] font-sans selection:bg-emerald-400 selection:text-black relative overflow-x-hidden">
      {/* Grand Background (Frutiger Aero Workspace) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {isVideoBgActive ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="./aero-bg-poster.jpg"
            className="w-full h-full object-cover object-center"
          >
            <source src="./aero-bg.mp4" type="video/mp4" />
          </video>
        ) : (
          <img
            src="./aero-bg-poster.jpg"
            alt="Aero Background"
            className="w-full h-full object-cover object-center opacity-85"
          />
        )}
        {/* Soft Aero sky tint overlay without heavy blur */}
        <div className="absolute inset-0 bg-sky-950/15" />
      </div>

      {/* Decorative Authentic Frutiger Aero Water Dew Droplets on Screen Glass */}
      <div className="water-drop top-14 right-36" style={{ width: '22px', height: '22px' }} />
      <div className="water-drop top-32 right-14" style={{ width: '15px', height: '15px' }} />
      <div className="water-drop top-16 left-72" style={{ width: '18px', height: '18px' }} />
      <div className="water-drop top-56 left-28" style={{ width: '12px', height: '12px' }} />
      <div className="water-drop bottom-40 right-64" style={{ width: '24px', height: '24px' }} />
      <div className="water-drop bottom-28 left-80" style={{ width: '16px', height: '16px' }} />

      {/* 1. Full-Width Continuous Windows Vista / Aero Header */}
      <Header
        currentSong={currentSong}
        activeSoloNames={activeSoloNames}
        onClearAllSolos={handleClearAllSolos}
        isNavOpen={isNavOpen}
        onToggleNav={() => setIsNavOpen(!isNavOpen)}
        isVideoActive={isVideoBgActive}
        onToggleVideo={handleToggleVideo}
      />

      {/* 2. Below Header: Workspace Layout with Collapsible Aero Sidebar */}
      <div className="flex-1 flex relative w-full overflow-hidden">
        {/* Collapsible Left Sidebar (like image_f35097.png) */}
        <aside
          className={`flex-shrink-0 transition-all duration-300 py-3 pl-3 ${
            isNavOpen ? 'w-20 sm:w-24 opacity-100' : 'w-0 pl-0 opacity-0 overflow-hidden pointer-events-none'
          }`}
        >
          {/* Dark Translucent Backing for High Contrast (SiteCritic & Roast Fix) */}
          <div className="w-full h-full rounded-3xl bg-[#08182b]/90 backdrop-blur-3xl border border-sky-400/30 flex flex-col items-center py-6 justify-center gap-5 shadow-2xl">
            {/* Mixer Button with Tooltip Popover */}
            <button
              onClick={() => setActiveTab('mixer')}
              className={`w-14 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition group relative ${
                activeTab === 'mixer'
                  ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white font-black shadow-lg shadow-sky-500/40 border border-white scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Mixer Console"
              aria-label="Buka Mixer Console 4-Channel"
            >
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span className="text-[9px] font-extrabold tracking-tight">Mixer</span>
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#061424] text-white text-[11px] font-extrabold whitespace-nowrap shadow-2xl border border-sky-400/40 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Mixer Console
              </div>
            </button>

            {/* Library Button with Tooltip Popover */}
            <button
              onClick={() => setActiveTab('library')}
              className={`w-14 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition group relative ${
                activeTab === 'library'
                  ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white font-black shadow-lg shadow-sky-500/40 border border-white scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Library Lagu Cover"
              aria-label="Buka Library Koleksi Lagu Cover"
            >
              <Folder className="w-5 h-5 text-sky-400" />
              <span className="text-[9px] font-extrabold tracking-tight">Library</span>
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#061424] text-white text-[11px] font-extrabold whitespace-nowrap shadow-2xl border border-sky-400/40 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Library Lagu
              </div>
            </button>

            {/* Lyrics Button with Tooltip Popover */}
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`w-14 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition group relative ${
                activeTab === 'lyrics'
                  ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white font-black shadow-lg shadow-sky-500/40 border border-white scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Lirik & Chord"
              aria-label="Buka Sinkronisasi Lirik dan Chord"
            >
              <FileText className="w-5 h-5 text-indigo-300" />
              <span className="text-[9px] font-extrabold tracking-tight">Lirik</span>
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#061424] text-white text-[11px] font-extrabold whitespace-nowrap shadow-2xl border border-sky-400/40 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Lirik & Chord
              </div>
            </button>

            {/* Tilikan Button with Tooltip Popover */}
            <button
              onClick={() => setActiveTab('brain')}
              className={`w-14 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition group relative ${
                activeTab === 'brain'
                  ? 'bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 text-white font-black shadow-lg shadow-sky-500/40 border border-white scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Tilikan"
              aria-label="Buka Analisis Aransemen Tilikan AI"
            >
              <Brain className="w-5 h-5 text-purple-300" />
              <span className="text-[9px] font-extrabold tracking-tight">Tilikan</span>
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#061424] text-white text-[11px] font-extrabold whitespace-nowrap shadow-2xl border border-sky-400/40 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Tilikan AI
              </div>
            </button>
          </div>
        </aside>

        {/* Main View: Padded at bottom so player dock never obstructs it */}
        <main className="flex-1 p-3 sm:p-5 pb-28 sm:pb-32 overflow-y-auto">
          {activeTab === 'mixer' && (
            currentSong && currentSong.stems.length > 0 ? (
              <VerticalStemMixer
                stems={currentSong.stems}
                onVolumeChange={handleVolumeChange}
                onPanChange={handlePanChange}
                onToggleMute={handleToggleMute}
                onToggleSolo={handleToggleSolo}
                onSoloVocalOnly={handleSoloVocalOnly}
                onSoloGuitarOnly={handleSoloGuitarOnly}
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
      </div>

      {/* 3. Modern Edge-to-Edge Player Dock */}
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
  );
}

export default App;
