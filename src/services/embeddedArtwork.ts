/**
 * Extracts embedded cover art (ID3v2 APIC or FLAC METADATA_BLOCK_PICTURE)
 * directly from uploaded audio files (MP3, FLAC, M4A, OGG)
 * exactly like Windows File Explorer does!
 */
export async function extractEmbeddedArtwork(file: File): Promise<string | null> {
  try {
    // Read first 2MB which contains ID3 tags or FLAC metadata headers
    const slice = file.slice(0, Math.min(file.size, 2 * 1024 * 1024));
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Check for MP3 ID3v2 tag (magic "ID3")
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const art = extractID3Artwork(bytes);
      if (art) return art;
    }

    // 2. Check for FLAC header (magic "fLaC")
    if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
      const art = extractFlacArtwork(bytes);
      if (art) return art;
    }

    // 3. Scan for raw JPEG/PNG signatures in the metadata header
    return scanForImageSignature(bytes);
  } catch (err) {
    console.warn('Failed to extract embedded artwork:', err);
    return null;
  }
}

function extractID3Artwork(bytes: Uint8Array): string | null {
  // Search for APIC frame (Attached Picture)
  for (let i = 10; i < bytes.length - 20; i++) {
    if (
      bytes[i] === 0x41 && // 'A'
      bytes[i + 1] === 0x50 && // 'P'
      bytes[i + 2] === 0x49 && // 'I'
      bytes[i + 3] === 0x43    // 'C'
    ) {
      // APIC found! Frame size is 4 bytes at i+4
      const frameSize =
        (bytes[i + 4] << 24) |
        (bytes[i + 5] << 16) |
        (bytes[i + 6] << 8) |
        bytes[i + 7];

      if (frameSize > 100 && i + 10 + frameSize <= bytes.length) {
        // Search image start inside APIC frame (JPEG 0xFFD8 or PNG 0x89504E47)
        const frameBytes = bytes.subarray(i + 10, i + 10 + frameSize);
        return scanForImageSignature(frameBytes);
      }
    }
  }
  return null;
}

function extractFlacArtwork(bytes: Uint8Array): string | null {
  let offset = 4; // Skip "fLaC"
  while (offset < bytes.length - 4) {
    const isLast = (bytes[offset] & 0x80) !== 0;
    const blockType = bytes[offset] & 0x7f;
    const length =
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];

    offset += 4;

    if (blockType === 6) {
      // PICTURE block
      const picBytes = bytes.subarray(offset, offset + length);
      return scanForImageSignature(picBytes);
    }

    offset += length;
    if (isLast) break;
  }
  return null;
}

function scanForImageSignature(bytes: Uint8Array): string | null {
  for (let i = 0; i < bytes.length - 8; i++) {
    // JPEG signature: FF D8 FF
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      // Find JPEG End of Image (FF D9)
      let endIdx = bytes.length;
      for (let j = i + 100; j < bytes.length - 1; j++) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          endIdx = j + 2;
          break;
        }
      }
      const imgBytes = bytes.subarray(i, endIdx);
      const blob = new Blob([imgBytes as unknown as BlobPart], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[i] === 0x89 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x4e &&
      bytes[i + 3] === 0x47 &&
      bytes[i + 4] === 0x0d &&
      bytes[i + 5] === 0x0a &&
      bytes[i + 6] === 0x1a &&
      bytes[i + 7] === 0x0a
    ) {
      let endIdx = bytes.length;
      for (let j = i + 8; j < bytes.length - 7; j++) {
        // IEND chunk
        if (
          bytes[j] === 0x49 &&
          bytes[j + 1] === 0x45 &&
          bytes[j + 2] === 0x4e &&
          bytes[j + 3] === 0x44
        ) {
          endIdx = j + 8;
          break;
        }
      }
      const imgBytes = bytes.subarray(i, endIdx);
      const blob = new Blob([imgBytes as unknown as BlobPart], { type: 'image/png' });
      return URL.createObjectURL(blob);
    }
  }
  return null;
}
