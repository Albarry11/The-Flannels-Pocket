import type { MusicSuggestion } from '../types';

/**
 * Searches music tracks with auto-complete suggestions.
 * Covers both national (Indonesian) and international songs, artists, and albums.
 * Uses iTunes Search API (fast, official album metadata, high-res artwork, 30s preview).
 */
export async function searchMusicSuggestions(query: string): Promise<MusicSuggestion[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  try {
    const encoded = encodeURIComponent(clean);
    const url = `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    const suggestions: MusicSuggestion[] = data.results.map((item: any) => {
      // Upscale artwork from 100x100 to 300x300 for crisp Frutiger Aero display
      const artwork = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb.jpg', '300x300bb.jpg')
        : undefined;

      const year = item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : undefined;

      return {
        title: item.trackName || clean,
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || 'Single',
        artworkUrl: artwork,
        previewUrl: item.previewUrl,
        releaseYear: year,
        genre: item.primaryGenreName,
      };
    });

    return suggestions;
  } catch (err) {
    console.warn('Music search error:', err);
    return [];
  }
}
