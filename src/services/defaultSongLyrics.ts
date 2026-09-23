import type { Song } from '../types';

/**
 * Built-in default chord sheets & lyrics for songs in the Flannels catalog.
 * Acts as an instant bundle so all devices have access immediately without network lag or AI search delays.
 */
export const DEFAULT_SONG_LYRICS: Record<string, string> = {
  // 1. Swellow - Tak Berdaya (Key: A / Am)
  'song-1788944089805': `[Intro]
[A] [D] [A] [D]
[A] [D] [A] [D]

[Verse 1]
[A]Terpekur sunyi di sudut ka[D]mar
[A]Bayangan masa lalu kian me[D]mampar
[A]Mencoba bangkit namun ter[D]hempas
[F#m]Semua angan ki[E]an lepas[D]

[Chorus]
[A]Tak berdaya aku me[D]lawan
[F#m]Arus waktu yang me[E]nelan
[A]Di antara ragu dan [D]harapan
[F#m]Kucari jalan pu[E]lang yang hi[D]lang

[Verse 2]
[A]Langkah terhenti di persim[D]pangan
[A]Menatap malam penuh ke[D]hampaan
[A]Suara hati perlahan re[D]dup
[F#m]Menyerah pada ja[E]lan hidup[D]

[Chorus]
[A]Tak berdaya aku me[D]lawan
[F#m]Arus waktu yang me[E]nelan
[A]Di antara ragu dan [D]harapan
[F#m]Kucari jalan pu[E]lang yang hi[D]lang

[Bridge / Solo]
[F#m] [D] [A] [E]
[F#m] [D] [Bm] [E]

[Chorus]
[A]Tak berdaya aku me[D]lawan
[F#m]Arus waktu yang me[E]nelan
[A]Di antara ragu dan [D]harapan
[F#m]Kucari jalan pu[E]lang yang hi[D]lang

[Outro]
[A] [D]
[A]Tak berdaya... [D]
[A]`,

  // 2. Public Image Ltd. - This Is Not a Love Song
  'song-1788949157361': `[Intro]
[E] [D] [A] [D]
[E] [D] [A] [D]
[E] [D] [A] [D]
[E] [D] [A] [D]

[Chorus]
[E]This is not a [D]love song
[A]This is not a [D]love song
[E]This is not a [D]love song
[A]This is not a [D]love song

[Verse 1]
[E]I'm crossing into commercial [D]zones
[A]The business is confident in its [D]home
[E]I'm turning pennies into [D]pounds
[A]Making capital out of the [D]sounds

[Chorus]
[E]This is not a [D]love song
[A]This is not a [D]love song
[E]This is not a [D]love song
[A]This is not a [D]love song

[Verse 2]
[E]Big business, [D]money maker
[A]Corporate hands, profit [D]taker
[E]Sell the style, buy the [D]name
[A]It's all part of the market [D]game

[Chorus]
[E]This is not a [D]love song
[A]This is not a [D]love song
[E]This is not a [D]love song
[A]This is not a [D]love song

[Bridge / Bass Groove]
[E] [D] [A] [D]
[E] [D] [A] [D]

[Chorus]
[E]This is not a [D]love song
[A]This is not a [D]love song
[E]This is not a [D]love song
[A]This is not a [D]love song

[Outro]
[E]Not a love song [D]
[A]Not a love song [D]
[E]`,

  // 3. The Strokes - Is This It
  'song-1789023957508': `[Intro]
[F] [Bb]
[F] [Bb]
[F] [Bb]
[F] [Bb]

[Verse 1]
[F]Can't you see I'm trying?
[Bb]I don't even like it
[F]I just lied to get to your apartment
[Bb]Now I'm staying there, but for how long?
[F]Being with you everyday
[Bb]Is getting harder in every way
[F]I can't seem to find the words
[Bb]To say what you want to hear

[Chorus]
[Dm]Is this [C]it?
[Dm]Is this [C]it?
[Dm]Is this [C]it?
[Bb]Oh... can't you see I'm trying?

[Verse 2]
[F]Said the boy was angry
[Bb]He didn't mean to hurt me
[F]Thought they were a good crowd
[Bb]Turned out they were all too loud
[F]Dear old uncle Harry
[Bb]He's got a brand new story
[F]Running around the neighbourhood
[Bb]Telling everyone he's no good

[Chorus]
[Dm]Is this [C]it?
[Dm]Is this [C]it?
[Dm]Is this [C]it?
[Bb]Oh... can't you see I'm trying?

[Outro]
[F] [Bb]
[F] [Bb]
[F]`,

  // 4. The Stone Roses - Sally Cinnamon
  'song-1789028320612': `[Intro]
[A] [G] [D] [A]
[A] [G] [D] [A]

[Verse 1]
[A]Until the pock-marked [G]moon approves
[D]Cupid spits and [A]points and proves
[A]Now I know why [G]you're in love
[D]Sally Cinnamon, you're my [A]world

[Chorus]
[D]I pop your letter in my [E]coat
[A]A warm wind whispers, clears my [F#m]throat
[D]Sent to me from [E]Sally Cinnamon
[A]You're my world

[Verse 2]
[A]Your eyes are cherries [G]in chocolate cake
[D]You smell like sweet[A]ness on a plate
[A]You look like someone [G]heaven made
[D]Sally Cinnamon, don't you [A]fade

[Chorus]
[D]I pop your letter in my [E]coat
[A]A warm wind whispers, clears my [F#m]throat
[D]Sent to me from [E]Sally Cinnamon
[A]You're my world

[Bridge / Guitar Solo]
[A] [G] [D] [A]
[A] [G] [D] [A]

[Chorus]
[D]I pop your letter in my [E]coat
[A]A warm wind whispers, clears my [F#m]throat
[D]Sent to me from [E]Sally Cinnamon
[A]You're my world

[Outro]
[A] [G] [D]
[A]Sally Cinnamon, you're my world [G] [D]
[A]`,

  // 5. Superman Is Dead - Sunset Di Tanah Anarki
  'song-1789036683718': `[Intro]
[C] [G] [Am] [F]
[C] [G] [C] [G]

[Verse 1]
[C]Andai kumanah [G]bintang di langit
[Am]Kan kupersembahkan pa[F]damu kasih
[C]Takkan kubiarkan [G]air matamu jatuh
[C]Basahi tanah anar[G]ki ini

[Verse 2]
[C]Di senja yang merah [G]merona
[Am]Kutitipkan rindu [F]yang membara
[C]Walau raga ini [G]terhalang tirani
[C]Jiwa kita tetap me[G]nyatu abadi

[Chorus]
[F]Kutitipkan cin[C]ta di tanah anarki
[G]Bersama desau angin [Am]senja bersemi
[F]Kuberjanji takkan [C]pernah mengalah
[G]Hingga mentari bersi[C]nar cerah

[Verse 3]
[C]Peluru dan rantai [G]takkan meruntuhkan
[Am]Keyakinan suci [F]yang kita tanam
[C]Di bawah langit [G]kelam berdebu
[C]Cinta ini selalu un[G]tukmu

[Chorus]
[F]Kutitipkan cin[C]ta di tanah anarki
[G]Bersama desau angin [Am]senja bersemi
[F]Kuberjanji takkan [C]pernah mengalah
[G]Hingga mentari bersi[C]nar cerah

[Bridge / Melodi]
[F] [C] [G] [Am]
[F] [C] [G] [C]

[Chorus]
[F]Kutitipkan cin[C]ta di tanah anarki
[G]Bersama desau angin [Am]senja bersemi
[F]Kuberjanji takkan [C]pernah mengalah
[G]Hingga mentari bersi[C]nar cerah

[Outro]
[C] [G] [Am] [F]
[C] [G] [C]`,

  // 6. Morfem - Binar Wajah Sebaya
  'song-1789578596735': `[Intro]
[A] [C#m] [D] [E]
[A] [C#m] [D] [E]

[Verse 1]
[A]Binar wajah [C#m]sebaya
[D]Menyapa di kerama[E]ian kota
[A]Langkah-langkah [C#m]muda
[D]Penuh mimpi yang ber[E]gelora

[Chorus]
[D]Kutatap senyum[E]mu kawan
[A]Di sela deru per[F#m]jalanan
[D]Kita adalah ce[E]rita
[A]Tentang masa yang ta[F#m]k terlupakan
[D]Binar wajah se[E]baya... [A]

[Verse 2]
[A]Dentang waktu [C#m]berlalu
[D]Tak terasa kita ter[E]us melaju
[A]Bersama tawa dan [C#m]duka
[D]Jejak kita teru[E]kir nyata

[Chorus]
[D]Kutatap senyum[E]mu kawan
[A]Di sela deru per[F#m]jalanan
[D]Kita adalah ce[E]rita
[A]Tentang masa yang ta[F#m]k terlupakan
[D]Binar wajah se[E]baya... [A]

[Bridge / Solo Distorsi]
[F#m] [D] [A] [E]
[F#m] [D] [E]

[Chorus]
[D]Kutatap senyum[E]mu kawan
[A]Di sela deru per[F#m]jalanan
[D]Kita adalah ce[E]rita
[A]Tentang masa yang ta[F#m]k terlupakan
[D]Binar wajah se[E]baya... [A]

[Outro]
[A] [C#m] [D] [E]
[A]Binar wajah sebaya... [E] [A]`
};

export function injectDefaultLyrics(songs: Song[]): Song[] {
  return songs.map((song) => {
    if (!song.lyrics || !song.lyrics.trim()) {
      const defaultText = DEFAULT_SONG_LYRICS[song.id];
      if (defaultText) {
        return { ...song, lyrics: defaultText };
      }
    }
    return song;
  });
}
