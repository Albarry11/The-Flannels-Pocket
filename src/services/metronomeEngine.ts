export type MetronomeSound = 'woodblock' | 'beep' | 'rimshot' | 'cowbell';

export class MetronomeEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private bpm: number = 115;
  private beatsPerBar: number = 4;
  private currentBeat: number = 0;
  private nextNoteTime: number = 0;
  private lookaheadMs: number = 25.0;
  private scheduleAheadTimeSec: number = 0.1;
  private timerWorkerId: number | null = null;
  private sound: MetronomeSound = 'woodblock';
  private volume: number = 0.8;
  private onBeatCallback?: (beat: number, isDownbeat: boolean) => void;

  private tapTimestamps: number[] = [];

  constructor() {}

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

  public setBpm(newBpm: number) {
    this.bpm = Math.max(30, Math.min(280, Math.round(newBpm)));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setBeatsPerBar(beats: number) {
    this.beatsPerBar = beats;
  }

  public setSound(sound: MetronomeSound) {
    this.sound = sound;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public start() {
    if (this.isRunning) return;
    const ctx = this.initContext();
    this.isRunning = true;
    this.currentBeat = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    this.timerWorkerId = window.setInterval(() => {
      this.scheduler();
    }, this.lookaheadMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.timerWorkerId !== null) {
      clearInterval(this.timerWorkerId);
      this.timerWorkerId = null;
    }
    this.currentBeat = 0;
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public onBeat(cb: (beat: number, isDownbeat: boolean) => void) {
    this.onBeatCallback = cb;
  }

  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTimeSec) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
    this.currentBeat = (this.currentBeat + 1) % this.beatsPerBar;
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (!this.ctx) return;
    const isDownbeat = beatNumber === 0;

    // Trigger visual callback via setTimeout aligned with note time
    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isRunning && this.onBeatCallback) {
        this.onBeatCallback(beatNumber, isDownbeat);
      }
    }, delayMs);

    // Audio synthesis based on sound choice
    switch (this.sound) {
      case 'beep':
        this.playBeep(time, isDownbeat);
        break;
      case 'rimshot':
        this.playRimshot(time, isDownbeat);
        break;
      case 'cowbell':
        this.playCowbell(time, isDownbeat);
        break;
      case 'woodblock':
      default:
        this.playWoodblock(time, isDownbeat);
        break;
    }
  }

  private playWoodblock(time: number, isDownbeat: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = isDownbeat ? 1200 : 800;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + 0.04);

    const vol = (isDownbeat ? 1.0 : 0.6) * this.volume;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  private playBeep(time: number, isDownbeat: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isDownbeat ? 1760 : 880, time);

    const vol = (isDownbeat ? 0.35 : 0.2) * this.volume;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  private playRimshot(time: number, isDownbeat: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isDownbeat ? 480 : 320, time);
    osc.frequency.exponentialRampToValueAtTime(160, time + 0.03);

    const vol = (isDownbeat ? 0.8 : 0.5) * this.volume;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  private playCowbell(time: number, isDownbeat: boolean) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const bandpass = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';
    const base = isDownbeat ? 840 : 560;
    osc1.frequency.setValueAtTime(base, time);
    osc2.frequency.setValueAtTime(base * 1.48, time);

    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(base * 1.2, time);
    bandpass.Q.value = 3.5;

    const vol = (isDownbeat ? 0.4 : 0.25) * this.volume;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc1.connect(bandpass);
    osc2.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.09);
    osc2.stop(time + 0.09);
  }

  public tapTempo(): number {
    const now = Date.now();
    this.tapTimestamps.push(now);

    // Keep last 5 taps and ignore taps older than 2.5s
    if (this.tapTimestamps.length > 5) {
      this.tapTimestamps.shift();
    }
    this.tapTimestamps = this.tapTimestamps.filter((t) => now - t < 2500);

    if (this.tapTimestamps.length >= 2) {
      let intervalsSum = 0;
      for (let i = 1; i < this.tapTimestamps.length; i++) {
        intervalsSum += this.tapTimestamps[i] - this.tapTimestamps[i - 1];
      }
      const avgIntervalMs = intervalsSum / (this.tapTimestamps.length - 1);
      const calculatedBpm = Math.round(60000 / avgIntervalMs);
      const clampedBpm = Math.max(40, Math.min(260, calculatedBpm));
      this.setBpm(clampedBpm);
      return clampedBpm;
    }

    return this.bpm;
  }
}

export const globalMetronome = new MetronomeEngine();
