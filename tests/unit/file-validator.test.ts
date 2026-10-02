import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { detectImageFormat, validateFileWithMagicBytes } from '../../src/js/file-validator.js';

describe('file-validator (Magic Bytes Validation)', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('accurately identifies JPEG magic bytes (FF D8 FF)', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10]);
    expect(detectImageFormat(bytes)).toBe('JPEG');
  });

  it('accurately identifies PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageFormat(bytes)).toBe('PNG');
  });

  it('accurately identifies WebP magic bytes (RIFF ... WEBP)', () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
    ]);
    expect(detectImageFormat(bytes)).toBe('WEBP');
  });

  it('accurately identifies TIFF magic bytes (Little-endian and Big-endian)', () => {
    const leTiff = new Uint8Array([0x49, 0x49, 0x2a, 0x00]);
    expect(detectImageFormat(leTiff)).toBe('TIFF');

    const beTiff = new Uint8Array([0x4d, 0x4d, 0x00, 0x2a]);
    expect(detectImageFormat(beTiff)).toBe('TIFF');
  });

  it('accurately identifies HEIC and AVIF ftyp headers', () => {
    // ISOBMFF ftyp heic: ....ftypheic
    const heicBytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63
    ]);
    expect(detectImageFormat(heicBytes)).toBe('HEIC');

    // ISOBMFF ftyp avif: ....ftypavif
    const avifBytes = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66
    ]);
    expect(detectImageFormat(avifBytes)).toBe('AVIF');
  });

  it('validates a real JPEG file from fixtures', async () => {
    const jpegBuffer = fs.readFileSync(path.join(fixturesDir, 'sample-with-exif.jpg'));
    const file = new File([jpegBuffer], 'sample.jpg', { type: 'image/jpeg' });

    const result = await validateFileWithMagicBytes(file);
    expect(result.valid).toBe(true);
    expect(result.detectedFormat).toBe('JPEG');
  });

  it('validates a real PNG file from fixtures', async () => {
    const pngBuffer = fs.readFileSync(path.join(fixturesDir, 'sample-plain.png'));
    const file = new File([pngBuffer], 'sample.png', { type: 'image/png' });

    const result = await validateFileWithMagicBytes(file);
    expect(result.valid).toBe(true);
    expect(result.detectedFormat).toBe('PNG');
  });

  it('validates a real WebP file from fixtures', async () => {
    const webpBuffer = fs.readFileSync(path.join(fixturesDir, 'sample-webp.webp'));
    const file = new File([webpBuffer], 'sample.webp', { type: 'image/webp' });

    const result = await validateFileWithMagicBytes(file);
    expect(result.valid).toBe(true);
    expect(result.detectedFormat).toBe('WEBP');
  });

  it('rejects invalid non-image files with Indonesian error message', async () => {
    const textBuffer = fs.readFileSync(path.join(fixturesDir, 'sample-invalid.txt'));
    const file = new File([textBuffer], 'fake.jpg', { type: 'image/jpeg' }); // spoofed extension

    const result = await validateFileWithMagicBytes(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Format file tidak didukung');
  });

  it('rejects files exceeding 25 MB size limit', async () => {
    // Create a mock large file descriptor
    const mockBigFile = {
      size: 26 * 1024 * 1024,
      name: 'large.jpg',
      type: 'image/jpeg',
      slice: () => new Blob()
    } as unknown as File;

    const result = await validateFileWithMagicBytes(mockBigFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('25 MB');
  });
});
