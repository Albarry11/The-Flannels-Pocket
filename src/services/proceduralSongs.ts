import type { Song, StemTrack } from '../types';

/**
 * Creates high-fidelity multi-track audio buffers using OfflineAudioContext.
 * Generates separated stems for band practice: Vocal, Lead Guitar, Rhythm Guitar, Bass, Drums.
 */
export async function createProceduralDemoSong(
  title: string,
  artist: string,
  bpm: number,
  key: string,
  durationSec: number = 24
): Promise<Song> {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationSec);
  const beatSec = 60 / bpm;
  const numBeats = Math.floor(durationSec / beatSec);

  // Helper to render an instrument stem using OfflineAudioContext
  async function renderStem(
    renderFn: (ctx: OfflineAudioContext) => void
  ): Promise<AudioBuffer> {
    const offlineCtx = new OfflineAudioContext(2, numSamples, sampleRate);
    renderFn(offlineCtx);
    return await offlineCtx.startRendering();
  }

  // --- 1. DRUMS STEM ---
  const drumsBuffer = await renderStem((ctx) => {
    for (let beat = 0; beat < numBeats; beat++) {
      const beatTime = beat * beatSec;
      const beatInBar = beat % 4;

      // Kick on beat 0 and 2 (and syncopated on 2.5)
      if (beatInBar === 0 || beatInBar === 2) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, beatTime);
        osc.frequency.exponentialRampToValueAtTime(45, beatTime + 0.12);
        gain.gain.setValueAtTime(0.9, beatTime);
        gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(beatTime);
        osc.stop(beatTime + 0.3);
      }

      // Snare on beat 1 and 3
      if (beatInBar === 1 || beatInBar === 3) {
        // Body
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, beatTime);
        osc.frequency.exponentialRampToValueAtTime(110, beatTime + 0.1);
        oscGain.gain.setValueAtTime(0.6, beatTime);
        oscGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(beatTime);
        osc.stop(beatTime + 0.16);

        // Noise snap
        const bufferSize = ctx.sampleRate * 0.2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, beatTime);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.7, beatTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.22);
        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(beatTime);
        whiteNoise.stop(beatTime + 0.23);
      }

      // Hi-Hat on 8th notes
      for (let sub = 0; sub < 2; sub++) {
        const hhTime = beatTime + (sub * beatSec) / 2;
        if (hhTime >= durationSec) break;

        const bufferSize = ctx.sampleRate * 0.05;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, hhTime);
        const hhGain = ctx.createGain();
        const vol = sub === 0 ? 0.35 : 0.2;
        hhGain.gain.setValueAtTime(vol, hhTime);
        hhGain.gain.exponentialRampToValueAtTime(0.001, hhTime + 0.06);
        whiteNoise.connect(filter);
        filter.connect(hhGain);
        hhGain.connect(ctx.destination);
        whiteNoise.start(hhTime);
        whiteNoise.stop(hhTime + 0.07);
      }
    }
  });

  // --- 2. BASS STEM ---
  const bassBuffer = await renderStem((ctx) => {
    // E minor pentatonic bassline: E1 (41.2Hz), G1 (49.0Hz), A1 (55Hz), B1 (61.7Hz), D2 (73.4Hz)
    const notes = [
      41.2, 41.2, 49.0, 55.0,  // Bar 1: E, E, G, A
      61.7, 55.0, 49.0, 41.2,  // Bar 2: B, A, G, E
      73.4, 61.7, 55.0, 49.0,  // Bar 3: D, B, A, G
      41.2, 41.2, 41.2, 41.2,  // Bar 4: E, E, E, E
    ];

    for (let beat = 0; beat < numBeats; beat++) {
      const beatTime = beat * beatSec;
      const noteFreq = notes[beat % notes.length];

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, beatTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, beatTime);
      filter.frequency.exponentialRampToValueAtTime(120, beatTime + beatSec * 0.7);

      gain.gain.setValueAtTime(0.7, beatTime);
      gain.gain.exponentialRampToValueAtTime(0.001, beatTime + beatSec * 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(beatTime);
      osc.stop(beatTime + beatSec * 0.9);
    }
  });

  // --- 3. RHYTHM GUITAR STEM ---
  const rhythmBuffer = await renderStem((ctx) => {
    // Funky rhythm guitar chops on offbeats
    // Em7 (E3, G3, B3, D4) and Am7 (A3, C4, E4, G4)
    const chords = [
      [164.8, 196.0, 246.9, 293.7], // Em7
      [164.8, 196.0, 246.9, 293.7],
      [220.0, 261.6, 329.6, 392.0], // Am7
      [246.9, 293.7, 369.9, 440.0], // Bm7
    ];

    for (let beat = 0; beat < numBeats; beat++) {
      const barIndex = Math.floor(beat / 4) % chords.length;
      const chord = chords[barIndex];
      const beatTime = beat * beatSec;

      // Play on offbeat (and of 1, and of 2, etc.)
      const strumTimes = [beatTime + beatSec * 0.25, beatTime + beatSec * 0.75];

      strumTimes.forEach((sTime) => {
        if (sTime >= durationSec) return;
        chord.forEach((freq, idx) => {
          const delay = idx * 0.008; // Strum spread
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, sTime + delay);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, sTime + delay);
          filter.Q.value = 2.0;

          gain.gain.setValueAtTime(0.2, sTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, sTime + delay + 0.18);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(sTime + delay);
          osc.stop(sTime + delay + 0.2);
        });
      });
    }
  });

  // --- 4. LEAD GUITAR STEM ---
  const leadBuffer = await renderStem((ctx) => {
    // Bluesy pentatonic lead melody (E4, G4, A4, B4, D5, E5)
    const leadPattern = [
      { beat: 0, freq: 329.6, dur: 1.5 },   // E4
      { beat: 2, freq: 392.0, dur: 0.8 },   // G4
      { beat: 3, freq: 440.0, dur: 1.0 },   // A4
      { beat: 4, freq: 493.9, dur: 1.5 },   // B4
      { beat: 6, freq: 587.3, dur: 0.8 },   // D5
      { beat: 7, freq: 659.3, dur: 1.8 },   // E5
      { beat: 10, freq: 587.3, dur: 0.8 },  // D5
      { beat: 11, freq: 493.9, dur: 0.8 },  // B4
      { beat: 12, freq: 440.0, dur: 1.2 },  // A4
      { beat: 14, freq: 392.0, dur: 1.2 },  // G4
      { beat: 16, freq: 329.6, dur: 2.0 },  // E4
    ];

    leadPattern.forEach((item) => {
      const startTime = item.beat * beatSec;
      if (startTime >= durationSec) return;

      const osc = ctx.createOscillator();
      const waveShaper = ctx.createWaveShaper();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(item.freq, startTime);
      // Add subtle vibrato after 0.2s
      const vibrato = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vibrato.frequency.value = 5.5;
      vibGain.gain.value = 4.0;
      vibrato.connect(osc.frequency);
      vibrato.start(startTime + 0.2);
      vibrato.stop(startTime + item.dur * beatSec);

      // Mild guitar overdrive curve
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = ((3 + 20) * x * 20 * (Math.PI / 180)) / (Math.PI + 20 * Math.abs(x));
      }
      waveShaper.curve = curve;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + item.dur * beatSec * 0.95);

      osc.connect(waveShaper);
      waveShaper.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + item.dur * beatSec);
    });
  });

  // --- 5. VOCAL STEM ---
  const vocalBuffer = await renderStem((ctx) => {
    // Synthesized vocal lead line with formant resonances (Ah/Oh sounds)
    const vocalPhrases = [
      { beat: 1, freq: 329.6, dur: 1.0 }, // E4
      { beat: 2.5, freq: 392.0, dur: 1.0 }, // G4
      { beat: 4, freq: 440.0, dur: 2.0 }, // A4
      { beat: 7, freq: 392.0, dur: 0.8 }, // G4
      { beat: 8, freq: 329.6, dur: 2.5 }, // E4
      { beat: 12, freq: 293.7, dur: 1.0 }, // D4
      { beat: 13.5, freq: 329.6, dur: 1.5 }, // E4
      { beat: 16, freq: 440.0, dur: 2.0 }, // A4
      { beat: 19, freq: 392.0, dur: 1.0 }, // G4
      { beat: 20, freq: 329.6, dur: 3.0 }, // E4
    ];

    vocalPhrases.forEach((phrase) => {
      const startTime = phrase.beat * beatSec;
      if (startTime >= durationSec) return;

      const osc = ctx.createOscillator();
      // Formant filters for human vocal characteristics
      const formant1 = ctx.createBiquadFilter();
      formant1.type = 'bandpass';
      formant1.frequency.value = 800; // F1 vowel formant
      formant1.Q.value = 5.0;

      const formant2 = ctx.createBiquadFilter();
      formant2.type = 'bandpass';
      formant2.frequency.value = 1200; // F2 vowel formant
      formant2.Q.value = 6.0;

      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(phrase.freq, startTime);

      // Portamento / pitch glide
      osc.frequency.exponentialRampToValueAtTime(phrase.freq * 1.01, startTime + 0.1);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + phrase.dur * beatSec * 0.95);

      osc.connect(formant1);
      osc.connect(formant2);
      formant1.connect(gain);
      formant2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + phrase.dur * beatSec);
    });
  });

  const stems: StemTrack[] = [
    {
      id: 'stem-vocal',
      role: 'vocal',
      name: 'Vocal (Lead)',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      audioBuffer: vocalBuffer,
    },
    {
      id: 'stem-lead',
      role: 'lead',
      name: 'Lead Guitar',
      volume: 0.8,
      pan: 0.35, // Panned slightly right
      muted: false,
      solo: false,
      audioBuffer: leadBuffer,
    },
    {
      id: 'stem-rhythm',
      role: 'rhythm',
      name: 'Rhythm Guitar',
      volume: 0.75,
      pan: -0.4, // Panned slightly left
      muted: false,
      solo: false,
      audioBuffer: rhythmBuffer,
    },
    {
      id: 'stem-bass',
      role: 'bass',
      name: 'Bass Guitar',
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      audioBuffer: bassBuffer,
    },
    {
      id: 'stem-drums',
      role: 'drums',
      name: 'Drums',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      audioBuffer: drumsBuffer,
    },
  ];

  const demoLyrics = `[00:00.00] (Intro - Funk Groove) [Em] [Em7]
[00:04.17] [Em] Stepping in the room with the beat so tight
[00:08.34] [Am7] Pocket in the groove, playing through the night
[00:12.51] [Bm7] Bassline thumping and the drums don't quit
[00:16.68] [Em] The Flannels on the stage, every single hit
[00:20.85] [Am7] [Bm7] [Em] (Outro Solo)`;

  return {
    id: `song-${Date.now()}`,
    title,
    artist,
    album: 'The Flannels Session Vol. 1',
    duration: durationSec,
    bpm,
    originalKey: key,
    timeSignature: '4/4',
    stems,
    lyrics: demoLyrics,
    createdAt: Date.now(),
  };
}
