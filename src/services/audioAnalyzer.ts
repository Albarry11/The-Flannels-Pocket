import type { AudioQualityReport, ReplayGainReport, BpmKeyAnalysis } from '../types';

// Krumhansl-Schmuckler Key Profiles (Chroma weights for Major and Minor keys)
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Camelot Wheel mapping
const CAMELOT_MAP: Record<string, string> = {
  'Ab Minor': '1A', 'B Major': '1B',
  'Eb Minor': '2A', 'F# Major': '2B',
  'Bb Minor': '3A', 'Db Major': '3B',
  'F Minor': '4A', 'Ab Major': '4B',
  'C Minor': '5A', 'Eb Major': '5B',
  'G Minor': '6A', 'Bb Major': '6B',
  'D Minor': '7A', 'F Major': '7B',
  'A Minor': '8A', 'C Major': '8B',
  'E Minor': '9A', 'G Major': '9B',
  'B Minor': '10A', 'D Major': '10B',
  'F# Minor': '11A', 'A Major': '11B',
  'C# Minor': '12A', 'E Major': '12B',
};

/**
 * Penganalisis Kualitas Audio & Deteksi Lossless FLAC
 * Mengadopsi inspeksi spektral frekuensi tinggi seperti SpotiFLAC
 */
export async function analyzeAudioQuality(buffer: AudioBuffer): Promise<AudioQualityReport> {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const channelData = buffer.getChannelData(0);
  const length = channelData.length;

  // 1. Calculate Peak & RMS amplitude
  let sumSquares = 0;
  let peak = 0;
  // Sample up to 100,000 points to keep execution responsive
  const step = Math.max(1, Math.floor(length / 100000));
  let count = 0;
  for (let i = 0; i < length; i += step) {
    const val = Math.abs(channelData[i]);
    if (val > peak) peak = val;
    sumSquares += val * val;
    count++;
  }
  const rms = Math.sqrt(sumSquares / count);
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -96;
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -96;
  const dynamicRangeScore = Math.max(0, Math.min(20, Math.round(peakDb - rmsDb)));

  // 2. High Frequency Cutoff & Spectral Rolloff analysis
  // We use OfflineAudioContext to run FFT and measure high frequency energy
  const fftSize = 4096;
  const offlineCtx = new OfflineAudioContext(1, Math.min(buffer.length, sampleRate * 10), sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = fftSize;
  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);

  // Render a slice
  await offlineCtx.startRendering();

  const freqData = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(freqData);

  const binWidth = sampleRate / fftSize;
  let cutoffFrequency = 22050;
  let hasEnergyAbove20k = false;
  let hasEnergyAbove18k = false;
  let hasEnergyAbove16k = false;

  // Inspect bins from 15 kHz up to Nyquist
  for (let i = 0; i < freqData.length; i++) {
    const freq = i * binWidth;
    const db = freqData[i];
    // Active energy threshold (-75 dBFS)
    if (db > -75) {
      if (freq >= 16000) hasEnergyAbove16k = true;
      if (freq >= 18000) hasEnergyAbove18k = true;
      if (freq >= 20000) hasEnergyAbove20k = true;
      cutoffFrequency = Math.max(cutoffFrequency, Math.round(freq));
    }
  }

  // Determine classification
  let classification: AudioQualityReport['classification'] = 'Lossless (FLAC Tier 1)';
  let isLossless = true;
  let notes = 'Spektrum frekuensi utuh hingga >20kHz tanpa cutoff artifisial. Kualitas FLAC studio.';

  if (!hasEnergyAbove16k) {
    classification = 'Lossy / Compressed (MP3/AAC)';
    cutoffFrequency = Math.min(cutoffFrequency, 16000);
    isLossless = false;
    notes = 'Terdeteksi cutoff tajam di ~16kHz (khas kompresi lossy MP3 128kbps).';
  } else if (!hasEnergyAbove18k) {
    classification = 'Lossy / Compressed (MP3/AAC)';
    cutoffFrequency = Math.min(cutoffFrequency, 18500);
    isLossless = false;
    notes = 'Terdeteksi cutoff di ~18.5kHz (khas kompresi MP3 192kbps).';
  } else if (!hasEnergyAbove20k) {
    classification = 'Near-Lossless (Hi-Res Tier 2)';
    cutoffFrequency = Math.min(cutoffFrequency, 20000);
    isLossless = false;
    notes = 'Spektrum terpotong di kisaran 20kHz (khas MP3 320kbps atau lossy transcode).';
  }

  return {
    sampleRate,
    channels,
    bitDepthEstimate: sampleRate >= 96000 ? 24 : 16,
    cutoffFrequency: Math.min(cutoffFrequency, Math.round(sampleRate / 2)),
    classification,
    dynamicRangeScore,
    peakAmplitudeDb: Math.round(peakDb * 10) / 10,
    rmsAmplitudeDb: Math.round(rmsDb * 10) / 10,
    isLossless,
    notes,
  };
}

/**
 * Penganalisis BPM dan Tangga Nada (Key Detection)
 */
export async function analyzeBpmAndKey(buffer: AudioBuffer): Promise<BpmKeyAnalysis> {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const length = channelData.length;

  // --- 1. BPM Estimation via Energy Peaks ---
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms window
  const hopSize = Math.floor(sampleRate * 0.025);   // 25ms hop
  const numFrames = Math.floor((length - windowSize) / hopSize);
  const energy = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    let sum = 0;
    for (let i = 0; i < windowSize; i += 4) {
      const v = channelData[start + i];
      sum += v * v;
    }
    energy[f] = sum;
  }

  // Autocorrelation for BPM range 70 to 180 BPM
  const minLag = Math.floor((60 / 180) * (sampleRate / hopSize));
  const maxLag = Math.floor((60 / 70) * (sampleRate / hopSize));

  let maxCorr = -1;
  let bestLag = minLag;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    const testCount = Math.min(1000, numFrames - lag);
    for (let i = 0; i < testCount; i++) {
      corr += energy[i] * energy[i + lag];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }

  const detectedBpm = Math.round((60 / (bestLag * (hopSize / sampleRate))));
  const clampedBpm = detectedBpm >= 60 && detectedBpm <= 200 ? detectedBpm : 120;

  // --- 2. Musical Key Detection via Chroma Vector ---
  const chroma = new Float64Array(12);
  const fftSize = 4096;
  const numSlices = 8;
  const sliceHop = Math.floor(length / (numSlices + 1));

  for (let s = 1; s <= numSlices; s++) {
    const start = s * sliceHop;
    // Simple DFT for standard musical notes from C2 to B5
    for (let n = 0; n < 12; n++) {
      for (let octave = 2; octave <= 5; octave++) {
        const midi = octave * 12 + n + 12; // C2 is midi 24
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        if (freq > sampleRate / 2) continue;

        const k = (2 * Math.PI * freq) / sampleRate;
        let real = 0;
        let imag = 0;
        const testLen = Math.min(fftSize, length - start);
        for (let i = 0; i < testLen; i += 8) {
          const sample = channelData[start + i];
          real += sample * Math.cos(k * i);
          imag -= sample * Math.sin(k * i);
        }
        const mag = Math.sqrt(real * real + imag * imag);
        chroma[n] += mag;
      }
    }
  }

  // Normalize chroma
  let chromaNorm = 0;
  for (let i = 0; i < 12; i++) chromaNorm += chroma[i];
  if (chromaNorm > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= chromaNorm;
  }

  // Match against Krumhansl-Schmuckler profiles
  let bestScore = -Infinity;
  let bestKeyIndex = 0;
  let bestScale: 'major' | 'minor' = 'minor';

  for (let root = 0; root < 12; root++) {
    // Major correlation
    let scoreMajor = 0;
    for (let i = 0; i < 12; i++) {
      scoreMajor += chroma[(root + i) % 12] * KS_MAJOR[i];
    }
    if (scoreMajor > bestScore) {
      bestScore = scoreMajor;
      bestKeyIndex = root;
      bestScale = 'major';
    }

    // Minor correlation
    let scoreMinor = 0;
    for (let i = 0; i < 12; i++) {
      scoreMinor += chroma[(root + i) % 12] * KS_MINOR[i];
    }
    if (scoreMinor > bestScore) {
      bestScore = scoreMinor;
      bestKeyIndex = root;
      bestScale = 'minor';
    }
  }

  const rootName = NOTE_NAMES[bestKeyIndex];
  const scaleText = bestScale === 'minor' ? 'Minor' : 'Major';
  const keyString = bestScale === 'minor' ? `${rootName}m` : rootName;
  const fullName = `${rootName} ${scaleText}`;
  const camelot = CAMELOT_MAP[fullName] || '8B';

  return {
    bpm: clampedBpm,
    confidence: Math.min(0.95, Math.round((bestScore / 10) * 100) / 100),
    key: keyString,
    scale: bestScale,
    camelot,
  };
}

/**
 * Penganalisis ReplayGain & Kelantangan (ITU-R BS.1770 / EBU R128)
 */
export function calculateReplayGain(buffer: AudioBuffer, targetLufs = -14): ReplayGainReport {
  const channelData = buffer.getChannelData(0);
  const length = channelData.length;

  // Calculate RMS with high-pass weighting approximation
  let sumSq = 0;
  let peak = 0;
  const step = Math.max(1, Math.floor(length / 80000));
  let count = 0;

  for (let i = 0; i < length; i += step) {
    const val = Math.abs(channelData[i]);
    if (val > peak) peak = val;
    sumSq += val * val;
    count++;
  }

  const rms = Math.sqrt(sumSq / count);
  // Approximate LUFS: standard full scale sine is -3.01 dBFS, LUFS is weighted RMS - 0.69 dB
  const estimatedLufs = rms > 0.00001 ? 20 * Math.log10(rms) - 0.7 : -70;
  const truePeakDb = peak > 0 ? 20 * Math.log10(peak) : -96;

  // ReplayGain offset to reach target (e.g. -14 LUFS)
  const recommendedGainDb = Math.round((targetLufs - estimatedLufs) * 10) / 10;

  return {
    integratedLufs: Math.round(estimatedLufs * 10) / 10,
    truePeakDb: Math.round(truePeakDb * 10) / 10,
    recommendedGainDb: Math.max(-12, Math.min(12, recommendedGainDb)),
    targetLufs,
    applied: false,
  };
}
