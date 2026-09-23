import { generateLyricsAndChordsWithAI } from './aiBrain';

export interface LyricsResearchResult {
  text: string;
  sources: { title: string; url: string; snippet: string }[];
  query: string;
}

const ROUTER_URL = (import.meta as any).env?.VITE_NINEROUTER_URL || 'http://localhost:20128';

async function searchWeb(query: string): Promise<LyricsResearchResult['sources']> {
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Prevent CORS/Mixed Content error on Vercel production
  if (!isLocalhost && !((import.meta as any).env?.VITE_NINEROUTER_URL)) {
    return [];
  }

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
    : 'Hasil web langsung tidak tersedia. Gunakan database musikalitas asli lagu ini.';

  const prompt = `Anda adalah transkripter tab, chord, dan lirik musik profesional standar Ultimate Guitar & Chordify untuk latihan band.
Tugas Anda: Susun chord sheet dan lirik lengkap untuk lagu berikut:

Judul: "${title}"
Artis: "${artist}"

${sources.length ? `Referensi Web:\n${sourceContext}\n` : ''}
Aturan Penataan Format:
1. Susun chord dan lirik ke dalam struktur lagu standar: [Intro], [Verse 1], [Chorus], [Verse 2], [Bridge / Solo], [Outro].
2. Letakkan nama akord di dalam kurung siku tepat sebelum kata/suku kata yang bersangkutan, misal: [C] [G] [Am] [F].
3. Gunakan akord yang akurat (termasuk slash chord seperti [D/F#], [C/E]).
4. JANGAN sertakan disclaimer penolakan hak cipta, kata pengantar pembuka, atau basa-basi. Keluarkan HANYA chord sheet siap pakai.`;

  const text = await generateLyricsAndChordsWithAI(title, artist, prompt);
  return { text: text || '', sources, query };
}
