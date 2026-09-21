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
import { AdminStemUploadModal } from './components/AdminStemUploadModal';
import { AudioLoadingModal } from './components/AudioLoadingModal';
import { LandscapeGuard } from './components/LandscapeGuard';
import { Sliders, Folder, FileText, Brain } from 'lucide-react';
import type { SongRequest } from './types';
import { VISTA_WALLPAPERS } from './constants/wallpapers';

export type ActiveNavTab = 'mixer' | 'library' | 'lyrics' | 'brain';

export function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(15);
  const [loadingStatusText, setLoadingStatusText] = useState<string>('Menyiapkan Web Audio Engine...');
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('library');
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true);

  // Admin & Song Request Modal State
  // Admin tidak persist: setiap reload mulai sebagai user biasa.
  // Satu-satunya jalan masuk admin = sequence window controls + PIN (di bawah).
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
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
        localStorage.removeItem('flannels_is_admin');
        return;
      }

      const pin = prompt('Masukkan Password Admin:');
      if (pin === 'lempiz') {
        setIsAdmin(true);
        // session-only: sengaja tidak disimpan ke localStorage
      }
    };

    window.addEventListener('flannels-window-control', handleAdminShortcut);
    return () => window.removeEventListener('flannels-window-control', handleAdminShortcut);
  }, [isAdmin]);

  const handleToggleAdmin = () => {
    if (!isAdmin) return;
    setIsAdmin(false);
    localStorage.removeItem('flannels_is_admin');
  };

  // Iconic Windows Vista Aero Wallpaper Transition Pack
  const [wallpaperIndex, setWallpaperIndex] = useState<number>(0);
  const [prevWallpaperIndex, setPrevWallpaperIndex] = useState<number>(0);

  const cycleWallpaper = () => {
    setWallpaperIndex((prev) => {
      setPrevWallpaperIndex(prev);
      return (prev + 1) % VISTA_WALLPAPERS.length;
    });
  };

  useEffect(() => {
    const timer = setInterval(cycleWallpaper, 25000);
    return () => clearInterval(timer);
  }, []);

  const handleCycleWallpaper = cycleWallpaper;

  // Side navbar flow:
  // - On initial launch: starts open, then smoothly auto-hides after 3.2s so user discovers auto-hide!
  // - If opened via left-edge hover: peek mode (auto-closes 2.5s after cursor leaves)
  // - If opened via button: LOCKED open (never auto-hides)
  const [isNavLocked, setIsNavLocked] = useState<boolean>(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const openingTimer = setTimeout(() => {
      setIsNavOpen(false);
    }, 3200);
    return () => clearTimeout(openingTimer);
  }, []);

  const handleToggleNavButton = () => {
    if (isNavOpen) {
      setIsNavOpen(false);
      setIsNavLocked(false);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    } else {
      setIsNavOpen(true);
      setIsNavLocked(true); // Button lock mode
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    }
  };

  const handleLeftEdgeHover = () => {
    if (!isNavOpen) {
      setIsNavOpen(true);
      setIsNavLocked(false); // Peek mode
    }
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
  };

  const handleNavMouseEnter = () => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  };

  const handleNavMouseLeave = () => {
    // Only auto-hide if NOT locked
    if (isNavLocked) return;
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      setIsNavOpen(false);
    }, 2500);
  };

  const handleSelectNavTab = (tab: ActiveNavTab) => {
    setActiveTab(tab);
    if (!isNavLocked) {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        setIsNavOpen(false);
      }, 1500);
    }
  };

  // Load song library on mount - Cloud-First automatic fetch
  const currentSongRef = useRef<Song | null>(null);
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const refreshSongs = useCallback(async () => {
    // Ticker untuk animasi progress merayap halus agar user tidak merasa stuck
    let ticker: any = null;
    let targetProgress = 20;

    ticker = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < targetProgress) {
          // Bergerak naik perlahan mendekati target
          return Math.min(targetProgress, prev + 1);
        } else if (prev < 92) {
          // Asymptotic micro-creep: bergerak sangat halus 1% berkala agar indikator hidup
          return prev + (Math.random() > 0.6 ? 1 : 0);
        }
        return prev;
      });
    }, 120);

    try {
      targetProgress = 35;
      setLoadingStatusText('Menghubungkan ke Supabase Cloud...');

      // 1. Direct fetch from Supabase Cloud Catalog first (automatic for all band members)
      let songList: Song[] = [];
      try {
        const { syncSongsFromCloud } = await import('./services/cloudDatabase');
        targetProgress = 60;
        const cloudRes = await syncSongsFromCloud((msg) => {
          if (msg) setLoadingStatusText(msg);
        });
        targetProgress = 80;
        if (cloudRes.songs && cloudRes.songs.length > 0) {
          songList = cloudRes.songs;
        }
      } catch (_) {}

      // 2. Fallback to local storage if offline
      if (songList.length === 0) {
        targetProgress = 85;
        setLoadingStatusText('Memeriksa penyimpanan lokal IndexedDB...');
        songList = await listAllSongsFromStorage();
      }

      targetProgress = 95;
      setLoadingStatusText('Menyiapkan workspace...');
      if (songList.length > 0) {
        setSongs(songList);
      } else {
        setSongs([]);
      }

      clearInterval(ticker);
      setLoadingProgress(100);
      setLoadingStatusText('Siap!');
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (err) {
      console.error('Failed to load songs:', err);
    } finally {
      if (ticker) clearInterval(ticker);
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
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden text-[#0a233c] select-none p-4">
        {/* Background authentic 2.webp from C:\ALBARRY\wallpaper\2.jpg */}
        <img
          src="/wallpapers/2.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        {/* Soft authentic Aero sky tint overlay */}
        <div className="absolute inset-0 bg-sky-950/25 backdrop-blur-[1.5px]" />

        {/* Modern iOS Liquid Glass Loading Dialog Box */}
        <div className="w-full max-w-sm rounded-[32px] p-6 bg-gradient-to-b from-white/35 via-white/20 to-white/10 backdrop-blur-2xl saturate-[200%] border border-white/60 shadow-[0_25px_60px_rgba(0,35,80,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(255,255,255,0.2)] relative z-10 flex flex-col items-center gap-4 text-center overflow-hidden">
          {/* Liquid glass top specular reflection */}
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none rounded-t-[32px]" />

          {/* Glowing Orb Logo */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 p-1 shadow-[0_0_28px_rgba(14,165,233,0.7)] border border-white/90 flex items-center justify-center relative">
            <div className="absolute top-1 inset-x-2 h-6 bg-white/70 rounded-full blur-[1px]" />
            <Sliders className="w-8 h-8 text-white relative z-10 drop-shadow-sm" />
          </div>

          <div>
            <h2 className="text-xl font-black text-[#071f38] tracking-tight">The Flannels pocket</h2>
            <p className="text-xs font-black text-sky-950 mt-0.5 tracking-wide">This is the future we were promised</p>
          </div>

          {/* Authentic Vista Candy Progress Bar */}
          <div className="w-full space-y-1.5 pt-2">
            <div className="w-full h-3.5 bg-sky-950/20 rounded-full p-0.5 border border-white/80 shadow-inner overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 transition-all duration-300 ease-out relative overflow-hidden shadow-sm"
                style={{ width: `${loadingProgress}%` }}
              >
                {/* Flowing shimmer highlight */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-sky-900">
              <span className="truncate">{loadingStatusText}</span>
              <span className="ml-2 flex-shrink-0">{loadingProgress}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen flex flex-col text-[#0b2238] font-sans selection:bg-emerald-400 selection:text-black relative overflow-hidden">
      {/* Mobile Landscape Orientation Guard (Non-blocking) */}
      <LandscapeGuard />

      {/* Grand Background - Windows 7 style cross-fade transition */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Base layer: previous wallpaper stays put while the next fades in over it */}
        <img
          src={VISTA_WALLPAPERS[prevWallpaperIndex]?.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-90"
        />
        {/* Top layer: current wallpaper fades in (Windows 7 fade) */}
        <img
          key={`wp-${VISTA_WALLPAPERS[wallpaperIndex]?.id}`}
          src={VISTA_WALLPAPERS[wallpaperIndex]?.url}
          alt={VISTA_WALLPAPERS[wallpaperIndex]?.name}
          className="absolute inset-0 w-full h-full object-cover object-center animate-screensaver-fade"
        />
        {/* Soft authentic Aero sky tint overlay */}
        <div className="absolute inset-0 bg-sky-950/15" />
      </div>

      {/* Invisible Left Edge Hover Sensor to peek sidebar when hidden */}
      {!isNavOpen && (
        <div
          onMouseEnter={handleLeftEdgeHover}
          className="fixed left-0 top-12 bottom-20 w-4 z-40 cursor-e-resize hover:bg-cyan-400/20 transition-all pointer-events-auto"
          title="Geser kursor ke sini untuk membuka menu samping"
        />
      )}

      {/* 1. Full-Width Continuous Windows Vista / Aero Header */}
      <Header
        currentSong={currentSong}
        activeSoloNames={activeSoloNames}
        onClearAllSolos={handleClearAllSolos}
        isNavOpen={isNavOpen}
        isNavLocked={isNavLocked}
        onToggleNav={handleToggleNavButton}
        wallpaperName={VISTA_WALLPAPERS[wallpaperIndex]?.name}
        onCycleWallpaper={handleCycleWallpaper}
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
        onSelectSuggestion={() => {
          setActiveTab('library');
        }}
      />

      {/* 2. Below Header: Workspace Layout with Spotify-Style Aero Sidebar (Item 6) */}
      <div className="flex-1 min-h-0 flex relative w-full overflow-hidden">
        {/* Spotify-style Sturdy Aero Sidebar (Auto-hides 2.5s after interaction in peek mode) */}
        <aside
          onMouseEnter={handleNavMouseEnter}
          onMouseLeave={handleNavMouseLeave}
          className={`hidden sm:flex flex-shrink-0 transition-all duration-300 z-30 ${
            isNavOpen ? 'w-52 lg:w-60' : 'w-0 overflow-hidden pointer-events-none'
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
                onClick={() => handleSelectNavTab('mixer')}
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
                onClick={() => handleSelectNavTab('library')}
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
                onClick={() => handleSelectNavTab('lyrics')}
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
                onClick={() => handleSelectNavTab('brain')}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all font-bold text-xs text-left group ${
                  activeTab === 'brain'
                    ? 'bg-gradient-to-r from-sky-500/30 via-sky-500/15 to-transparent text-white border-l-4 border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                }`}
              >
                <Brain className={`w-4 h-4 ${activeTab === 'brain' ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-300'}`} />
                <span className="truncate">Tilikan Musisi</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area - Flush bottom directly above master player dock */}
        <main className="flex-1 min-h-0 p-1.5 sm:p-3 lg:p-4 pb-1 overflow-hidden flex flex-col">
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
        onCancel={() => {
          setIsAudioLoading(false);
          setAudioLoadingText('');
          setLoadingModalState((prev) => ({ ...prev, isOpen: false }));
        }}
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
        metronomeClickActive={metronomeClickActive}
        metronomeBpm={metronomeBpm}
        metronomeBeatsPerBar={metronomeBeatsPerBar}
        metronomeVolume={metronomeVolume}
        isAudioLoading={isAudioLoading}
        audioLoadingText={audioLoadingText}
        onMetronomeBeatsChange={handleMetronomeBeatsChange}
        onMetronomeVolumeChange={handleMetronomeVolumeChange}
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
        onToggleMetronomeClick={handleToggleMetronomeClick}
        onMetronomeBpmChange={handleMetronomeBpmChange}
      />

      {/* 4. Mobile Bottom Navigation Bar (Narrow screen fallback only) */}
      <nav className="relative flex-shrink-0 w-full h-12 bg-white/60 backdrop-blur-2xl border-t border-white/85 flex items-center justify-around z-30 sm:hidden px-2 shadow-[0_-4px_20px_rgba(2,132,199,0.12)] pb-safe">
        <button
          onClick={() => setActiveTab('mixer')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition ${
            activeTab === 'mixer'
              ? 'text-sky-950 font-black bg-sky-200/60 shadow-inner'
              : 'text-slate-600 hover:text-slate-950 font-bold'
          }`}
          aria-label="Buka Mixer"
        >
          <Sliders className={`w-4 h-4 ${activeTab === 'mixer' ? 'text-cyan-600' : 'text-slate-500'}`} />
          <span className="text-[10px]">Mixer</span>
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition ${
            activeTab === 'library'
              ? 'text-sky-950 font-black bg-sky-200/60 shadow-inner'
              : 'text-slate-600 hover:text-slate-950 font-bold'
          }`}
          aria-label="Buka Library & Antrian"
        >
          <Folder className={`w-4 h-4 ${activeTab === 'library' ? 'text-sky-600' : 'text-slate-500'}`} />
          <span className="text-[10px]">Library</span>
        </button>
        <button
          onClick={() => setActiveTab('lyrics')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition ${
            activeTab === 'lyrics'
              ? 'text-sky-950 font-black bg-sky-200/60 shadow-inner'
              : 'text-slate-600 hover:text-slate-950 font-bold'
          }`}
          aria-label="Buka Lirik"
        >
          <FileText className={`w-4 h-4 ${activeTab === 'lyrics' ? 'text-indigo-600' : 'text-slate-500'}`} />
          <span className="text-[10px]">Lirik</span>
        </button>
        <button
          onClick={() => setActiveTab('brain')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition ${
            activeTab === 'brain'
              ? 'text-sky-950 font-black bg-sky-200/60 shadow-inner'
              : 'text-slate-600 hover:text-slate-950 font-bold'
          }`}
          aria-label="Buka Tilikan"
        >
          <Brain className={`w-4 h-4 ${activeTab === 'brain' ? 'text-purple-600' : 'text-slate-500'}`} />
          <span className="text-[10px]">Tilikan Musisi</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
