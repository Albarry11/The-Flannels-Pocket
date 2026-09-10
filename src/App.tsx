import { useState, useEffect, useCallback, useRef } from 'react';

const ADMIN_UNLOCK_SEQUENCE = ['maximize', 'minimize', 'close', 'close'] as const;
import type { Song, LoopRegion } from './types';
import { globalAudioEngine, EQ_PRESETS } from './services/audioEngine';
import type { EqPresetName } from './services/audioEngine';
import { globalMetronome } from './services/metronomeEngine';
import { listAllSongsFromStorage, saveSongToStorage } from './services/storage';
import { Header } from './components/Header';
import { MasterPlayer } from './components/MasterPlayer';
import { VerticalStemMixer } from './components/VerticalStemMixer';
import { CoverSongLibrary } from './components/CoverSongLibrary';
import { LyricsManager } from './components/LyricsManager';
import { AIBrainAndAnalyzer } from './components/AIBrainAndAnalyzer';
import { SongRequestLeaderboard } from './components/SongRequestLeaderboard';
import { AdminStemUploadModal } from './components/AdminStemUploadModal';
import { AudioLoadingModal } from './components/AudioLoadingModal';
import { Sliders, Folder, FileText, Brain } from 'lucide-react';
import type { SongRequest } from './types';

export type ActiveNavTab = 'mixer' | 'requests' | 'library' | 'lyrics' | 'brain';

export function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('requests');
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true);

  // Admin & Song Request Modal State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('flannels_is_admin') === 'true';
  });
  const [showAdminUploadModal, setShowAdminUploadModal] = useState<boolean>(false);
  const [requestToFulfill, setRequestToFulfill] = useState<SongRequest | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [audioLoadingText, setAudioLoadingText] = useState<string>('');
  const [loadingModalState, setLoadingModalState] = useState<{
    isOpen: boolean;
    song: Song | null;
    percent: number;
    text: string;
    detail?: string;
  }>({
    isOpen: false,
    song: null,
    percent: 0,
    text: '',
    detail: '',
  });
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
  const [metronomeBeatsPerBar, setMetronomeBeatsPerBar] = useState<number>(4);
  const [metronomeVolume, setMetronomeVolume] = useState<number>(0.8);

  // Dummy window controls provide hidden Admin unlock sequence.
  useEffect(() => {
    let sequence: string[] = [];
    const handleAdminShortcut = (event: Event) => {
      const control = (event as CustomEvent<string>).detail;
      if (!control) return;
      sequence = [...sequence, control].slice(-ADMIN_UNLOCK_SEQUENCE.length);
      if (sequence.join('|') !== ADMIN_UNLOCK_SEQUENCE.join('|')) return;

      sequence = [];
      if (isAdmin) {
        setIsAdmin(false);
        localStorage.setItem('flannels_is_admin', 'false');
        return;
      }

      const pin = prompt('Masukkan Password Admin:');
      if (pin === 'lempiz') {
        setIsAdmin(true);
        localStorage.setItem('flannels_is_admin', 'true');
      }
    };

    window.addEventListener('flannels-window-control', handleAdminShortcut);
    return () => window.removeEventListener('flannels-window-control', handleAdminShortcut);
  }, [isAdmin]);

  const handleToggleAdmin = () => {
    if (!isAdmin) return;
    setIsAdmin(false);
    localStorage.setItem('flannels_is_admin', 'false');
  };

  // Video Background GPU Saver Toggle (Point 12) - Default OFF for maximum responsiveness (Item 17)
  const [isVideoBgActive, setIsVideoBgActive] = useState<boolean>(() => {
    return localStorage.getItem('flannels_video_bg') === 'true';
  });

  const handleToggleVideo = () => {
    const next = !isVideoBgActive;
    setIsVideoBgActive(next);
    localStorage.setItem('flannels_video_bg', String(next));
  };

  // Load song library on mount - Cloud-First automatic fetch
  const currentSongRef = useRef<Song | null>(null);
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const refreshSongs = useCallback(async () => {
    try {
      // 1. Direct fetch from Supabase Cloud Catalog first (automatic for all band members)
      let songList: Song[] = [];
      try {
        const { syncSongsFromCloud } = await import('./services/cloudDatabase');
        const cloudRes = await syncSongsFromCloud();
        if (cloudRes.songs && cloudRes.songs.length > 0) {
          songList = cloudRes.songs;
        }
      } catch (_) {}

      // 2. Fallback to local storage if offline
      if (songList.length === 0) {
        songList = await listAllSongsFromStorage();
      }

      if (songList.length > 0) {
        setSongs(songList);
        if (!currentSongRef.current) {
          selectSong(songList[0]);
        }
      } else {
        setSongs([]);
      }
    } catch (err) {
      console.error('Failed to load songs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const selectSong = async (song: Song) => {
    const needsLoading = song.stems.some((s) => !s.audioBuffer);
    if (needsLoading) {
      setLoadingModalState({
        isOpen: true,
        song,
        percent: 5,
        text: 'Memeriksa berkas audio stem...',
        detail: `${song.stems.length} Stems`,
      });
    }

    setIsAudioLoading(true);
    setAudioLoadingText('Memeriksa berkas audio stem...');

    try {
      await globalAudioEngine.prepareSongAudio(song, (progress) => {
        setAudioLoadingText(progress.text);
        if (needsLoading) {
          setLoadingModalState((prev) => ({
            ...prev,
            percent: progress.percent,
            text: progress.text,
            detail: progress.detail,
          }));
        }
      });

      if (needsLoading) {
        setLoadingModalState((prev) => ({
          ...prev,
          percent: 100,
          text: 'Selesai! Audio siap dimainkan.',
          detail: '100% Studio Quality',
        }));
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    } catch (e: any) {
      console.warn('prepareSongAudio error:', e);
      alert(e?.message || 'Gagal memuat berkas audio.');
    } finally {
      setIsAudioLoading(false);
      setAudioLoadingText('');
      setLoadingModalState((prev) => ({ ...prev, isOpen: false }));
    }

    globalAudioEngine.setSong(song);
    globalAudioEngine.setSpeed(1.0);
    globalAudioEngine.setPitchSemitones(0);
    setCurrentSong({ ...song });
    setCurrentTime(0);
    setIsPlaying(false);
    setSpeed(1.0);
    setPitchSemitones(0);
    setLoopRegion({ enabled: false, start: 0, end: song.duration });
    setMetronomeBpm(song.bpm);
    const beats = song.timeSignature?.startsWith('6/8') ? 6 : Number(song.timeSignature?.split('/')[0]) || 4;
    setMetronomeBeatsPerBar(beats);
    globalMetronome.setBpm(song.bpm);
    globalMetronome.setBeatsPerBar(beats);
    globalAudioEngine.setMetronomeBeatsPerBar(beats);
    setActiveTab('mixer');
  };

  const handlePlay = async () => {
    if (!currentSong) return;
    const needsLoading = currentSong.stems.some((s) => !s.audioBuffer);
    if (needsLoading) {
      setLoadingModalState({
        isOpen: true,
        song: currentSong,
        percent: 5,
        text: 'Memuat audio stem...',
        detail: `${currentSong.stems.length} Stems`,
      });
    }

    try {
      setIsAudioLoading(true);
      await globalAudioEngine.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Tidak dapat memutar audio.');
      setIsPlaying(false);
    } finally {
      setIsAudioLoading(false);
      setLoadingModalState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handlePlayWithCountIn = async () => {
    if (!currentSong || isPlaying) return;
    try {
      setIsAudioLoading(true);
      await globalAudioEngine.prepareSongAudio(currentSong);
      setIsAudioLoading(false);
      setCountInActive(true);
      setCountInBeat(1);
      globalAudioEngine.playWithCountIn(
        (beat) => setCountInBeat(beat),
        () => {
          setCountInActive(false);
          setIsPlaying(true);
        }
      );
    } catch (err: any) {
      setIsAudioLoading(false);
      alert(err?.message || 'Tidak dapat memuat audio.');
    }
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
    globalAudioEngine.setMetronomeSync(next, metronomeVolume, metronomeBeatsPerBar);
  };

  const handleMetronomeBpmChange = (newBpm: number) => {
    const clamped = Math.max(30, Math.min(260, newBpm));
    setMetronomeBpm(clamped);
    globalMetronome.setBpm(clamped);
    globalAudioEngine.setMetronomeSync(metronomeClickActive, metronomeVolume, metronomeBeatsPerBar);
    if (currentSong) {
      currentSong.bpm = clamped;
      saveSongToStorage(currentSong);
    }
  };

  const handleMetronomeBeatsChange = (beats: number) => {
    const clamped = Math.max(1, Math.min(12, Math.round(beats)));
    setMetronomeBeatsPerBar(clamped);
    globalMetronome.setBeatsPerBar(clamped);
    globalAudioEngine.setMetronomeBeatsPerBar(clamped);
  };

  const handleMetronomeVolumeChange = (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setMetronomeVolume(clamped);
    globalAudioEngine.setMetronomeVolume(clamped);
  };

  // Stems manipulation: Web Audio engine updates at 0ms, React tree debounced to prevent GPU crashes (Item 8)
  const volTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleVolumeChange = (stemId: string, vol: number) => {
    globalAudioEngine.setStemVolume(stemId, vol);
    if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
    volTimeoutRef.current = setTimeout(() => {
      if (!currentSong) return;
      const updatedStems = currentSong.stems.map((s) =>
        s.id === stemId ? { ...s, volume: vol } : s
      );
      setCurrentSong({ ...currentSong, stems: updatedStems });
    }, 120);
  };

  const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePanChange = (stemId: string, pan: number) => {
    globalAudioEngine.setStemPan(stemId, pan);
    if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
    panTimeoutRef.current = setTimeout(() => {
      if (!currentSong) return;
      const updatedStems = currentSong.stems.map((s) =>
        s.id === stemId ? { ...s, pan } : s
      );
      setCurrentSong({ ...currentSong, stems: updatedStems });
    }, 120);
  };

  const handleCycleEqPreset = (stemId: string) => {
    const presets: EqPresetName[] = ['flat', 'vocal-clarity', 'guitar-cut', 'bass-punch', 'drum-air'];
    const current = globalAudioEngine.getStemEqPreset(stemId);
    const nextIndex = (presets.indexOf(current) + 1) % presets.length;
    const next = presets[nextIndex];
    globalAudioEngine.setStemEqPreset(stemId, next);
    // Force visual update
    if (currentSong) {
      setCurrentSong({ ...currentSong });
    }
  };

  const getEqPresetLabel = (stemId: string): string => {
    const presetName = globalAudioEngine.getStemEqPreset(stemId);
    return EQ_PRESETS[presetName]?.label || 'Flat';
  };

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
      if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
    };
  }, []);

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
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#7ec5f9] via-[#4fa3e3] to-[#256ea8] text-[#0a233c] select-none p-4">
        {/* Background authentic aero asset elements */}
        <img
          src="/aero-assets/horizon-glow.png"
          alt=""
          className="absolute bottom-0 w-full object-cover opacity-60 pointer-events-none"
        />
        <img
          src="/aero-assets/bubble-cluster.png"
          alt=""
          className="absolute -top-10 -right-10 w-72 sm:w-96 opacity-40 pointer-events-none animate-pulse"
        />
        <img
          src="/aero-assets/flare-glint.png"
          alt=""
          className="absolute top-1/4 left-1/4 w-40 opacity-70 pointer-events-none"
        />

        {/* Windows Vista / 7 Style Glass Dialog Box */}
        <div className="w-full max-w-sm rounded-3xl p-6 bg-white/65 backdrop-blur-2xl border border-white/80 shadow-[0_16px_40px_rgba(0,40,90,0.3)] relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none rounded-t-3xl" />

          {/* Glowing Orb Logo */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 p-1 shadow-[0_0_24px_rgba(14,165,233,0.6)] border border-white flex items-center justify-center relative">
            <div className="absolute top-1 inset-x-2 h-6 bg-white/60 rounded-full blur-[1px]" />
            <Sliders className="w-8 h-8 text-white relative z-10" />
          </div>

          <div>
            <h2 className="text-xl font-black text-[#071f38] tracking-tight">The Flannels pocket</h2>
            <p className="text-xs font-bold text-sky-900 mt-0.5">Windows Aero Music Workstation</p>
          </div>

          {/* Authentic Vista Candy Progress Bar */}
          <div className="w-full space-y-1.5 pt-2">
            <div className="w-full h-3.5 bg-sky-950/20 rounded-full p-0.5 border border-white/80 shadow-inner overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 relative overflow-hidden animate-pulse shadow-sm"
                style={{ width: '85%' }}
              />
            </div>
            <p className="text-[10px] font-mono font-bold text-sky-900">
              Menyiapkan Web Audio Engine & Supabase Cloud...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-[#0b2238] font-sans selection:bg-emerald-400 selection:text-black relative overflow-x-hidden">
      {/* Grand Background - Positioned directly below header (Item 14) */}
      <div className="fixed top-[52px] bottom-0 left-0 right-0 z-0 overflow-hidden pointer-events-none">
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
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
        onSelectSuggestion={() => {
          setActiveTab('library');
        }}
      />

      {/* 2. Below Header: Workspace Layout with Spotify-Style Aero Sidebar (Item 6) */}
      <div className="flex-1 flex relative w-full overflow-hidden">
        {/* Spotify-style Sturdy Aero Sidebar (Desktop only, non-scrollable) */}
        <aside
          className={`hidden md:flex flex-shrink-0 transition-all duration-200 ${
            isNavOpen ? 'w-56 lg:w-60' : 'w-0 overflow-hidden pointer-events-none'
          }`}
        >
          <div className="w-full h-full bg-[#071628]/92 backdrop-blur-2xl border-r border-sky-400/25 flex flex-col justify-between py-4 px-3 select-none overflow-hidden">
            {/* Top Navigation Rows */}
            <div className="space-y-1.5">
              <div className="px-3 pb-2 text-[10px] font-mono font-black uppercase text-sky-400 tracking-wider">
                Menu Utama
              </div>

              {/* 1. Mixer Console */}
              <button
                onClick={() => setActiveTab('mixer')}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all font-bold text-xs text-left group ${
                  activeTab === 'mixer'
                    ? 'bg-gradient-to-r from-sky-500/30 via-sky-500/15 to-transparent text-white border-l-4 border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                }`}
              >
                <Sliders className={`w-4 h-4 ${activeTab === 'mixer' ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'}`} />
                <span className="truncate">Mixer Console</span>
              </button>

              {/* 2. Library & Antrian (Merged) */}
              <button
                onClick={() => setActiveTab('library')}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all font-bold text-xs text-left group ${
                  activeTab === 'library'
                    ? 'bg-gradient-to-r from-sky-500/30 via-sky-500/15 to-transparent text-white border-l-4 border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                }`}
              >
                <Folder className={`w-4 h-4 ${activeTab === 'library' ? 'text-sky-400' : 'text-slate-400 group-hover:text-sky-300'}`} />
                <span className="truncate">Library & Antrian</span>
              </button>

              {/* 3. Lirik & Chord */}
              <button
                onClick={() => setActiveTab('lyrics')}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all font-bold text-xs text-left group ${
                  activeTab === 'lyrics'
                    ? 'bg-gradient-to-r from-sky-500/30 via-sky-500/15 to-transparent text-white border-l-4 border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                }`}
              >
                <FileText className={`w-4 h-4 ${activeTab === 'lyrics' ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-300'}`} />
                <span className="truncate">Lirik & Chord</span>
              </button>

              {/* 4. Tilikan AI (Producer) */}
              <button
                onClick={() => setActiveTab('brain')}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all font-bold text-xs text-left group ${
                  activeTab === 'brain'
                    ? 'bg-gradient-to-r from-sky-500/30 via-sky-500/15 to-transparent text-white border-l-4 border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                }`}
              >
                <Brain className={`w-4 h-4 ${activeTab === 'brain' ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-300'}`} />
                <span className="truncate">Tilikan AI Produser</span>
              </button>
            </div>

            {/* Middle: Active Track Mini Card */}
            {currentSong && (
              <div className="my-3 p-2.5 rounded-xl bg-sky-950/40 border border-sky-400/20 text-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                  <span className="text-[10px] font-mono font-bold text-sky-300 uppercase truncate">
                    Sedang Diputar
                  </span>
                </div>
                <p className="font-extrabold text-white truncate">{currentSong.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentSong.artist}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-cyan-300">
                  <span>{currentSong.bpm} BPM</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-cyan-950/80 border border-cyan-500/40 font-bold">
                    Key: {currentSong.originalKey}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom: Band Brand Badge */}
            <div className="pt-2 border-t border-sky-400/20 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs border border-white/40">
                FP
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-white block truncate">The Flannels</span>
                <span className="text-[9px] font-mono text-slate-400 block truncate">Pocket Studio v2.6</span>
              </div>
            </div>
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
                onCycleEqPreset={handleCycleEqPreset}
                getEqPresetLabel={getEqPresetLabel}
              />
            ) : (
              <CoverSongLibrary
                songs={songs}
                currentSongId={currentSong?.id || null}
                isAdmin={isAdmin}
                onSelectSong={selectSong}
                onRefreshSongs={refreshSongs}
                onOpenAdminUpload={() => {
                  setRequestToFulfill(null);
                  setShowAdminUploadModal(true);
                }}
                onNavigateToRequests={() => setActiveTab('library')}
                onUnlockAdmin={handleToggleAdmin}
                onFulfillRequest={(req) => {
                  setRequestToFulfill(req);
                  setShowAdminUploadModal(true);
                }}
              />
            )
          )}

          {activeTab === 'requests' && (
            <SongRequestLeaderboard
              isAdmin={isAdmin}
              onFulfillRequest={(req) => {
                setRequestToFulfill(req);
                setShowAdminUploadModal(true);
              }}
            />
          )}

          {activeTab === 'library' && (
            <CoverSongLibrary
              songs={songs}
              currentSongId={currentSong?.id || null}
              isAdmin={isAdmin}
              onSelectSong={selectSong}
              onRefreshSongs={refreshSongs}
              onOpenAdminUpload={() => {
                setRequestToFulfill(null);
                setShowAdminUploadModal(true);
              }}
              onNavigateToRequests={() => setActiveTab('library')}
              onUnlockAdmin={handleToggleAdmin}
              onFulfillRequest={(req) => {
                setRequestToFulfill(req);
                setShowAdminUploadModal(true);
              }}
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

      {/* Real-Time Audio Fetch & Progress Modal */}
      <AudioLoadingModal
        isOpen={loadingModalState.isOpen}
        song={loadingModalState.song}
        percent={loadingModalState.percent}
        text={loadingModalState.text}
        detail={loadingModalState.detail}
      />

      {/* Admin Stem Upload Modal */}
      {showAdminUploadModal && (
        <AdminStemUploadModal
          isOpen={showAdminUploadModal}
          onClose={() => {
            setShowAdminUploadModal(false);
            setRequestToFulfill(null);
          }}
          onSongCreated={(newSong) => {
            refreshSongs();
            selectSong(newSong);
            setActiveTab('mixer');
          }}
          initialRequest={requestToFulfill}
        />
      )}

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
        metronomeBeatsPerBar={metronomeBeatsPerBar}
        metronomeVolume={metronomeVolume}
        isAudioLoading={isAudioLoading}
        audioLoadingText={audioLoadingText}
        onMetronomeBeatsChange={handleMetronomeBeatsChange}
        onMetronomeVolumeChange={handleMetronomeVolumeChange}
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

      {/* 4. Mobile Bottom Navigation Bar (< md, Point 7) */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-[#08182b]/95 backdrop-blur-3xl border-t border-sky-400/30 flex items-center justify-around z-50 md:hidden px-2 shadow-2xl">
        <button
          onClick={() => setActiveTab('mixer')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition ${
            activeTab === 'mixer' ? 'text-cyan-300 font-black' : 'text-slate-400 hover:text-white'
          }`}
          aria-label="Buka Mixer"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[10px]">Mixer</span>
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition ${
            activeTab === 'library' || activeTab === 'requests' ? 'text-cyan-300 font-black' : 'text-slate-400 hover:text-white'
          }`}
          aria-label="Buka Library & Antrian"
        >
          <Folder className="w-4 h-4" />
          <span className="text-[10px]">Library</span>
        </button>
        <button
          onClick={() => setActiveTab('lyrics')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition ${
            activeTab === 'lyrics' ? 'text-cyan-300 font-black' : 'text-slate-400 hover:text-white'
          }`}
          aria-label="Buka Lirik"
        >
          <FileText className="w-4 h-4" />
          <span className="text-[10px]">Lirik</span>
        </button>
        <button
          onClick={() => setActiveTab('brain')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition ${
            activeTab === 'brain' ? 'text-cyan-300 font-black' : 'text-slate-400 hover:text-white'
          }`}
          aria-label="Buka Tilikan"
        >
          <Brain className="w-4 h-4" />
          <span className="text-[10px]">Tilikan</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
