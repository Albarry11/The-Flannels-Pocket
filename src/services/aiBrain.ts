import type { Song, AIBrainConfig, AICoachingReport } from '../types';

const AI_CONFIG_KEY = 'flannels_ai_brain_config';

export const POPULAR_MUSIC_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Terbaik untuk Teori & Aransemen Band)', provider: 'Anthropic' },
  { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash (Super Cepat & Responsif)', provider: 'Google' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Penalaran Frekuensi & Audio Mendalam)', provider: 'DeepSeek' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (Handal & Hemat Token)', provider: 'Meta' },
];

const DEFAULT_AI_CONFIG: AIBrainConfig = {
  endpoint: 'https://api.9router.com/v1',
  apiKey: '',
  model: 'anthropic/claude-3.5-sonnet',
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
 * Fallback algoritma musik pintar ketika API key belum dipasang
 */
export function generateLocalRuleBasedCoaching(song: Song): AICoachingReport {
  const bpm = song.bpm || 120;
  const key = song.originalKey || 'C';
  const isMinor = key.includes('m') || key.includes('Minor');
  const durationMin = Math.floor(song.duration / 60);
  const durationSec = Math.floor(song.duration % 60);

  // Determine pentatonic and safe notes
  const safeNotes = isMinor ? '1 - b3 - 4 - 5 - b7 (Minor Pentatonic)' : '1 - 2 - 3 - 5 - 6 (Major Pentatonic)';
  const grooveStyle = bpm < 90 ? 'Slow Ballad / Soul Groove' : bpm < 125 ? 'Mid-tempo Rock / Pop Groove' : 'Driving High-energy Punk / Funk';

  return {
    songTitle: song.title,
    musicalSummary: `Lagu "${song.title}" (${key}, ${bpm} BPM, durasi ${durationMin}:${durationSec.toString().padStart(2, '0')}). Gaya ritme terdeteksi: ${grooveStyle}. Karakter harmonik ${isMinor ? 'Minor (reflektif/moody)' : 'Major (energik/terang)'}.`,
    keyAdvice: `Nada dasar asli adalah ${key}. Jika range vokal vokalis terasa tegang di nada tinggi, gunakan fitur Transpose -2 semitone pada Master Player untuk menurunkan 1 nada utuh (misal ${key} ke tangga nada yang lebih aman).`,
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
        keyChordsOrPattern: `Kunci Utama: ${key}. Mainkan tight rhythm pada off-beat (and of 1, and of 3).`,
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
      ? `Hasil Inspeksi Spektral: ${song.qualityAnalysis.classification} (Cutoff: ${song.qualityAnalysis.cutoffFrequency} Hz, DR: ${song.qualityAnalysis.dynamicRangeScore}). ${song.qualityAnalysis.notes}`
      : 'Audio siap untuk proses kulik. Aktifkan ReplayGain untuk menyamakan level volume output.',
  };
}

/**
 * Panggil model 9router / OpenAI-compatible untuk analisis musik komprehensif
 */
export async function fetchAIBrainAnalysis(
  song: Song,
  onProgress?: (text: string) => void
): Promise<AICoachingReport> {
  const config = getAIBrainConfig();

  // If no API key configured, use intelligent rule engine immediately
  if (!config.apiKey) {
    onProgress?.('Menggunakan kalkulasi cerdas algoritma musik lokal (Masukkan API Key di pengaturan 9router untuk mode AI Deep Reasoning)...');
    return generateLocalRuleBasedCoaching(song);
  }

  onProgress?.(`Menghubungkan ke 9router (${config.model})...`);

  const prompt = `Anda adalah produser musik profesional dan mentor band untuk grup musik The Flannels (Indie/Rock/Pop band dengan formasi: Vokalis, Gitaris Lead, Gitaris Rhythm, Bassist, Drummer).

Analisis detail lagu latihan berikut:
- Judul: "${song.title}"
- Artis: "${song.artist}"
- Tempo: ${song.bpm} BPM
- Tangga Nada (Key): ${song.originalKey}
- Birama: ${song.timeSignature || '4/4'}
- Durasi: ${Math.round(song.duration)} detik
- Stems: ${song.stems.map((s) => s.name).join(', ')}
${song.lyrics ? `- Petikan Lirik:\n${song.lyrics.slice(0, 500)}` : ''}

Berikan respons JSON SAJA dengan format persis berikut (tanpa markdown tambahan):
{
  "songTitle": "${song.title}",
  "musicalSummary": "Ringkasan karakter musik, dinamika lagu, dan nuansa emosional",
  "keyAdvice": "Panduan tangga nada dan saran penyesuaian nada dasar (transposition)",
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
    const cleanEndpoint = config.endpoint.replace(/\/$/, '');
    const res = await fetch(`${cleanEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: 'Anda adalah master produser musik aransemen band The Flannels. Jawab selalu dalam format valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn('9router API error:', errBody);
      throw new Error(`9router request failed (${res.status}): ${errBody.slice(0, 100)}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '';

    // Extract JSON from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as AICoachingReport;
      return parsed;
    }

    return generateLocalRuleBasedCoaching(song);
  } catch (err) {
    console.warn('Fallback to rule-based coaching due to error:', err);
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
  if (!config.apiKey) {
    return 'Untuk berdiskusi interaktif dengan AI Producer, silakan masukkan API Key 9router kamu di tab "Pengaturan 9router".';
  }

  const cleanEndpoint = config.endpoint.replace(/\/$/, '');
  const res = await fetch(`${cleanEndpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: `Anda adalah Produser Musik Band The Flannels. Lagu yang sedang diulik: "${song.title}" (${song.originalKey}, ${song.bpm} BPM). Berikan jawaban taktis, musikal, dan langsung aplikatif untuk personil band.`,
        },
        { role: 'user', content: question },
      ],
      temperature: 0.5,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`9router error: ${errText.slice(0, 150)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Tidak ada respons dari AI.';
}
