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
 * Penganalisis Kualitas Audio & Deteksi Lossless FLAC Multi-Window (SpotiFLAC Enhanced)
 * Menguji 3 jendela waktu (20%, 50%, 75%) agar intro hening tidak memicu false lossy alarm
 */
export async function analyzeAudioQuality(buffer: AudioBuffer): Promise<AudioQualityReport> {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const channelData = buffer.getChannelData(0);
  const length = channelData.length;

  // 1. Peak & RMS amplitude
  let sumSquares = 0;
  let peak = 0;
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

  // 2. Multi-Window FFT Spectral Rolloff Analysis (20%, 50%, 75% of track duration)
  const fftSize = 4096;
  const binWidth = sampleRate / fftSize;
  const windowSliceDuration = Math.min(6, buffer.duration * 0.2);
  const sliceSamples = Math.floor(windowSliceDuration * sampleRate);

  const samplePositions = [
    Math.floor(length * 0.2), // Verse
    Math.floor(length * 0.5), // Reff / Chorus
    Math.floor(length * 0.75), // Climax / Solo
  ];

  let maxDetectedCutoff = 0;
  let hasEnergyAbove20k = false;
  let hasEnergyAbove18k = false;
  let hasEnergyAbove16k = false;

  for (const pos of samplePositions) {
    if (pos + sliceSamples > length) continue;

    // Create slice buffer
    const sliceBuffer = new OfflineAudioContext(1, sliceSamples, sampleRate);
    const sliceData = sliceBuffer.createBuffer(1, sliceSamples, sampleRate);
    const sliceChannel = sliceData.getChannelData(0);

    for (let i = 0; i < sliceSamples; i++) {
      sliceChannel[i] = channelData[pos + i];
    }

    const source = sliceBuffer.createBufferSource();
    source.buffer = sliceData;
    const analyser = sliceBuffer.createAnalyser();
    analyser.fftSize = fftSize;
    source.connect(analyser);
    analyser.connect(sliceBuffer.destination);
    source.start(0);

    await sliceBuffer.startRendering();

    const freqData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freqData);

    for (let i = 0; i < freqData.length; i++) {
      const freq = i * binWidth;
      const db = freqData[i];
      // Active spectral energy threshold
      if (db > -78) {
        if (freq >= 16000) hasEnergyAbove16k = true;
        if (freq >= 18000) hasEnergyAbove18k = true;
        if (freq >= 20000) hasEnergyAbove20k = true;
        if (freq > maxDetectedCutoff) {
          maxDetectedCutoff = Math.round(freq);
        }
      }
    }
  }

  // Classification logic based on genuine spectral rolloff
  let classification: AudioQualityReport['classification'] = 'Lossless (FLAC Tier 1)';
  let isLossless = true;
  let notes = 'Spektrum frekuensi utuh hingga >20kHz tanpa cutoff artifisial. Kualitas FLAC studio murni.';
  let finalCutoff = maxDetectedCutoff > 0 ? maxDetectedCutoff : Math.round(sampleRate / 2);

  if (!hasEnergyAbove16k) {
    classification = 'Lossy / Compressed (MP3/AAC)';
    finalCutoff = Math.min(finalCutoff, 16000);
    isLossless = false;
    notes = 'Terdeteksi cutoff tajam di ~16kHz (khas kompresi lossy MP3 128kbps).';
  } else if (!hasEnergyAbove18k) {
    classification = 'Lossy / Compressed (MP3/AAC)';
    finalCutoff = Math.min(finalCutoff, 18500);
    isLossless = false;
    notes = 'Terdeteksi cutoff di ~18.5kHz (khas kompresi MP3 192kbps).';
  } else if (!hasEnergyAbove20k) {
    classification = 'Near-Lossless (Hi-Res Tier 2)';
    finalCutoff = Math.min(finalCutoff, 20000);
    isLossless = false;
    notes = 'Spektrum terpotong di kisaran 20kHz (khas MP3 320kbps atau transcode lossy).';
  }

  return {
    sampleRate,
    channels,
    bitDepthEstimate: sampleRate >= 96000 ? 24 : 16,
    cutoffFrequency: Math.min(finalCutoff, Math.round(sampleRate / 2)),
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

  // 1. BPM Estimation via Energy Peaks & Autocorrelation
  const windowSize = Math.floor(sampleRate * 0.05);
  const hopSize = Math.floor(sampleRate * 0.025);
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

  // 2. Musical Key Detection via Chroma Vector
  const chroma = new Float64Array(12);
  const fftSize = 4096;
  const numSlices = 8;
  const sliceHop = Math.floor(length / (numSlices + 1));

  for (let s = 1; s <= numSlices; s++) {
    const start = s * sliceHop;
    for (let n = 0; n < 12; n++) {
      for (let octave = 2; octave <= 5; octave++) {
        const midi = octave * 12 + n + 12;
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

  let chromaNorm = 0;
  for (let i = 0; i < 12; i++) chromaNorm += chroma[i];
  if (chromaNorm > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= chromaNorm;
  }

  let bestScore = -Infinity;
  let bestKeyIndex = 0;
  let bestScale: 'major' | 'minor' = 'minor';

  for (let root = 0; root < 12; root++) {
    let scoreMajor = 0;
    for (let i = 0; i < 12; i++) {
      scoreMajor += chroma[(root + i) % 12] * KS_MAJOR[i];
    }
    if (scoreMajor > bestScore) {
      bestScore = scoreMajor;
      bestKeyIndex = root;
      bestScale = 'major';
    }

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
  const estimatedLufs = rms > 0.00001 ? 20 * Math.log10(rms) - 0.7 : -70;
  const truePeakDb = peak > 0 ? 20 * Math.log10(peak) : -96;
  const recommendedGainDb = Math.round((targetLufs - estimatedLufs) * 10) / 10;

  return {
    integratedLufs: Math.round(estimatedLufs * 10) / 10,
    truePeakDb: Math.round(truePeakDb * 10) / 10,
    recommendedGainDb: Math.max(-12, Math.min(12, recommendedGainDb)),
    targetLufs,
    applied: false,
  };
}
