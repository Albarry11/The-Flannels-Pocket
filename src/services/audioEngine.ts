import type { Song, LoopRegion } from '../types';

interface StemNodes {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  analyserNode: AnalyserNode;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentSong: Song | null = null;
  private stemNodes: Map<string, StemNodes> = new Map();
  private masterGainNode: GainNode | null = null;
  private replayGainNode: GainNode | null = null;
  private masterLimiterNode: DynamicsCompressorNode | null = null;
  private masterAnalyserNode: AnalyserNode | null = null;

  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private speed: number = 1.0;
  private pitchSemitones: number = 0;
  private loopRegion: LoopRegion = { enabled: false, start: 0, end: 0 };

  // Synced Metronome Click Track state
  private metronomeSyncEnabled: boolean = false;
  private metronomeVolume: number = 0.7;
  private metronomeBeatsPerBar: number = 4;
  private lastScheduledBeat: number = -1;

  private animationFrameId: number | null = null;
  private onTimeUpdateCallback?: (time: number) => void;
  private onEndedCallback?: () => void;
  private onBeatTickCallback?: (beat: number, isDownbeat: boolean) => void;

  constructor() {}

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setSong(song: Song) {
    this.stop();
    this.currentSong = song;
    this.pauseOffset = 0;
    this.loopRegion = { enabled: false, start: 0, end: song.duration };
    this.setupNodes();
  }

  public getCurrentSong(): Song | null {
    return this.currentSong;
  }

  private setupNodes() {
    if (!this.currentSong) return;
    const ctx = this.getContext();

    // Disconnect old nodes
    this.stemNodes.forEach((nodes) => {
      try {
        nodes.source?.stop();
        nodes.source?.disconnect();
      } catch (_) {}
    });
    this.stemNodes.clear();

    // Master bus
    this.masterGainNode = ctx.createGain();
    this.masterGainNode.gain.value = 1.0;

    this.replayGainNode = ctx.createGain();
    this.replayGainNode.gain.value = 1.0;

    // Studio-grade Brickwall Limiter to prevent clipping distortion
    this.masterLimiterNode = ctx.createDynamicsCompressor();
    this.masterLimiterNode.threshold.value = -0.5; // -0.5 dBFS ceiling
    this.masterLimiterNode.knee.value = 0;         // hard limiter knee
    this.masterLimiterNode.ratio.value = 20.0;     // 20:1 brickwall ratio
    this.masterLimiterNode.attack.value = 0.001;   // 1ms fast peak protection
    this.masterLimiterNode.release.value = 0.05;   // 50ms smooth release

    this.masterAnalyserNode = ctx.createAnalyser();
    this.masterAnalyserNode.fftSize = 2048;
    this.masterAnalyserNode.smoothingTimeConstant = 0.8;

    this.replayGainNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.masterLimiterNode);
    this.masterLimiterNode.connect(this.masterAnalyserNode);
    this.masterAnalyserNode.connect(ctx.destination);

    // Create channel strips for each stem
    this.currentSong.stems.forEach((stem) => {
      const gainNode = ctx.createGain();
      gainNode.gain.value = stem.volume;

      const pannerNode = ctx.createStereoPanner();
      pannerNode.pan.value = stem.pan;

      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.7;

      gainNode.connect(pannerNode);
      pannerNode.connect(analyserNode);
      analyserNode.connect(this.replayGainNode!);

      this.stemNodes.set(stem.id, {
        source: null,
        gainNode,
        pannerNode,
        analyserNode,
      });
    });

    this.applyMuteSoloInternal();
  }

  public play() {
    if (this.isPlaying || !this.currentSong) return;
    const ctx = this.getContext();

    this.isPlaying = true;
    this.startTime = ctx.currentTime - (this.pauseOffset / this.speed);
    this.lastScheduledBeat = -1;

    // Create fresh AudioBufferSourceNodes
    this.currentSong.stems.forEach((stem) => {
      if (!stem.audioBuffer) return;
      const nodes = this.stemNodes.get(stem.id);
      if (!nodes) return;

      const source = ctx.createBufferSource();
      source.buffer = stem.audioBuffer;
      source.playbackRate.value = this.speed;
      source.detune.value = this.pitchSemitones * 100;

      source.connect(nodes.gainNode);
      nodes.source = source;

      const offset = Math.min(this.pauseOffset, stem.audioBuffer.duration);
      source.start(0, offset);
    });

    this.startProgressLoop();
  }

  public pause() {
    if (!this.isPlaying) return;
    const ctx = this.getContext();
    this.isPlaying = false;
    this.pauseOffset = (ctx.currentTime - this.startTime) * this.speed;

    this.stemNodes.forEach((nodes) => {
      try {
        nodes.source?.stop();
        nodes.source?.disconnect();
        nodes.source = null;
      } catch (_) {}
    });

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public stop() {
    this.pause();
    this.pauseOffset = 0;
    this.lastScheduledBeat = -1;
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(0);
    }
  }

  public seek(timeInSeconds: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.pauseOffset = Math.max(0, Math.min(timeInSeconds, this.currentSong?.duration || 0));
    this.lastScheduledBeat = -1;
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(this.pauseOffset);
    }
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Play with 1-bar (4-beat) count-in for rehearsals
   */
  public playWithCountIn(onCountBeat: (beat: number) => void, onComplete: () => void) {
    if (this.isPlaying) return;
    const ctx = this.getContext();
    const bpm = (this.currentSong?.bpm || 120) * this.speed;
    const beatInterval = 60 / bpm;

    let beat = 1;
    onCountBeat(beat);
    this.playMetronomeTick(ctx.currentTime, true);

    const intervalId = setInterval(() => {
      beat++;
      if (beat <= 4) {
        onCountBeat(beat);
        this.playMetronomeTick(ctx.currentTime, false);
      } else {
        clearInterval(intervalId);
        onComplete();
        this.play();
      }
    }, beatInterval * 1000);
  }

  public setSpeed(speed: number) {
    this.speed = speed;
    if (this.isPlaying && this.ctx) {
      const currentPos = this.getCurrentTime();
      this.startTime = this.ctx.currentTime - (currentPos / speed);
      this.stemNodes.forEach((nodes) => {
        if (nodes.source) {
          nodes.source.playbackRate.value = speed;
        }
      });
    }
  }

  public setPitch(semitones: number) {
    this.pitchSemitones = semitones;
    this.stemNodes.forEach((nodes) => {
      if (nodes.source) {
        nodes.source.detune.value = semitones * 100;
      }
    });
  }

  public setMasterVolume(vol: number) {
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.02);
    }
  }

  public setReplayGain(gainDb: number, enabled: boolean) {
    if (this.replayGainNode && this.ctx) {
      const linearGain = enabled ? Math.pow(10, gainDb / 20) : 1.0;
      this.replayGainNode.gain.setTargetAtTime(linearGain, this.ctx.currentTime, 0.02);
    }
  }

  public setStemVolume(stemId: string, vol: number) {
    const stem = this.currentSong?.stems.find((s) => s.id === stemId);
    if (stem) stem.volume = vol;
    const nodes = this.stemNodes.get(stemId);
    if (nodes && this.ctx) {
      nodes.gainNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.02);
      this.applyMuteSoloInternal();
    }
  }

  public setStemPan(stemId: string, pan: number) {
    const stem = this.currentSong?.stems.find((s) => s.id === stemId);
    if (stem) stem.pan = pan;
    const nodes = this.stemNodes.get(stemId);
    if (nodes) {
      nodes.pannerNode.pan.value = pan;
    }
  }

  public toggleStemMute(stemId: string) {
    const stem = this.currentSong?.stems.find((s) => s.id === stemId);
    if (stem) {
      stem.muted = !stem.muted;
      this.applyMuteSoloInternal();
    }
  }

  public toggleStemSolo(stemId: string) {
    const stem = this.currentSong?.stems.find((s) => s.id === stemId);
    if (stem) {
      stem.solo = !stem.solo;
      this.applyMuteSoloInternal();
    }
  }

  /**
   * KUNCI QUICK KULIK: Update status mute/solo tanpa mematikan atau me-restart playback lagu!
   */
  public updateStemMuteSoloBatch(updatedStems: { id: string; muted: boolean; solo: boolean }[]) {
    if (!this.currentSong) return;

    // Update in-place on currentSong stems
    updatedStems.forEach((updated) => {
      const existing = this.currentSong?.stems.find((s) => s.id === updated.id);
      if (existing) {
        existing.muted = updated.muted;
        existing.solo = updated.solo;
      }
    });

    // Apply smoothly via gain ramping without interrupting audio
    this.applyMuteSoloInternal();
  }

  private applyMuteSoloInternal() {
    if (!this.currentSong || !this.ctx) return;
    const anySolo = this.currentSong.stems.some((s) => s.solo);

    // Dynamic Headroom Staging:
    // If a stem is soloed (or only 1-2 stems active), give full 100% loudness.
    // If all stems are unmuted and playing together, compensate by 0.75 to prevent master digital clipping.
    const activeCount = anySolo
      ? this.currentSong.stems.filter((s) => s.solo && !s.muted).length
      : this.currentSong.stems.filter((s) => !s.muted).length;
    const headroomScale = activeCount <= 2 ? 1.0 : Math.max(0.7, 1 / Math.sqrt(activeCount * 0.5));

    this.currentSong.stems.forEach((stem) => {
      const nodes = this.stemNodes.get(stem.id);
      if (!nodes) return;

      let effectiveVol = stem.volume * headroomScale;
      if (stem.muted) {
        effectiveVol = 0;
      } else if (anySolo && !stem.solo) {
        effectiveVol = 0;
      }

      // Smooth gain transition to eliminate audio clicks
      nodes.gainNode.gain.setTargetAtTime(effectiveVol, this.ctx!.currentTime, 0.015);
    });
  }

  public setLoopRegion(region: LoopRegion) {
    this.loopRegion = region;
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) {
      return this.pauseOffset;
    }
    return (this.ctx.currentTime - this.startTime) * this.speed;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Reusable audio level buffer to avoid GC thrashing in 60fps loops
  private stemLevelBuffer: Uint8Array = new Uint8Array(256);

  public getStemLevel(stemId: string): number {
    const nodes = this.stemNodes.get(stemId);
    if (!nodes || !this.isPlaying) return 0;
    const len = Math.min(this.stemLevelBuffer.length, nodes.analyserNode.frequencyBinCount);
    const sub = this.stemLevelBuffer.subarray(0, len);
    nodes.analyserNode.getByteTimeDomainData(sub as unknown as Uint8Array<ArrayBuffer>);

    let max = 0;
    for (let i = 0; i < len; i++) {
      const val = Math.abs(sub[i] - 128);
      if (val > max) max = val;
    }
    return max / 128;
  }

  public getMasterSpectrum(targetArray?: Uint8Array): Uint8Array {
    if (!this.masterAnalyserNode) return new Uint8Array(0);
    const length = this.masterAnalyserNode.frequencyBinCount;
    const data = targetArray || new Uint8Array(length);
    // Cast to Uint8Array to satisfy DOM ArrayBufferLike type check
    this.masterAnalyserNode.getByteFrequencyData(data as unknown as Uint8Array<ArrayBuffer>);
    return data;
  }

  public getMasterWaveform(targetArray?: Uint8Array): Uint8Array {
    if (!this.masterAnalyserNode) return new Uint8Array(0);
    const length = this.masterAnalyserNode.fftSize;
    const data = targetArray || new Uint8Array(length);
    this.masterAnalyserNode.getByteTimeDomainData(data as unknown as Uint8Array<ArrayBuffer>);
    return data;
  }

  // Synced Metronome Click Configuration
  public setMetronomeSync(enabled: boolean, volume: number = 0.7, beatsPerBar: number = 4) {
    this.metronomeSyncEnabled = enabled;
    this.metronomeVolume = Math.max(0, Math.min(1, volume));
    this.metronomeBeatsPerBar = Math.max(1, Math.min(12, Math.round(beatsPerBar)));
  }

  public setMetronomeVolume(volume: number) {
    this.metronomeVolume = Math.max(0, Math.min(1, volume));
  }

  public setMetronomeBeatsPerBar(beatsPerBar: number) {
    this.metronomeBeatsPerBar = Math.max(1, Math.min(12, Math.round(beatsPerBar)));
    this.lastScheduledBeat = -1;
  }

  private playMetronomeTick(time: number, isDownbeat: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const freq = isDownbeat ? 1400 : 900;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + 0.035);

    const vol = (isDownbeat ? 1.0 : 0.6) * this.metronomeVolume;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  public onTimeUpdate(cb: (time: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onEnded(cb: () => void) {
    this.onEndedCallback = cb;
  }

  public onBeatTick(cb: (beat: number, isDownbeat: boolean) => void) {
    this.onBeatTickCallback = cb;
  }

  private startProgressLoop() {
    const checkTime = () => {
      if (!this.isPlaying) return;
      const current = this.getCurrentTime();

      // Synced Metronome Click Scheduler
      if (this.metronomeSyncEnabled && this.currentSong && this.ctx) {
        const songBpm = (this.currentSong.bpm || 120) * this.speed;
        const beatSec = 60 / songBpm;
        const totalBeatsElapsed = Math.floor(current / beatSec);

        if (totalBeatsElapsed > this.lastScheduledBeat) {
          this.lastScheduledBeat = totalBeatsElapsed;
          const beatInBar = totalBeatsElapsed % this.metronomeBeatsPerBar;
          const isDownbeat = beatInBar === 0;

          // Schedule click tick
          this.playMetronomeTick(this.ctx.currentTime, isDownbeat);
          if (this.onBeatTickCallback) {
            this.onBeatTickCallback(beatInBar, isDownbeat);
          }
        }
      }

      // Check loop boundary
      if (this.loopRegion.enabled && this.loopRegion.end > this.loopRegion.start) {
        if (current >= this.loopRegion.end) {
          this.seek(this.loopRegion.start);
          return;
        }
      }

      // Check song end
      if (this.currentSong && current >= this.currentSong.duration) {
        this.stop();
        if (this.onEndedCallback) this.onEndedCallback();
        return;
      }

      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(current);
      }

      this.animationFrameId = requestAnimationFrame(checkTime);
    };

    this.animationFrameId = requestAnimationFrame(checkTime);
  }
}

export const globalAudioEngine = new AudioEngine();
