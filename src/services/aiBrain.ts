import type { Song, AIBrainConfig, AICoachingReport } from '../types';

const AI_CONFIG_KEY = 'flannels_ai_brain_config';
export const GEMINI_KEY_STORAGE = 'flannels_gemini_api_key';

export const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

const DEFAULT_AI_CONFIG: AIBrainConfig = {
  endpoint: GEMINI_API_ENDPOINT,
  apiKey: '',
  model: 'gemini-flash-latest',
};

export function getAIBrainConfig(): AIBrainConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    const storedKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    if (!raw) return { ...DEFAULT_AI_CONFIG, apiKey: storedKey };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AI_CONFIG,
      ...parsed,
      endpoint: GEMINI_API_ENDPOINT,
      apiKey: parsed.apiKey || storedKey,
      model: 'gemini-flash-latest',
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAIBrainConfig(config: AIBrainConfig): void {
  localStorage.setItem(
    AI_CONFIG_KEY,
    JSON.stringify({ ...config, endpoint: GEMINI_API_ENDPOINT, model: 'gemini-flash-latest' })
  );
  if (config.apiKey) {
    localStorage.setItem(GEMINI_KEY_STORAGE, config.apiKey);
  }
}

/**
 * Helper pemanggilan Google Gemini generateContent API
 * Mendukung Vercel Serverless Proxy (/api/gemini) dan Direct Google Cloud API
 */
async function callGeminiGenerateContent(prompt: string): Promise<string> {
  const config = getAIBrainConfig();
  const apiKey = config.apiKey || localStorage.getItem(GEMINI_KEY_STORAGE) || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  };

  // 1. Coba panggil Vercel Serverless Function proxy (/api/gemini)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-goog-api-key'] = apiKey;
    }

    const apiRes = await fetch('/api/gemini', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }
  } catch (_) {}

  // 2. Direct Google Generative Language API
  const directHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    directHeaders['X-goog-api-key'] = apiKey;
  }

  const res = await fetch(GEMINI_API_ENDPOINT, {
    method: 'POST',
    headers: directHeaders,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 150)}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  return rawText;
}

/**
 * Riset BPM dan Tangga Nada Resmi lagu via Google Gemini Flash
 * Diproses secara santai, pelan, dan teliti dengan verifikasi silang database musik
 */
export async function researchSongBpmAndKeyWithAI(
  songTitle: string,
  artistName?: string
): Promise<{ bpm: number; key: string; timeSignature: string; notes: string } | null> {
  const prompt = `Anda adalah musicologist dan peneliti lagu yang sangat teliti, santai, dan mendalam.
Tugas Anda: Lakukan riset dan verifikasi silang terhadap database musik resmi (SongBPM, Tunebat, Ultimate Guitar, Musicstax, Beatport, dan partitur sheet music resmi) untuk lagu:
Judul Lagu: "${songTitle}"
${artistName ? `Artis / Band: "${artistName}"` : ''}

PEDOMAN KETELITIAN & AKURASI TINGGI:
1. Luangkan analisis secara cermat. Prioritaskan keakuratan 100% di atas kecepatan.
2. Analisis progresi akord lagu (verse & chorus) untuk menentukan Tangga Nada Asli (Key) secara pasti (misal: Sheila On 7 "Dan" verse C-Em-F-G atau E-G#m-A-B sesuai rekaman master studio, Peterpan "Menghapus Jejakmu" = G Mayor, Dewa 19 "Kangen" = D Mayor).
3. Tentukan tempo metronom studio resmi (BPM) yang stabil.
4. Format output WAJIB HANYA JSON valid (tanpa teks pengantar apapun):
{
  "title": "${songTitle}",
  "artist": "${artistName || ''}",
  "bpm": 135,
  "key": "E",
  "timeSignature": "4/4",
  "notes": "Detail chord progresi, tuning, dan versi rekaman master resmi"
}`;

  try {
    const rawText = await callGeminiGenerateContent(prompt);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        bpm: typeof parsed.bpm === 'number' ? parsed.bpm : 120,
        key: typeof parsed.key === 'string' ? parsed.key : 'C',
        timeSignature: typeof parsed.timeSignature === 'string' ? parsed.timeSignature : '4/4',
        notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      };
    }
  } catch (err) {
    console.warn('Gemini song research failed, fallback to local estimation:', err);
  }
  return null;
}

/**
 * Generate Lirik & Akord Otomatis via Google Gemini Flash
 */
export async function generateLyricsAndChordsWithAI(
  songTitle: string,
  artistName?: string
): Promise<string | null> {
  const prompt = `Anda adalah transkripter lirik dan akord musik profesional.
Tugas Anda: Buatkan lirik lengkap lagu dengan akord format [Chord] dan timestamp sinkron format [mm:ss.xx] untuk lagu:
Judul: "${songTitle}"
${artistName ? `Artis / Band: "${artistName}"` : ''}

ATURAN KETELITIAN:
1. Pastikan akord di dalam [Chord] akurat dan harmonis dengan progresi nada dasar lagu aslinya.
2. Timestamp [mm:ss.xx] teratur per baris lirik.
3. Berikan HANYA teks LRC murni tanpa intro/outro percakapan.`;

  try {
    const rawText = await callGeminiGenerateContent(prompt);
    return rawText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
  } catch (err) {
    console.warn('Gemini lyrics generation failed:', err);
    return null;
  }
}

/**
 * Fallback algoritma musik lokal
 */
export function generateLocalRuleBasedCoaching(song: Song): AICoachingReport {
  const bpm = song.bpm || 120;
  const key = song.originalKey || 'C';
  const isMinor = key.includes('m') || key.includes('Minor');
  const durationMin = Math.floor(song.duration / 60);
  const durationSec = Math.floor(song.duration % 60);

  const safeNotes = isMinor ? '1 - b3 - 4 - 5 - b7 (Minor Pentatonic)' : '1 - 2 - 3 - 5 - 6 (Major Pentatonic)';
  const grooveStyle = bpm < 90 ? 'Slow Ballad / Soul' : bpm < 125 ? 'Mid-tempo Pop / Rock' : 'Driving High-energy Rock';

  return {
    songTitle: song.title,
    musicalSummary: `Lagu "${song.title}" (${key}, ${bpm} BPM, durasi ${durationMin}:${durationSec.toString().padStart(2, '0')}). Gaya ritme: ${grooveStyle}. Karakter harmonik ${isMinor ? 'Minor' : 'Major'}.`,
    keyAdvice: `Tangga nada asli adalah ${key}. Jika range vokal vokalis terasa tegang di nada tinggi, gunakan fitur Transpose -2 semitone pada Master Player untuk menurunkan 1 nada utuh.`,
    rehearsalPlan: [
      'Bagian 1: Latihan isolasi Rhythm Section (Solo Bass + Drums) untuk mengunci ketukan beat di tempo ' + bpm + ' BPM.',
      'Bagian 2: Tambahkan Rhythm Guitar untuk mengisi harmonic groove dan comping pada baris ketukan 2 & 4.',
      'Bagian 3: Masuk Lead Guitar untuk mengulik riff & melodi di skala ' + safeNotes + '.',
      'Bagian 4: Full band rehearsal bersama Vokalis dengan sinkronisasi lirik dan pernapasan.',
    ],
    personilGuides: [
      {
        personil: 'Vocal',
        focus: 'Kontrol Jangkauan Vokal & Titik Pernapasan',
        tips: [
          'Gunakan mode Solo Vokal untuk mendengarkan vibrato, artikulasi kata, dan intonasi nada.',
          'Gunakan A-B Looper untuk mengulang bagian nada tinggi (chorus) tanpa harus memutar ulang dari awal.',
        ],
        keyChordsOrPattern: `Tangga Nada: ${key}. Perhatikan nada tumpuan di nada ke-1 dan ke-5.`,
      },
      {
        personil: 'Lead',
        focus: 'Fill-in & Melodic Solo Phrasing',
        tips: [
          'Posisikan switch pickup bridge untuk artikulasi solo yang tajam atau neck untuk sound blues hangat.',
          'Eksplorasi lick solo menggunakan tangga nada ' + safeNotes + '.',
        ],
        keyChordsOrPattern: `Skala Solo: ${key} Pentatonic / Blues Scale.`,
      },
      {
        personil: 'Rhythm',
        focus: 'Strumming Pocket & Voicing Akord',
        tips: [
          'Jaga dinamika strumming agar tidak menutupi vokal dan lead guitar.',
          'Gunakan akord 7th atau add9 untuk memberi nuansa modern pada alur lagu.',
        ],
        keyChordsOrPattern: `Kunci Utama: ${key}. Mainkan tight rhythm pada off-beat.`,
      },
      {
        personil: 'Bass',
        focus: 'Pocket Bassline & Sinkronisasi Kick Drum',
        tips: [
          'Kunci setiap not pertama (root note) pas di atas pukulan kick drum drummer.',
          'Jaga sustain nada low-end agar bass punchy dan tidak berlumpur (muddy).',
        ],
        keyChordsOrPattern: `Root notes: ${key}. Padukan aksen oktaf dan walking line di transisi bar.`,
      },
      {
        personil: 'Drums',
        focus: 'Konsistensi Tempo & Dinamika Snare Ghost-Notes',
        tips: [
          `Nyalakan fitur Metronome dengan opsi 'Sync to Song' pada tempo ${bpm} BPM untuk melatih kestabilan beat.`,
          'Beri aksen crash cymbal tegas pada perpindahan section dari verse menuju reff.',
        ],
        keyChordsOrPattern: `Tempo Target: ${bpm} BPM (Birama 4/4). Groove: ${grooveStyle}.`,
      },
    ],
    mixDoctorNotes: song.qualityAnalysis
      ? `Hasil Inspeksi Kualitas: ${song.qualityAnalysis.classification} (Cutoff: ${song.qualityAnalysis.cutoffFrequency} Hz, DR: ${song.qualityAnalysis.dynamicRangeScore}). ${song.qualityAnalysis.notes}`
      : 'Audio siap untuk proses kulik band. Aktifkan ReplayGain untuk menyamakan kenyaringan suara.',
  };
}

/**
 * Analisis aransemen musik via Google Gemini Flash
 */
export async function fetchAIBrainAnalysis(
  song: Song,
  onProgress?: (text: string) => void
): Promise<AICoachingReport> {
  onProgress?.('Membedah aransemen via Google Gemini Flash...');

  const prompt = `Anda adalah produser musik profesional dan mentor band The Flannels (formasi: Vokalis, Gitaris Lead, Gitaris Rhythm, Bassist, Drummer).

Analisis detail lagu latihan berikut secara teliti:
- Judul: "${song.title}"
- Artis: "${song.artist}"
- Tempo: ${song.bpm} BPM
- Tangga Nada (Key): ${song.originalKey}
- Birama: ${song.timeSignature || '4/4'}
- Durasi: ${Math.round(song.duration)} detik
- Stems: ${song.stems.map((s) => s.name).join(', ')}

Berikan respons JSON valid SAJA:
{
  "songTitle": "${song.title}",
  "musicalSummary": "Ringkasan karakter musik, dinamika lagu, dan nuansa emosional",
  "keyAdvice": "Panduan tangga nada dan saran penyesuaian nada dasar",
  "rehearsalPlan": ["Langkah latihan 1", "Langkah latihan 2", "Langkah latihan 3", "Langkah latihan 4"],
  "personilGuides": [
    {
      "personil": "Vocal",
      "focus": "Fokus latihan vokal",
      "tips": ["Tips vokal 1", "Tips vokal 2"],
      "keyChordsOrPattern": "Pola nada / jangkauan"
    },
    {
      "personil": "Lead",
      "focus": "Fokus lead guitar",
      "tips": ["Tips lead 1", "Tips lead 2"],
      "keyChordsOrPattern": "Skala solo dan posisi fret"
    },
    {
      "personil": "Rhythm",
      "focus": "Fokus rhythm guitar",
      "tips": ["Tips rhythm 1", "Tips rhythm 2"],
      "keyChordsOrPattern": "Progresi akord dan variasi chord"
    },
    {
      "personil": "Bass",
      "focus": "Fokus bass",
      "tips": ["Tips bass 1", "Tips bass 2"],
      "keyChordsOrPattern": "Pola groove bassline"
    },
    {
      "personil": "Drums",
      "focus": "Fokus drums",
      "tips": ["Tips drums 1", "Tips drums 2"],
      "keyChordsOrPattern": "Pola ketukan beat dan fill"
    }
  ],
  "mixDoctorNotes": "Saran mixing dan balancing instrumen untuk latihan"
}`;

  try {
    const rawText = await callGeminiGenerateContent(prompt);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AICoachingReport;
    }
    return generateLocalRuleBasedCoaching(song);
  } catch (err) {
    console.warn('AI analysis fallback:', err);
    return generateLocalRuleBasedCoaching(song);
  }
}

/**
 * Tanya jawab interaktif dengan AI Music Producer via Gemini
 */
export async function askAIBandProducer(
  question: string,
  song: Song
): Promise<string> {
  const prompt = `Anda adalah Produser Musik Band The Flannels. Lagu yang sedang diulik: "${song.title}" (${song.originalKey}, ${song.bpm} BPM). Berikan jawaban taktis, musikal, dan langsung aplikatif untuk personil band.

Pertanyaan personil: "${question}"`;

  try {
    const rawText = await callGeminiGenerateContent(prompt);
    return rawText || 'Tidak ada respons dari AI Producer.';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Koneksi Gemini bermasalah: ${msg}`;
  }
}
