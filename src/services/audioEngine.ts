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
  private masterAnalyserNode: AnalyserNode | null = null;

  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private speed: number = 1.0;
  private pitchSemitones: number = 0;
  private loopRegion: LoopRegion = { enabled: false, start: 0, end: 0 };

  private animationFrameId: number | null = null;
  private onTimeUpdateCallback?: (time: number) => void;
  private onEndedCallback?: () => void;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getContext(): AudioContext {
    return this.initContext();
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
    const ctx = this.initContext();

    // Clean old nodes
    this.stemNodes.forEach((nodes) => {
      try {
        nodes.source?.stop();
        nodes.source?.disconnect();
      } catch (_) {}
    });
    this.stemNodes.clear();

    // Master nodes
    this.masterGainNode = ctx.createGain();
    this.masterGainNode.gain.value = 1.0;

    this.replayGainNode = ctx.createGain();
    this.replayGainNode.gain.value = 1.0;

    this.masterAnalyserNode = ctx.createAnalyser();
    this.masterAnalyserNode.fftSize = 2048;
    this.masterAnalyserNode.smoothingTimeConstant = 0.8;

    this.replayGainNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.masterAnalyserNode);
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

    this.applyMuteSolo();
  }

  public play() {
    if (this.isPlaying || !this.currentSong) return;
    const ctx = this.initContext();

    this.isPlaying = true;
    this.startTime = ctx.currentTime - (this.pauseOffset / this.speed);

    // Create and connect fresh AudioBufferSourceNodes
    this.currentSong.stems.forEach((stem) => {
      if (!stem.audioBuffer) return;
      const nodes = this.stemNodes.get(stem.id);
      if (!nodes) return;

      const source = ctx.createBufferSource();
      source.buffer = stem.audioBuffer;
      source.playbackRate.value = this.speed;
      source.detune.value = this.pitchSemitones * 100; // 100 cents per semitone

      source.connect(nodes.gainNode);
      nodes.source = source;

      // Start with offset
      const offset = Math.min(this.pauseOffset, stem.audioBuffer.duration);
      source.start(0, offset);
    });

    this.startProgressLoop();
  }

  public pause() {
    if (!this.isPlaying) return;
    const ctx = this.initContext();
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
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(this.pauseOffset);
    }
    if (wasPlaying) {
      this.play();
    }
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
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  public setReplayGain(gainDb: number, enabled: boolean) {
    if (this.replayGainNode && this.ctx) {
      const linearGain = enabled ? Math.pow(10, gainDb / 20) : 1.0;
      this.replayGainNode.gain.setValueAtTime(linearGain, this.ctx.currentTime);
    }
  }

  public setStemVolume(stemId: string, vol: number) {
    const stem = this.currentSong?.stems.find((s) => s.id === stemId);
    if (stem) stem.volume = vol;
    const nodes = this.stemNodes.get(stemId);
    if (nodes) {
      nodes.gainNode.gain.value = vol;
      this.applyMuteSolo();
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
      this.applyMuteSolo();
    }
  }

  public toggleStemSolo(stemId: string) {
    const stem = this.currentSong?.stems.find((s) => s.id === stemId);
    if (stem) {
      stem.solo = !stem.solo;
      this.applyMuteSolo();
    }
  }

  public applyMuteSolo() {
    if (!this.currentSong) return;
    const anySolo = this.currentSong.stems.some((s) => s.solo);

    this.currentSong.stems.forEach((stem) => {
      const nodes = this.stemNodes.get(stem.id);
      if (!nodes) return;

      let effectiveVol = stem.volume;
      if (stem.muted) {
        effectiveVol = 0;
      } else if (anySolo && !stem.solo) {
        effectiveVol = 0;
      }

      nodes.gainNode.gain.value = effectiveVol;
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

  public getStemLevel(stemId: string): number {
    const nodes = this.stemNodes.get(stemId);
    if (!nodes || !this.isPlaying) return 0;
    const data = new Uint8Array(nodes.analyserNode.frequencyBinCount);
    nodes.analyserNode.getByteTimeDomainData(data);

    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const val = Math.abs(data[i] - 128);
      if (val > max) max = val;
    }
    return max / 128;
  }

  public getMasterSpectrum(): Uint8Array {
    if (!this.masterAnalyserNode) return new Uint8Array(0);
    const data = new Uint8Array(this.masterAnalyserNode.frequencyBinCount);
    this.masterAnalyserNode.getByteFrequencyData(data);
    return data;
  }

  public onTimeUpdate(cb: (time: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onEnded(cb: () => void) {
    this.onEndedCallback = cb;
  }

  private startProgressLoop() {
    const checkTime = () => {
      if (!this.isPlaying) return;
      const current = this.getCurrentTime();

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
