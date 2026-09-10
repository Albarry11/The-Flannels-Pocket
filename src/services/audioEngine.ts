import type { Song, StemRole, LoopRegion } from '../types';
import type { MetronomeSound } from './metronomeEngine';

export interface AudioProgressPayload {
  percent: number;
  text: string;
  detail?: string;
}

export type EqPresetName = 'flat' | 'vocal-clarity' | 'guitar-cut' | 'bass-punch' | 'drum-air';

export interface EqSettings {
  lowGain: number;   // dB, lowshelf at 200Hz
  midGain: number;   // dB, peaking at 1kHz
  highGain: number;  // dB, highshelf at 4kHz
}

export const EQ_PRESETS: Record<EqPresetName, EqSettings & { label: string }> = {
  flat:           { lowGain: 0,  midGain: 0,  highGain: 0,  label: 'Flat' },
  'vocal-clarity':{ lowGain: -2, midGain: 2,  highGain: 1,  label: 'Vokal Jernih' },
  'guitar-cut':   { lowGain: 0,  midGain: 1,  highGain: 2,  label: 'Gitar Tajam' },
  'bass-punch':   { lowGain: 2,  midGain: -1, highGain: 0,  label: 'Bass Tebal' },
  'drum-air':     { lowGain: 0,  midGain: 0,  highGain: 3,  label: 'Drum Ringan' },
};

export function getEqPresetForRole(role: StemRole): EqPresetName {
  switch (role) {
    case 'vocal': return 'vocal-clarity';
    case 'guitar':
    case 'lead':
    case 'rhythm': return 'guitar-cut';
    case 'bass': return 'bass-punch';
    case 'drums': return 'drum-air';
    default: return 'flat';
  }
}

interface StemNodes {
  source: AudioBufferSourceNode | null;
  eqLowNode: BiquadFilterNode;
  eqMidNode: BiquadFilterNode;
  eqHighNode: BiquadFilterNode;
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  analyserNode: AnalyserNode;
  currentEqPreset: EqPresetName;
}

async function fetchWithByteProgress(
  url: string,
  onByteProgress?: (received: number, total: number) => void,
  timeoutMs: number = 60000
): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = Number(res.headers.get('content-length')) || 0;

    if (!res.body) {
      const buf = await res.arrayBuffer();
      onByteProgress?.(buf.byteLength, buf.byteLength || contentLength);
      return buf;
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onByteProgress?.(received, contentLength);
      }
    }

    const all = new Uint8Array(received);
    let pos = 0;
    for (const c of chunks) {
      all.set(c, pos);
      pos += c.length;
    }
    return all.buffer;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveAllPartUrls(initialUrl: string): Promise<string[]> {
  const match = initialUrl.match(/^(.*_part)1(\.[a-zA-Z0-9]+)$/);
  if (!match) return [initialUrl];
  const prefix = match[1];
  const ext = match[2];
  const urls: string[] = [initialUrl];
  let part = 2;
  while (part <= 10) {
    const candidate = `${prefix}${part}${ext}`;
    try {
      const res = await fetch(candidate, { method: 'HEAD' });
      if (res.ok) {
        urls.push(candidate);
        part++;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return urls;
}

async function decodeAudioDataWithTimeout(
  ctx: AudioContext,
  buffer: ArrayBuffer,
  timeoutMs = 30000
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Audio decoder timeout: format berkas tidak valid atau terlalu besar'));
      }
    }, timeoutMs);

    ctx.decodeAudioData(
      buffer,
      (decoded) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(decoded);
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err || new Error('Gagal mendekode audio Web Audio API'));
        }
      }
    );
  });
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
  private metronomeSound: MetronomeSound = 'woodblock';
  private metronomeSchedulerId: number | null = null;
  private nextClickTime: number = 0;
  private nextClickBeat: number = 0;

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
    if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async prepareSongAudio(
    song: Song,
    onProgress?: (progress: AudioProgressPayload) => void
  ): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      try {
        await ctx.resume();
      } catch (_) {}
    }

    const totalStems = song.stems.length;
    const report = (pct: number, text: string, detail?: string) => {
      onProgress?.({
        percent: Math.max(0, Math.min(100, Math.round(pct))),
        text,
        detail,
      });
    };

    report(5, 'Memeriksa berkas audio stem...', `${totalStems} track diskrit`);

    for (let i = 0; i < totalStems; i++) {
      const stem = song.stems[i];
      const basePct = (i / totalStems) * 100;
      const nextPct = ((i + 1) / totalStems) * 100;

      if (stem.audioBuffer) {
        report(nextPct, `Stem ${stem.name} sudah siap`, `${i + 1}/${totalStems}`);
        continue;
      }

      // 1. Check in-memory blob
      if (stem.blob) {
        report(basePct + (100 / totalStems) * 0.3, `Mendekode ${stem.name} (${i + 1}/${totalStems})...`, 'Memori RAM');
        try {
          const ab = await stem.blob.arrayBuffer();
          stem.audioBuffer = await decodeAudioDataWithTimeout(ctx, ab.slice(0));
          report(nextPct, `Stem ${stem.name} siap`, `${i + 1}/${totalStems}`);
          continue;
        } catch (e) {
          console.warn(`Failed to decode blob for ${stem.name}:`, e);
        }
      }

      // 2. Check local IndexedDB cache with corruption safeguard
      try {
        const { get, del } = await import('idb-keyval');
        const cachedBlob: Blob | undefined = await get(`flannels_audio_${stem.id}`);
        if (cachedBlob && cachedBlob.size > 1000) {
          report(basePct + (100 / totalStems) * 0.4, `Memuat ${stem.name} dari cache lokal...`, `${i + 1}/${totalStems}`);
          try {
            const ab = await cachedBlob.arrayBuffer();
            stem.audioBuffer = await decodeAudioDataWithTimeout(ctx, ab.slice(0), 20000);
            stem.blob = cachedBlob;
            report(nextPct, `Stem ${stem.name} siap`, 'Cache lokal');
            continue;
          } catch (cachedDecodeErr) {
            console.warn(`Cache audio stem ${stem.name} korup/rusak, membersihkan cache...`, cachedDecodeErr);
            await del(`flannels_audio_${stem.id}`);
            // Lanjut ke pengunduhan cloud bersih di bawah
          }
        }
      } catch (_) {}

      // 3. Download from cloud (supports single file or chunked parts)
      let urlsToFetch =
        stem.audioUrls && stem.audioUrls.length > 0
          ? stem.audioUrls
          : stem.audioUrl
          ? [stem.audioUrl]
          : [];

      if (urlsToFetch.length === 1 && urlsToFetch[0].includes('_part1.')) {
        report(basePct + 1, `Memeriksa part pecahan berkas ${stem.name}...`, 'Cloud Auto-Stitch');
        try {
          urlsToFetch = await resolveAllPartUrls(urlsToFetch[0]);
        } catch (_) {}
      }

      if (urlsToFetch.length > 0) {
        report(basePct + 2, `Menghubungi cloud untuk stem ${stem.name}...`, `${i + 1}/${totalStems}`);

        try {
          let mergedBuffer: ArrayBuffer;
          if (urlsToFetch.length === 1) {
            mergedBuffer = await fetchWithByteProgress(urlsToFetch[0], (received, total) => {
              const estimatedTotal = total > 0 ? total : 10 * 1024 * 1024;
              const fraction = Math.min(0.96, received / estimatedTotal);
              const currentOverall = basePct + fraction * ((100 / totalStems) * 0.85);
              const mbReceived = (received / 1024 / 1024).toFixed(1);
              const mbTotal = total > 0 ? (total / 1024 / 1024).toFixed(1) : (estimatedTotal / 1024 / 1024).toFixed(0);
              report(
                currentOverall,
                `Mengunduh stem ${stem.name} (${i + 1}/${totalStems})`,
                `${mbReceived} MB / ${total > 0 ? mbTotal : '~' + mbTotal} MB`
              );
            });
          } else {
            // Download chunks sequentially with live progress tracking
            const parts: ArrayBuffer[] = [];
            let loadedStemBytes = 0;
            const estimatedStemTotal = urlsToFetch.length * 28 * 1024 * 1024;

            for (let partIdx = 0; partIdx < urlsToFetch.length; partIdx++) {
              const partUrl = urlsToFetch[partIdx];
              const partBuf = await fetchWithByteProgress(partUrl, (rec) => {
                const currentBytes = loadedStemBytes + rec;
                const totalTarget = Math.max(estimatedStemTotal, currentBytes * 1.05);
                const fraction = Math.min(0.96, currentBytes / totalTarget);
                const currentOverall = basePct + fraction * ((100 / totalStems) * 0.85);
                const mbCurr = (currentBytes / 1024 / 1024).toFixed(1);
                report(
                  currentOverall,
                  `Mengunduh ${stem.name} part ${partIdx + 1}/${urlsToFetch.length}`,
                  `${mbCurr} MB`
                );
              });
              parts.push(partBuf);
              loadedStemBytes += partBuf.byteLength;
            }

            const totalBytes = parts.reduce((sum, p) => sum + p.byteLength, 0);
            const mergedBytes = new Uint8Array(totalBytes);
            let byteOffset = 0;
            for (const p of parts) {
              mergedBytes.set(new Uint8Array(p), byteOffset);
              byteOffset += p.byteLength;
            }
            mergedBuffer = mergedBytes.buffer;
          }

          report(basePct + (100 / totalStems) * 0.9, `Mendekode audio ${stem.name}...`, 'Web Audio Engine');
          stem.audioBuffer = await decodeAudioDataWithTimeout(ctx, mergedBuffer.slice(0), 30000);
          stem.blob = new Blob([mergedBuffer], { type: 'audio/wav' });

          // Save to local IndexedDB cache
          try {
            const { set } = await import('idb-keyval');
            await set(`flannels_audio_${stem.id}`, stem.blob);
          } catch (_) {}

          report(nextPct, `Stem ${stem.name} selesai diunduh`, `${i + 1}/${totalStems}`);
        } catch (dlErr) {
          console.error(`Failed to download stem ${stem.name}:`, dlErr);
          throw new Error(`Gagal mengunduh stem ${stem.name}. Periksa koneksi internet.`);
        }
      } else {
        throw new Error(`Stem ${stem.name} belum memiliki berkas audio di cloud.`);
      }
    }

    report(100, 'Audio siap dimainkan!', '100% Studio Rehearsal Quality');
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
      // 3-band EQ: lowshelf (200Hz), peaking (1kHz), highshelf (4kHz)
      const eqLowNode = ctx.createBiquadFilter();
      eqLowNode.type = 'lowshelf';
      eqLowNode.frequency.value = 200;
      eqLowNode.gain.value = 0;

      const eqMidNode = ctx.createBiquadFilter();
      eqMidNode.type = 'peaking';
      eqMidNode.frequency.value = 1000;
      eqMidNode.Q.value = 0.7;
      eqMidNode.gain.value = 0;

      const eqHighNode = ctx.createBiquadFilter();
      eqHighNode.type = 'highshelf';
      eqHighNode.frequency.value = 4000;
      eqHighNode.gain.value = 0;

      const gainNode = ctx.createGain();
      gainNode.gain.value = stem.volume;

      const pannerNode = ctx.createStereoPanner();
      pannerNode.pan.value = stem.pan;

      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.7;

      // Chain: source -> EQ(low -> mid -> high) -> gain -> panner -> analyser -> replayGain
      eqLowNode.connect(eqMidNode);
      eqMidNode.connect(eqHighNode);
      eqHighNode.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(analyserNode);
      analyserNode.connect(this.replayGainNode!);

      // Auto-apply role-based EQ preset
      const presetName = getEqPresetForRole(stem.role);
      const preset = EQ_PRESETS[presetName];
      eqLowNode.gain.value = preset.lowGain;
      eqMidNode.gain.value = preset.midGain;
      eqHighNode.gain.value = preset.highGain;

      this.stemNodes.set(stem.id, {
        source: null,
        eqLowNode,
        eqMidNode,
        eqHighNode,
        gainNode,
        pannerNode,
        analyserNode,
        currentEqPreset: presetName,
      });
    });

    this.applyMuteSoloInternal();
  }

  public async play() {
    if (this.isPlaying || !this.currentSong) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      try {
        await ctx.resume();
      } catch (_) {}
    }

    if (this.pauseOffset >= (this.currentSong.duration - 0.1)) {
      this.pauseOffset = 0;
    }

    // Ensure audio buffers are ready
    const hasAnyBuffer = this.currentSong.stems.some((s) => !!s.audioBuffer);
    if (!hasAnyBuffer) {
      await this.prepareSongAudio(this.currentSong);
    }

    const hasReadyBuffers = this.currentSong.stems.some((s) => !!s.audioBuffer);
    if (!hasReadyBuffers) {
      this.isPlaying = false;
      throw new Error('Berkas audio stem belum tersedia atau belum selesai diunduh.');
    }

    this.isPlaying = true;
    this.startTime = ctx.currentTime - (this.pauseOffset / this.speed);

    // Create fresh AudioBufferSourceNodes
    this.currentSong.stems.forEach((stem) => {
      if (!stem.audioBuffer) return;
      const nodes = this.stemNodes.get(stem.id);
      if (!nodes) return;

      const source = ctx.createBufferSource();
      source.buffer = stem.audioBuffer;
      source.playbackRate.value = this.speed;
      source.detune.value = this.pitchSemitones * 100;

      source.connect(nodes.eqLowNode);
      nodes.source = source;

      const offset = Math.max(0, Math.min(this.pauseOffset, Math.max(0, stem.audioBuffer.duration - 0.05)));
      source.start(0, offset);
    });

    this.startProgressLoop();
  }

  public pause() {
    if (!this.isPlaying) return;
    const ctx = this.getContext();
    this.isPlaying = false;
    this.pauseOffset = (ctx.currentTime - this.startTime) * this.speed;
    this.stopMetronomeScheduler();

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
    this.stopMetronomeScheduler();
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

  public setPitchSemitones(semitones: number) {
    this.setPitch(semitones);
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

  public setStemEqPreset(stemId: string, presetName: EqPresetName) {
    const nodes = this.stemNodes.get(stemId);
    const preset = EQ_PRESETS[presetName];
    if (!nodes || !preset || !this.ctx) return;
    nodes.currentEqPreset = presetName;
    nodes.eqLowNode.gain.setTargetAtTime(preset.lowGain, this.ctx.currentTime, 0.02);
    nodes.eqMidNode.gain.setTargetAtTime(preset.midGain, this.ctx.currentTime, 0.02);
    nodes.eqHighNode.gain.setTargetAtTime(preset.highGain, this.ctx.currentTime, 0.02);
  }

  public getStemEqPreset(stemId: string): EqPresetName {
    const nodes = this.stemNodes.get(stemId);
    return nodes?.currentEqPreset || 'flat';
  }

  public setStemPan(stemId: string, pan: number) {
    const stem = this.currentSong?.stems.find((s) => s.id === stemId);
    if (stem) stem.pan = pan;
    const nodes = this.stemNodes.get(stemId);
    if (nodes && this.ctx) {
      const clamped = Math.max(-1, Math.min(1, pan));
      nodes.pannerNode.pan.setTargetAtTime(clamped, this.ctx.currentTime, 0.015);
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
    if (enabled && this.isPlaying) {
      this.startMetronomeScheduler();
    } else if (!enabled) {
      this.stopMetronomeScheduler();
    }
  }

  public setMetronomeVolume(volume: number) {
    this.metronomeVolume = Math.max(0, Math.min(1, volume));
  }

  public setMetronomeSound(sound: MetronomeSound) {
    this.metronomeSound = sound;
  }

  public setMetronomeBeatsPerBar(beatsPerBar: number) {
    this.metronomeBeatsPerBar = Math.max(1, Math.min(12, Math.round(beatsPerBar)));
    if (this.metronomeSyncEnabled && this.isPlaying) {
      this.restartMetronomeScheduler();
    }
  }

  private startMetronomeScheduler() {
    if (this.metronomeSchedulerId !== null) return;
    if (!this.ctx || !this.currentSong) return;

    const songBpm = (this.currentSong.bpm || 120) * this.speed;
    const beatSec = 60 / songBpm;
    const currentPos = this.getCurrentTime();

    // Calculate first click: align to the next beat boundary from current playback position
    this.nextClickBeat = Math.floor(currentPos / beatSec) + 1;
    this.nextClickTime = this.ctx.currentTime + ((this.nextClickBeat * beatSec) - currentPos);

    this.scheduleClicks();
  }

  private restartMetronomeScheduler() {
    this.stopMetronomeScheduler();
    this.startMetronomeScheduler();
  }

  private stopMetronomeScheduler() {
    if (this.metronomeSchedulerId !== null) {
      clearInterval(this.metronomeSchedulerId);
      this.metronomeSchedulerId = null;
    }
  }

  private scheduleClicks() {
    if (!this.ctx || !this.currentSong) return;
    const lookahead = 0.1; // Schedule 100ms ahead
    const scheduleInterval = 25; // Check every 25ms

    const tick = () => {
      if (!this.ctx || !this.currentSong || !this.isPlaying) {
        this.stopMetronomeScheduler();
        return;
      }

      const songBpm = (this.currentSong.bpm || 120) * this.speed;
      const beatSec = 60 / songBpm;
      const songEnd = this.currentSong.duration;

      while (this.nextClickTime < this.ctx.currentTime + lookahead) {
        const clickPosInSong = this.getCurrentTime() + (this.nextClickTime - this.ctx.currentTime);

        // Stop scheduling if past song end
        if (clickPosInSong >= songEnd) {
          this.stopMetronomeScheduler();
          return;
        }

        const beatInBar = this.nextClickBeat % this.metronomeBeatsPerBar;
        const isDownbeat = beatInBar === 0;

        // Schedule click at the precise AudioContext time
        this.playMetronomeTick(this.nextClickTime, isDownbeat);

        if (this.onBeatTickCallback) {
          const delayMs = Math.max(0, (this.nextClickTime - this.ctx.currentTime) * 1000);
          const beat = beatInBar;
          const downbeat = isDownbeat;
          setTimeout(() => {
            if (this.onBeatTickCallback) this.onBeatTickCallback(beat, downbeat);
          }, delayMs);
        }

        this.nextClickBeat++;
        this.nextClickTime += beatSec;
      }
    };

    tick();
    this.metronomeSchedulerId = window.setInterval(tick, scheduleInterval);
  }

  private playMetronomeTick(time: number, isDownbeat: boolean) {
    if (!this.ctx) return;

    if (this.metronomeSound === 'woodblock') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const freq = isDownbeat ? 2200 : 1500;
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.35, time + 0.025);
      const vol = (isDownbeat ? 1.0 : 0.65) * this.metronomeVolume;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.04);
    } else if (this.metronomeSound === 'beep') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const freq = isDownbeat ? 1760 : 880;
      osc.frequency.setValueAtTime(freq, time);
      const vol = (isDownbeat ? 0.9 : 0.55) * this.metronomeVolume;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.045);
    } else if (this.metronomeSound === 'rimshot') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isDownbeat ? 3600 : 2800, time);
      osc.frequency.exponentialRampToValueAtTime(150, time + 0.02);
      const vol = (isDownbeat ? 1.0 : 0.7) * this.metronomeVolume;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.03);
    } else if (this.metronomeSound === 'cowbell') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'square';
      osc2.type = 'square';
      const root = isDownbeat ? 840 : 560;
      osc1.frequency.setValueAtTime(root, time);
      osc2.frequency.setValueAtTime(root * 1.48, time);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(root * 1.2, time);
      filter.Q.setValueAtTime(2.5, time);

      const vol = (isDownbeat ? 0.8 : 0.5) * this.metronomeVolume;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.085);
      osc2.stop(time + 0.085);
    } else {
      // Classic default
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

      // Synced Metronome: start scheduler when playback begins if enabled
      if (this.metronomeSyncEnabled && this.metronomeSchedulerId === null && this.currentSong) {
        this.startMetronomeScheduler();
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
        this.stopMetronomeScheduler();
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
