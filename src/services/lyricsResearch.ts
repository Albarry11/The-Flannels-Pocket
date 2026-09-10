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

  const prompt = `Anda adalah formatter dan editor chord sheet untuk latihan band.
PENTING & WAJIB:
- Anda DILARANG KERAS mengarang, membuat, atau menebak lirik dari imajinasi/halusinasi.
- Ambil HANYA lirik dan chord nyata yang tertera pada kutipan hasil pencarian web di bawah ini.
- Tugas Anda semata-mata MENYUSUN dan MERAPIKAN susunan format agar rapi dan siap dimainkan musisi.

Judul: "${title}"
Artis: "${artist}"

Kutipan Hasil Pencarian Web:
${sourceContext}

Aturan Penataan Format:
1. Susun chord dan lirik yang ditemukan ke dalam struktur standar: [Intro], [Verse], [Chorus], [Bridge], [Outro].
2. Letakkan nama akord di dalam kurung siku tepat di atas atau di depan kata lirik yang bersangkutan, misal: [C] [G] [Am] [F].
3. Jika lirik pada bagian tertentu tidak ditemukan dalam kutipan web, tulis secara jujur: [Lirik belum tersedia dari pencarian web]. JANGAN mengarang kata-kata pengganti!
4. Jangan menambahkan disclaimer panjang, catatan pembuka, atau basa-basi. Keluarkan HANYA hasil format chord sheet.`;

  const text = await generateLyricsAndChordsWithAI(title, artist, prompt);
  return { text: text || '', sources, query };
}
