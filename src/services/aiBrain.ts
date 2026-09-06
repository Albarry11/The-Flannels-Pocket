import type { Song, AIBrainConfig, AICoachingReport } from '../types';

const AI_CONFIG_KEY = 'flannels_ai_brain_config';

export const POPULAR_MUSIC_MODELS = [
  { id: 'ag/gemini-3.8-flash', name: 'Gemini 3.8 Flash (Cepat, Akurat, Web Search Aktif)', provider: 'Local AI 20128' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Terbaik untuk Aransemen & Teori Musik)', provider: 'Anthropic' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Penalaran Mendalam)', provider: 'DeepSeek' },
  { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)', provider: 'Groq' },
];

const DEFAULT_AI_CONFIG: AIBrainConfig = {
  endpoint: 'http://localhost:20128/v1',
  apiKey: '',
  model: 'ag/gemini-3.8-flash',
};

export function getAIBrainConfig(): AIBrainConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAIBrainConfig(config: AIBrainConfig): void {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Riset BPM dan Tangga Nada Resmi lagu via AI Web Search
 */
export async function researchSongBpmAndKeyWithAI(
  songTitle: string,
  artistName?: string
): Promise<{ bpm: number; key: string; timeSignature: string; notes: string } | null> {
  const config = getAIBrainConfig();
  const cleanEndpoint = config.endpoint.replace(/\/$/, '');

  const prompt = `Riset BPM dan Tangga Nada Resmi untuk lagu berikut:
Judul: "${songTitle}"
${artistName ? `Artis/Penyanyi: "${artistName}"` : ''}

Tentukan tempo rekaman studio resmi (BPM), tangga nada dasar asli (Key, contoh: "G", "Em", "C#m"), dan birama (contoh: "4/4", "6/8").
Jawab HANYA dalam format JSON valid (tanpa markdown tambahan):
{
  "bpm": 120,
  "key": "Em",
  "timeSignature": "4/4",
  "notes": "Deskripsi singkat tempo dan ritme"
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
        model: config.model || 'ag/gemini-3.8-flash',
        messages: [
          { role: 'system', content: 'Anda adalah basis data musik dan ensiklopedia tempo lagu resmi. Jawab selalu dalam format valid JSON saja.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.2,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
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
    console.warn('AI song research failed, fallback to audio analyzer:', err);
  }
  return null;
}

/**
 * Generate Lirik & Akord Otomatis via AI
 */
export async function generateLyricsAndChordsWithAI(
  songTitle: string,
  artistName?: string
): Promise<string | null> {
  const config = getAIBrainConfig();
  const cleanEndpoint = config.endpoint.replace(/\/$/, '');

  const prompt = `Buatkan lirik lengkap dengan format timestamp LRC tersinkronisasi dan akord gitar/keyboard di dalam kurung siku [Chord] untuk lagu:
Judul: "${songTitle}"
${artistName ? `Artis: "${artistName}"` : ''}

Format output persis seperti contoh:
[00:00.00] (Intro) [Em] [C] [D]
[00:15.00] [Em] Bait pertama lirik [C] lanjutan kata [D]
[00:30.00] [G] Bagian reff dimulai [D]...

Berikan HANYA teks LRC tersinkronisasi tanpa kalimat pembuka atau penutup.`;

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
        model: config.model || 'ag/gemini-3.8-flash',
        messages: [
          { role: 'system', content: 'Anda adalah master transkripsi lirik dan akord musik. Keluarkan teks LRC murni dengan akord dalam [Chord].' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    // Strip markdown code fences if present
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
  const grooveStyle = bpm < 90 ? 'Slow Ballad / Soul Groove' : bpm < 125 ? 'Mid-tempo Rock / Pop Groove' : 'Driving High-energy Funk/Rock';

  return {
    songTitle: song.title,
    musicalSummary: `Lagu "${song.title}" (${key}, ${bpm} BPM, durasi ${durationMin}:${durationSec.toString().padStart(2, '0')}). Gaya ritme: ${grooveStyle}. Karakter harmonik ${isMinor ? 'Minor (reflektif/moody)' : 'Major (energik/terang)'}.`,
    keyAdvice: `Tangga nada asli lagu ini adalah ${key}. Jika range vokal vokalis terasa tegang di nada tinggi, gunakan fitur Transpose -2 semitone pada Master Player untuk menurunkan 1 nada utuh.`,
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
 * Panggil model AI untuk analisis musik komprehensif
 */
export async function fetchAIBrainAnalysis(
  song: Song,
  onProgress?: (text: string) => void
): Promise<AICoachingReport> {
  const config = getAIBrainConfig();
  const cleanEndpoint = config.endpoint.replace(/\/$/, '');

  onProgress?.(`Menganalisis musik via AI (${config.model})...`);

  const prompt = `Anda adalah produser musik profesional dan mentor band untuk grup musik The Flannels (formasi: Vokalis, Gitaris Lead, Gitaris Rhythm, Bassist, Drummer).

Analisis detail lagu latihan berikut:
- Judul: "${song.title}"
- Artis: "${song.artist}"
- Tempo: ${song.bpm} BPM
- Tangga Nada (Key): ${song.originalKey}
- Birama: ${song.timeSignature || '4/4'}
- Durasi: ${Math.round(song.duration)} detik
- Stems: ${song.stems.map((s) => s.name).join(', ')}
${song.lyrics ? `- Petikan Lirik:\n${song.lyrics.slice(0, 400)}` : ''}

Berikan respons JSON SAJA dengan format persis berikut (tanpa markdown tambahan):
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
        model: config.model || 'ag/gemini-3.8-flash',
        messages: [
          { role: 'system', content: 'Anda adalah master produser musik aransemen band The Flannels. Jawab selalu dalam format valid JSON saja.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      return generateLocalRuleBasedCoaching(song);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '';
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
 * Tanya jawab interaktif dengan AI Music Producer
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
        model: config.model || 'ag/gemini-3.8-flash',
        messages: [
          {
            role: 'system',
            content: `Anda adalah Produser Musik Band The Flannels. Lagu yang sedang diulik: "${song.title}" (${song.originalKey}, ${song.bpm} BPM). Berikan jawaban taktis, musikal, dan langsung aplikatif untuk personil band.`,
          },
          { role: 'user', content: question },
        ],
        stream: false,
        temperature: 0.5,
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
    return 'Layanan AI lokal tidak dapat dihubungi. Pastikan server AI aktif di ' + config.endpoint;
  }
}
