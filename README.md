# The Flannels Pocket 🎸🥁🎤

**The Flannels Pocket** adalah platform pemutar multi-track, isolasi stem audio, dan workstation latihan band web yang dirancang khusus untuk personil band **The Flannels** (Vokalis, Drummer, Gitaris Lead, Gitaris Rhythm, dan Bassist).

Aplikasi ini dapat dijalankan langsung di browser desktop maupun mobile (iPhone/Android) tanpa perlu login/register, dan siap dideploy secara gratis di Vercel, Netlify, Cloudflare Pages, atau GitHub Pages.

---

## Fitur Utama

### 1. Multi-Track Stem Isolation Player
- **Stem Terpisah per Personil**:
  - 🎤 **Vocal** (Vokalis)
  - 🎸 **Lead Guitar** (Gitaris Lead)
  - 🎸 **Rhythm Guitar** (Gitaris Rhythm)
  - 🎸 **Bass** (Bassist)
  - 🥁 **Drums** (Drummer)
  - 🎚️ **Backing / Other**
- **Mute & Solo Fleksibel**:
  - Tombol **Mute (M)** pada tiap track untuk mematikan instrumen tertentu.
  - Tombol **Solo (S)** untuk mengisolasi satu instrumen saat ngulik.
  - Dukungan **Multi-Solo** (misal: solo Bass + Drums secara bersamaan untuk latihan rhythm section).
- **Shortcut Cepat**:
  - Tombol *Vokal Solo*, *Bass + Drums Solo*, dan *Unmute All*.
- **Kontrol Fader & Panning**: Volume slider (0 - 100%) dan stereo panner (L50 - Center - R50) per stem track.
- **Visual LED VU Meter**: Indikator level visual dinamis real-time per stem.
- **Waveform Interaktif**: Visualisasi bentuk gelombang per channel untuk melompat (seek) ke bar atau ketukan tertentu.

### 2. Master Transport & Fitur Kulik Lanjutan
- **A-B Looper**: Tandai titik Awal (A) dan titik Akhir (B) untuk mengulang-ulang (looping) bagian solo gitar, drum fill, atau vokal yang sulit secara presisi.
- **Pitch Transpose / Key Shift**: Ubah nada dasar lagu dari -6 hingga +6 semitone. Sangat berguna jika lagu cover perlu disesuaikan dengan jangkauan nada vokalis.
- **Speed / Tempo Multiplier**: Pelankan tempo (0.50x, 0.75x, 0.90x) untuk membedah bagian lagu yang cepat, atau naikkan tempo hingga 1.50x.
- **Sinkronisasi Sample-Accurate**: Didukung Web Audio API sehingga tidak ada latency drift antar stem.

### 3. Metronome Akurat (No Drift)
- Dibangun di atas clock presisi Web Audio API `currentTime` dengan lookahead scheduler (tidak terpengaruh lag browser atau perpindahan tab).
- Deteksi dan tampilan BPM lagu saat ini.
- **Tap Tempo**: Ketuk ritme untuk menemukan BPM lagu secara cepat.
- **Aksen Birama Visual & Audio**: Pilihan birama (4/4, 3/4, 6/8, 2/4) dengan ketukan pertama (downbeat) beraksen neon dan frekuensi khusus.
- **4 Pilihan Suara**: Woodblock akustik, 808 Beep elektronik, Rimshot drum, dan Cowbell.

### 4. Adopsi Fitur SpotiFLAC
Mengadopsi dan mengimplementasikan fitur analisis audio dari aplikasi SpotiFLAC:
- **Penganalisis Kualitas Audio (Lossless FLAC Inspector)**:
  - Analisis spektral frekuensi tinggi (High-Frequency Roll-Off) berbasis FFT 4096-titik.
  - Verifikasi file Lossless asli (energi frekuensi mencapai 20 kHz - 22.05 kHz) vs transcode lossy (cutoff 16 kHz untuk MP3 128k, cutoff 18.5 kHz untuk MP3 192k).
  - Spektrogram FFT interaktif real-time 20 Hz - 22 kHz.
  - Metrik teknis: Sample Rate (44.1 kHz / 48 kHz / 96 kHz), estimasi Bit Depth (16-bit / 24-bit), Channels, Dynamic Range (DR score), Peak dBFS, dan RMS dBFS.
- **Penganalisis BPM & Tangga Nada (Musical Key & Scale Analyzer)**:
  - Algoritma autokorelasi envelope energi untuk deteksi BPM otomatis.
  - Ekstraksi vektor Pitch Class Profile (Chroma 12 nada) dan pencocokan profil kunci Krumhansl-Schmuckler (24 tangga nada mayor dan minor).
  - Penentuan kode Camelot Wheel (misal: 9A untuk E Minor, 8B untuk C Major) untuk panduan harmonisasi band.
- **ReplayGain & Kelantangan (ITU-R BS.1770 / EBU R128)**:
  - Pengukuran Integrated Loudness (LUFS) dan True Peak (dBTP).
  - Rekomendasi gain offset (dB) untuk target normalisasi -14 LUFS standar platform musik.
  - Tombol Auto ReplayGain Compensation untuk menyamakan kenyaringan audio.
- **Manajer File & Unggah Stem FLAC (Penyimpanan Offline IndexedDB)**:
  - Pengelolaan koleksi lagu latihan band yang tersimpan di IndexedDB browser.
  - Formulir unggah multi-file audio (FLAC, WAV, MP3, OGG, AAC) dengan pemetaan instrumen otomatis (Vokal, Lead, Rhythm, Bass, Drums).
  - Dilengkapi 2 lagu demo bawaan studio The Flannels (*Midnight Groove* dan *Sunset Drive*) yang langsung dapat dimainkan saat website pertama kali dibuka.
- **Manajer Lirik & Chord Sheet**:
  - Penampil lirik karaoke tersinkronisasi bar per bar (format LRC).
  - Klik baris lirik mana pun untuk melompatkan playback lagu ke titik tersebut.
  - **Transposisi Akord Otomatis**: Akord yang ditulis di dalam lirik (misal: `[Em]`, `[Am7]`) otomatis ikut berubah saat pitch master dinaikkan/diturunkan!
  - Editor lirik terintegrasi dengan tombol instan *Insert Timestamp*.

---

## Struktur Folder

```
The-Flannels-Pocket/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions untuk deploy otomatis ke GitHub Pages
├── public/
│   └── favicon.svg             # Favicon audio The Flannels
├── src/
│   ├── components/
│   │   ├── AnalyzerModal.tsx    # Modal Penganalisis Kualitas, BPM, Key & ReplayGain
│   │   ├── FileManagerModal.tsx # Modal Manajer File & Unggah Stem FLAC
│   │   ├── Header.tsx           # Navigasi atas, info lagu & shortcut solo
│   │   ├── LyricsModal.tsx      # Modal Manajer Lirik & Transposisi Chord
│   │   ├── MasterPlayer.tsx     # Player bawah: Play/Pause, Seekbar, Looper, Pitch, Speed
│   │   ├── MetronomeDrawer.tsx  # Drawer metronome akurat & tap tempo
│   │   └── StemTrackList.tsx    # Channel strips: Vocal, Lead, Rhythm, Bass, Drums
│   ├── services/
│   │   ├── audioAnalyzer.ts     # Engine analisa FFT, Cutoff FLAC, Key Chroma, LUFS
│   │   ├── audioEngine.ts       # Web Audio API multi-track mixer & sync
│   │   ├── lyricsManager.ts     # Parser LRC & transposer akord musik
│   │   ├── metronomeEngine.ts   # Web Audio lookahead metronome scheduler
│   │   ├── proceduralSongs.ts   # Generator audio multi-track bawaan studio
│   │   └── storage.ts           # IndexedDB persistence (idb-keyval)
│   ├── types/
│   │   └── index.ts             # TypeScript interface & types
│   ├── App.tsx                  # Root state & workflow
│   ├── index.css                # Tailwind base & dark theme styling
│   └── main.tsx                 # Entrypoint React
├── index.html                   # HTML template mobile-first
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Cara Menjalankan di Komputer Lokal

1. **Clone repositori**:
   ```bash
   git clone https://github.com/Albarry11/The-Flannels-Pocket.git
   cd The-Flannels-Pocket
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (dev)**:
   ```bash
   npm run dev
   ```
   Buka URL yang muncul di terminal (biasanya `http://localhost:5173`) di browser desktop atau mobile.

4. **Build untuk produksi**:
   ```bash
   npm run build
   ```

---

## Cara Deploy Gratis

### Opsi A: Vercel (Paling Direkomendasikan - Cepat & Gratis)
1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub.
2. Klik **Add New Project**, lalu pilih repositori **`Albarry11/The-Flannels-Pocket`**.
3. Vercel akan mendeteksi framework Vite secara otomatis.
4. Klik **Deploy**. Website langsung aktif dengan URL HTTPS gratis dan performa tinggi yang bisa langsung diakses semua personil band.

### Opsi B: Cloudflare Pages / Netlify
1. Buka dashboard Cloudflare Pages atau Netlify.
2. Hubungkan akun GitHub dan pilih repositori `The-Flannels-Pocket`.
3. Set Build command: `npm run build` dan Build output directory: `dist`.
4. Klik Deploy.

### Opsi C: GitHub Pages
1. Workflow GitHub Actions sudah otomatis disertakan di `.github/workflows/deploy.yml`.
2. Di repositori GitHub: buka menu **Settings** > **Pages**.
3. Pada bagian **Build and deployment**, ubah Source menjadi **GitHub Actions**.
4. Setiap kali ada push ke branch `main`, website akan otomatis ter-deploy.
