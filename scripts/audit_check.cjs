const fs = require('fs');
const path = require('path');

console.log('=== AUDIT TEST: THE FLANNELS POCKET ===');

// 1. Check critical source files
const files = [
  'src/App.tsx',
  'src/components/Header.tsx',
  'src/components/MasterPlayer.tsx',
  'src/components/VerticalStemMixer.tsx',
  'src/components/CoverSongLibrary.tsx',
  'src/components/LyricsManager.tsx',
  'src/components/AIBrainAndAnalyzer.tsx',
  'src/services/audioEngine.ts',
  'src/services/stemSeparator.ts',
  'src/services/aiBrain.ts',
  'src/services/storage.ts',
  'src/services/embeddedArtwork.ts'
];

let allExist = true;
files.forEach(f => {
  const full = path.join(__dirname, '..', f);
  if (!fs.existsSync(full)) {
    console.error('FAIL: Missing file', f);
    allExist = false;
  } else {
    const size = fs.statSync(full).size;
    console.log(`PASS: ${f} (${size} bytes)`);
  }
});

// 2. Check em-dash check (User profile rule: Jangan pakai karakter em-dash (—))
let emDashFound = 0;
files.forEach(f => {
  const full = path.join(__dirname, '..', f);
  if (fs.existsSync(full)) {
    const content = fs.readFileSync(full, 'utf8');
    const matches = content.match(/\u2014/g);
    if (matches) {
      console.warn(`WARN: Em-dash found in ${f} (${matches.length} times)`);
      emDashFound += matches.length;
    }
  }
});
if (emDashFound === 0) {
  console.log('PASS: Zero em-dashes found across codebase');
}

console.log('Audit script finished.');
