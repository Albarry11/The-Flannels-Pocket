import type { LrcLine } from '../types';

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function parseLrc(rawText: string): LrcLine[] {
  if (!rawText) return [];
  const lines = rawText.split('\n');
  const result: LrcLine[] = [];
  const lrcRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const match = trimmed.match(lrcRegex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const totalSeconds = min * 60 + sec + ms / 1000;
      const textWithChords = match[4].trim();

      const chords: { chord: string; position: number }[] = [];
      let cleanText = '';
      let chordRegex = /\[([A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[9]?|[0-9])*)\]/g;
      let lastIndex = 0;
      let chordMatch;

      while ((chordMatch = chordRegex.exec(textWithChords)) !== null) {
        cleanText += textWithChords.slice(lastIndex, chordMatch.index);
        chords.push({
          chord: chordMatch[1],
          position: cleanText.length,
        });
        lastIndex = chordRegex.lastIndex;
      }
      cleanText += textWithChords.slice(lastIndex);

      result.push({
        id: `line-${idx}-${totalSeconds}`,
        time: totalSeconds,
        text: cleanText || textWithChords,
        chords: chords.length > 0 ? chords : undefined,
      });
    } else if (!trimmed.startsWith('[')) {
      // Line without timestamps
      result.push({
        id: `line-${idx}`,
        time: idx * 4, // fallback estimation
        text: trimmed,
      });
    }
  });

  return result.sort((a, b) => a.time - b.time);
}

function transposeSingleChord(chord: string, semitones: number): string {
  if (!semitones) return chord;
  const match = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  let index = NOTES_SHARP.indexOf(root);
  if (index === -1) {
    index = NOTES_FLAT.indexOf(root);
  }
  if (index === -1) return chord;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  const newRoot = NOTES_SHARP[newIndex];
  return `${newRoot}${suffix}`;
}

export function transposeChord(chord: string, semitones: number): string {
  if (!semitones) return chord;
  if (chord.includes('/')) {
    const parts = chord.split('/');
    return `${transposeSingleChord(parts[0], semitones)}/${transposeSingleChord(parts[1], semitones)}`;
  }
  return transposeSingleChord(chord, semitones);
}

/**
 * Transpose all [Chord] instances in a block of lyrics/chords text
 */
export function transposeLyricsText(text: string, semitones: number): string {
  if (!semitones || !text) return text;
  const chordRegex = /\[([A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[9]?|[0-9])*(?:\/[A-G][b#]?)?)\]/g;
  return text.replace(chordRegex, (_, chord) => {
    return `[${transposeChord(chord, semitones)}]`;
  });
}

export function formatSecondsToTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
