export type StemRole = 'vocal' | 'lead' | 'rhythm' | 'bass' | 'drums' | 'piano' | 'other';

export interface StemTrack {
  id: string;
  role: StemRole;
  name: string;
  volume: number;      // 0 to 1
  pan: number;         // -1 (L) to 1 (R)
  muted: boolean;
  solo: boolean;
  audioBuffer?: AudioBuffer;
  blob?: Blob;
  fileName?: string;
  peakLevel?: number;  // 0 to 1 for VU meter
}

export interface AudioQualityReport {
  sampleRate: number;
  channels: number;
  bitDepthEstimate: number;
  cutoffFrequency: number;
  classification: 'Lossless (FLAC Tier 1)' | 'Near-Lossless (Hi-Res Tier 2)' | 'Lossy / Compressed (MP3/AAC)';
  dynamicRangeScore: number;
  peakAmplitudeDb: number;
  rmsAmplitudeDb: number;
  isLossless: boolean;
  notes: string;
}

export interface ReplayGainReport {
  integratedLufs: number;
  truePeakDb: number;
  recommendedGainDb: number;
  targetLufs: number;
  applied: boolean;
}

export interface BpmKeyAnalysis {
  bpm: number;
  confidence: number;
  key: string;          // e.g. 'Em', 'C', 'F#m'
  scale: 'major' | 'minor';
  camelot: string;      // e.g. '9A', '8B'
}

export interface LrcLine {
  id: string;
  time: number;         // seconds
  text: string;
  chords?: { chord: string; position: number }[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  bpm: number;
  originalKey: string;
  timeSignature: string;
  stems: StemTrack[];
  lyrics?: string;      // raw LRC or plain text
  createdAt: number;
  artworkUrl?: string;  // Image URL / cover art
  verifiedSource?: string; // e.g. "SongBPM / Tunebat / Master Audio Recording"
  sourceUrl?: string;      // Direct clickable web search URL
  researchNotes?: string;  // e.g. "Progresi verse C - Em - F - G, tuning A440"
  folderName?: string;     // e.g. "Songs/Tak Berdaya/"
  discreteFiles?: { name: string; size: number; role: string }[]; // List of discrete WAV stem files
  coachingReport?: AICoachingReport; // Cached Tilikan AI analysis
  qualityAnalysis?: AudioQualityReport;
  replayGain?: ReplayGainReport;
  bpmKeyAnalysis?: BpmKeyAnalysis;
  cloudSynced?: boolean;
}

export interface LoopRegion {
  enabled: boolean;
  start: number;
  end: number;
}

export interface CloudDbConfig {
  provider: 'supabase' | 'custom';
  supabaseUrl: string;
  supabaseAnonKey: string;
  bucketName: string;
  autoSync: boolean;
  lastSyncTime?: number;
}

export interface AIBrainConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  customModelName?: string;
}

export interface AIPersonilGuide {
  personil: 'Vocal' | 'Lead' | 'Rhythm' | 'Bass' | 'Drums';
  focus: string;
  tips: string[];
  keyChordsOrPattern: string;
}

export interface AICoachingReport {
  songTitle: string;
  musicalSummary: string;
  keyAdvice: string;
  rehearsalPlan: string[];
  personilGuides: AIPersonilGuide[];
  mixDoctorNotes: string;
}
