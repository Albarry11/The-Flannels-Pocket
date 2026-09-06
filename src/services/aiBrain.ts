import type { Song, AIBrainConfig, AICoachingReport } from '../types';

const AI_CONFIG_KEY = 'flannels_ai_brain_config';

// User directive: Gunakan 1 model ini saja: ag/gemini-3.8-flash-high
export const LOCKED_AI_MODEL = 'ag/gemini-3.8-flash-high';

const DEFAULT_AI_CONFIG: AIBrainConfig = {
  endpoint: 'http://localhost:20128/v1',
  apiKey: '',
  model: LOCKED_AI_MODEL,
};

export function getAIBrainConfig(): AIBrainConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AI_CONFIG, ...parsed, model: LOCKED_AI_MODEL };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAIBrainConfig(config: AIBrainConfig): void {
  // Always enforce the locked model
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify({ ...config, model: LOCKED_AI_MODEL }));
}

/**
 * Riset BPM dan Tangga Nada Resmi lagu via AI Web Search (Model: ag/gemini-3.8-flash-high)
 * Dilatih dengan aturan pencarian database musik resmi (SongBPM, Tunebat, Ultimate Guitar, Musicstax)
 */
export async function researchSongBpmAndKeyWithAI(
  songTitle: string,
  artistName?: string
): Promise<{ bpm: number; key: string; timeSignature: string; notes: string } | null> {
  const config = getAIBrainConfig();
  const cleanEndpoint = config.endpoint.replace(/\/$/, '');

  const prompt = `Anda adalah musicologist profesional dengan kapabilitas web search musik tingkat tinggi.
Tugas Anda: Riset BPM rekaman studio resmi dan Tangga Nada Asli (Key) untuk lagu berikut:
Judul Lagu: "${songTitle}"
${artistName ? `Penyanyi / Band: "${artistName}"` : ''}

INSTRUKSI RISET KETAT:
1. Telusuri data resmi dari arsip musik terverifikasi (seperti SongBPM, Tunebat, Musicstax, Beatport, dan partitur chord asli).
2. Periksa progresi akord lagu untuk memastikan Root Key yang benar (contoh: "Dan - Sheila On 7" verse-nya E-G#m-A-B maka Key = "E", Peterpan "Menghapus Jejakmu" = "G", Dewa 19 "Kangen" = "D").
3. Jangan menebak sembarangan atau memberikan angka perkiraan acak. Pastikan akurat dengan versi rekaman studio master.
4. Jawab HANYA dalam format JSON valid (tanpa teks pembuka atau penutup):
{
  "title": "${songTitle}",
  "artist": "${artistName || ''}",
  "bpm": 135,
  "key": "E",
  "timeSignature": "4/4",
  "notes": "Detail album, tahun rilis, dan progresi akord kunci"
}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(`${cleanEndpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: LOCKED_AI_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah basis data musik dan ensiklopedia tempo lagu resmi. Jawab selalu dalam format JSON valid saja.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.1,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
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
    console.warn('AI song research failed:', err);
  }
  return null;
}

/**
 * Generate Lirik & Akord Otomatis via AI (Model: ag/gemini-3.8-flash-high)
 */
export async function generateLyricsAndChordsWithAI(
  songTitle: string,
  artistName?: string
): Promise<string | null> {
  const config = getAIBrainConfig();
  const cleanEndpoint = config.endpoint.replace(/\/$/, '');

  const prompt = `Anda adalah transkripter lirik dan akord musik profesional.
Tugas Anda: Buatkan lirik lengkap lagu dengan akord format [Chord] dan timestamp sinkron format [mm:ss.xx] untuk lagu:
Judul: "${songTitle}"
${artistName ? `Artis / Band: "${artistName}"` : ''}

ATURAN:
1. Pastikan akord yang disematkan di dalam kurung siku [Chord] akurat dengan nada dasar lagu studio aslinya.
2. Timestamp [mm:ss.xx] harus teratur per baris lirik (misal [00:15.50][Em] Lirik bait...).
3. Berikan HANYA teks LRC murni tanpa intro/outro percakapan.`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(`${cleanEndpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: LOCKED_AI_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah master transkripsi lirik dan akord musik. Keluarkan teks LRC murni dengan akord dalam [Chord].' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.2,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    return content.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
  } catch (err) {
    console.warn('AI lyrics generation failed:', err);
    return null;
  }
}

/**
 * Fallback algoritma musik pintar lokal
 */
export function generateLocalRuleBasedCoaching(song: Song): AICoachingReport {
  const bpm = song.bpm || 120;
  const key = song.originalKey || 'C';
  const isMinor = key.includes('m') || key.includes('Minor');
  const durationMin = Math.floor(song.duration / 60);
  const durationSec = Math.floor(song.duration % 60);

  const safeNotes = isMinor ? '1 - b3 - 4 - 5 - b7 (Minor Pentatonic)' : '1 - 2 - 3 - 5 - 6 (Major Pentatonic)';
  const grooveStyle = bpm < 90 ? 'Slow Ballad / Soul Groove' : bpm < 125 ? 'Mid-tempo Rock / Pop' : 'High-energy Funk/Rock';

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
 * Analisis aransemen musik komprehensif via ag/gemini-3.8-flash-high
 */
export async function fetchAIBrainAnalysis(
  song: Song,
  onProgress?: (text: string) => void
): Promise<AICoachingReport> {
  const config = getAIBrainConfig();
  const cleanEndpoint = config.endpoint.replace(/\/$/, '');

  onProgress?.(`Membedah aransemen via ${LOCKED_AI_MODEL}...`);

  const prompt = `Anda adalah produser musik profesional dan mentor band The Flannels (formasi: Vokalis, Gitaris Lead, Gitaris Rhythm, Bassist, Drummer).

Analisis detail lagu latihan berikut:
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(`${cleanEndpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: LOCKED_AI_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah master produser musik aransemen band The Flannels. Jawab selalu dalam format valid JSON saja.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      return generateLocalRuleBasedCoaching(song);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AICoachingReport;
    }
    return generateLocalRuleBasedCoaching(song);
  } catch (err) {
    console.warn('AI analysis fallback to local rules:', err);
    return generateLocalRuleBasedCoaching(song);
  }
}

/**
 * Tanya jawab interaktif dengan AI Music Producer via ag/gemini-3.8-flash-high
 */
export async function askAIBandProducer(
  question: string,
  song: Song
): Promise<string> {
  const config = getAIBrainConfig();
  const cleanEndpoint = config.endpoint.replace(/\/$/, '');

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(`${cleanEndpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: LOCKED_AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `Anda adalah Produser Musik Band The Flannels. Lagu yang sedang diulik: "${song.title}" (${song.originalKey}, ${song.bpm} BPM). Berikan jawaban taktis, musikal, dan langsung aplikatif untuk personil band.`,
          },
          { role: 'user', content: question },
        ],
        stream: false,
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return `Koneksi AI (${res.status}): ${errText.slice(0, 100)}`;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || 'Tidak ada respons dari AI.';
  } catch (err) {
    return 'Layanan AI lokal tidak dapat dihubungi di ' + config.endpoint;
  }
}
