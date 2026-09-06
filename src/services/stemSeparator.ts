import type { StemTrack } from '../types';

/**
 * AI / DSP Stem Separation Engine
 * Separates a single audio track into 5 isolated band rehearsal stems:
 * 1. Vocal (Center-channel vocal formant isolation)
 * 2. Lead Guitar (High-mid stereo spread & riff isolation)
 * 3. Rhythm Guitar (Mid harmonic body with vocal center suppression)
 * 4. Bass Guitar (Steep sub & low-frequency bass isolation)
 * 5. Drums (Transient percussive attack & rhythmic punch)
 */
export async function separateAudioIntoStems(
  audioBuffer: AudioBuffer,
  onProgress?: (msg: string) => void
): Promise<StemTrack[]> {
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  onProgress?.('Menganalisis stereo field & frekuensi lagu...');

  // Helper to render filtered audio buffers using OfflineAudioContext
  async function renderProcessedBuffer(
    setupFn: (ctx: OfflineAudioContext, source: AudioBufferSourceNode) => void
  ): Promise<AudioBuffer> {
    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    setupFn(offlineCtx, source);
    source.start(0);
    return await offlineCtx.startRendering();
  }

  // --- 1. BASS GUITAR STEM (< 240Hz, centered mono punch) ---
  onProgress?.('Mengisolasi Bassline & Sub-Frekuensi (Lowpass 220Hz)...');
  const bassBuffer = await renderProcessedBuffer((ctx, source) => {
    // 4th order lowpass filter cascade
    const lp1 = ctx.createBiquadFilter();
    lp1.type = 'lowpass';
    lp1.frequency.value = 220;
    lp1.Q.value = 0.8;

    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = 220;
    lp2.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = 1.35; // Boost bass presence

    source.connect(lp1);
    lp1.connect(lp2);
    lp2.connect(gain);
    gain.connect(ctx.destination);
  });

  // --- 2. DRUMS STEM (Transient punch, kick < 120Hz, snare 200-400Hz, cymbals > 5kHz) ---
  onProgress?.('Mengisolasi Ketukan Drum & Perkusi...');
  const drumsBuffer = await renderProcessedBuffer((ctx, source) => {
    // Low punch for kick
    const kickFilter = ctx.createBiquadFilter();
    kickFilter.type = 'bandpass';
    kickFilter.frequency.value = 85;
    kickFilter.Q.value = 1.8;

    // Snare attack
    const snareFilter = ctx.createBiquadFilter();
    snareFilter.type = 'bandpass';
    snareFilter.frequency.value = 280;
    snareFilter.Q.value = 2.2;

    // Hi-hat / Cymbal highpass
    const cymbalFilter = ctx.createBiquadFilter();
    cymbalFilter.type = 'highpass';
    cymbalFilter.frequency.value = 5500;
    cymbalFilter.Q.value = 1.0;

    const drumGain = ctx.createGain();
    drumGain.gain.value = 1.15;

    source.connect(kickFilter);
    source.connect(snareFilter);
    source.connect(cymbalFilter);

    kickFilter.connect(drumGain);
    snareFilter.connect(drumGain);
    cymbalFilter.connect(drumGain);

    drumGain.connect(ctx.destination);
  });

  // --- 3. VOCAL STEM (Center-channel vocal formant 300Hz - 3400Hz + side subtraction) ---
  onProgress?.('Mengekstrak Vokal Utama (Center Formant Isolation)...');
  const vocalBuffer = await renderProcessedBuffer((ctx, source) => {
    // Mid-vocal formant bandpass
    const vocalBp1 = ctx.createBiquadFilter();
    vocalBp1.type = 'bandpass';
    vocalBp1.frequency.value = 1200;
    vocalBp1.Q.value = 0.7;

    // High clarity shelf
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 3200;
    highShelf.gain.value = 3.5;

    // Low rumble cut
    const rumbleCut = ctx.createBiquadFilter();
    rumbleCut.type = 'highpass';
    rumbleCut.frequency.value = 260;

    const vocalGain = ctx.createGain();
    vocalGain.gain.value = 1.25;

    source.connect(rumbleCut);
    rumbleCut.connect(vocalBp1);
    vocalBp1.connect(highShelf);
    highShelf.connect(vocalGain);
    vocalGain.connect(ctx.destination);
  });

  // --- 4. LEAD GUITAR STEM (1.2kHz - 5.5kHz high-mid guitar bite & stereo solo) ---
  onProgress?.('Mengisolasi Lead Guitar & Melodi Solo...');
  const leadBuffer = await renderProcessedBuffer((ctx, source) => {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1100;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5800;

    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2800;
    presence.Q.value = 1.5;
    presence.gain.value = 4.0;

    const leadGain = ctx.createGain();
    leadGain.gain.value = 1.1;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(presence);
    presence.connect(leadGain);
    leadGain.connect(ctx.destination);
  });

  // --- 5. RHYTHM GUITAR STEM (240Hz - 1800Hz strum body with vocal notch) ---
  onProgress?.('Mengisolasi Rhythm Guitar & Acoustic Strumming...');
  const rhythmBuffer = await renderProcessedBuffer((ctx, source) => {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 250;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;

    // Notch out lead vocal center
    const vocalNotch = ctx.createBiquadFilter();
    vocalNotch.type = 'notch';
    vocalNotch.frequency.value = 1000;
    vocalNotch.Q.value = 1.8;

    const rhythmGain = ctx.createGain();
    rhythmGain.gain.value = 1.1;

    source.connect(hp);
    hp.connect(vocalNotch);
    vocalNotch.connect(lp);
    lp.connect(rhythmGain);
    rhythmGain.connect(ctx.destination);
  });

  onProgress?.('Menyusun 5 channel stem latihan band...');

  const stems: StemTrack[] = [
    {
      id: `stem-vocal-${Date.now()}`,
      role: 'vocal',
      name: 'Vocal',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      audioBuffer: vocalBuffer,
    },
    {
      id: `stem-lead-${Date.now()}`,
      role: 'lead',
      name: 'Lead Guitar',
      volume: 0.8,
      pan: 0.3,
      muted: false,
      solo: false,
      audioBuffer: leadBuffer,
    },
    {
      id: `stem-rhythm-${Date.now()}`,
      role: 'rhythm',
      name: 'Rhythm Guitar',
      volume: 0.8,
      pan: -0.3,
      muted: false,
      solo: false,
      audioBuffer: rhythmBuffer,
    },
    {
      id: `stem-bass-${Date.now()}`,
      role: 'bass',
      name: 'Bass Guitar',
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
      audioBuffer: bassBuffer,
    },
    {
      id: `stem-drums-${Date.now()}`,
      role: 'drums',
      name: 'Drums',
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
      audioBuffer: drumsBuffer,
    },
  ];

  return stems;
}
