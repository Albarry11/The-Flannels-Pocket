import { generateLyricsAndChordsWithAI } from './aiBrain';

export interface LyricsResearchResult {
  text: string;
  sources: { title: string; url: string; snippet: string }[];
  query: string;
}

const ROUTER_URL = (import.meta as any).env?.VITE_NINEROUTER_URL || 'http://localhost:20128';

async function searchWeb(query: string): Promise<LyricsResearchResult['sources']> {
  const response = await fetch(`${ROUTER_URL}/v1/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'tavily',
      query,
      max_results: 8,
      domain_filter: ['tabs.ultimate-guitar.com', 'chordify.net', 'songsterr.com', 'tabs4acoustic.com'],
    }),
  });
  if (!response.ok) throw new Error(`Web search HTTP ${response.status}`);
  const data = await response.json();
  return (data.results || []).map((item: any) => ({
    title: String(item.title || ''),
    url: String(item.url || ''),
    snippet: String(item.snippet || item.content || ''),
  })).filter((item: LyricsResearchResult['sources'][number]) => item.url);
}

export async function researchLyricsAndChords(
  title: string,
  artist: string,
): Promise<LyricsResearchResult> {
  const query = `"${title}" "${artist}" lyrics chords tabs Ultimate Guitar`;
  let sources: LyricsResearchResult['sources'] = [];
  try {
    sources = await searchWeb(query);
  } catch {
    // Local 9Router may not have a web provider configured. AI still gets a bounded request.
  }

  const sourceContext = sources.length
    ? sources.map((source, index) => `${index + 1}. ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`).join('\n\n')
    : 'Tidak ada hasil web yang dapat diverifikasi. Jangan mengarang sumber atau lirik.';

  const prompt = `Anda editor chord sheet untuk latihan band.
Judul: "${title}"
Artis: "${artist}"

Hasil pencarian web:
${sourceContext}

Tugas:
1. Gunakan hanya fakta yang ada pada hasil pencarian.
2. Prioritaskan tabs.ultimate-guitar.com, lalu Chordify atau Songsterr.
3. Susun bagian lagu dan chord yang ditemukan dalam format teks sederhana:
[Intro]
[C] [G] [Am] [F]
[Verse]
[Chord] teks yang tersedia
4. Jangan mengarang lirik penuh. Jika snippet tidak cukup, tulis [Lirik tidak tersedia dari hasil pencarian] dan pertahankan chord yang ditemukan.
5. Jangan membuat URL, BPM, chord, atau lirik yang tidak didukung sumber.
6. Keluarkan hanya chord sheet, tanpa disclaimer panjang.`;

  const text = await generateLyricsAndChordsWithAI(title, artist, prompt);
  return { text: text || '', sources, query };
}
