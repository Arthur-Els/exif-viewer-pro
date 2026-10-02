import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { parseMetadata } from '../../src/js/metadata-parser.js';

describe('metadata-parser', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  it('correctly parses all camera, lens, exposure, and GPS tags from sample-with-exif.jpg', async () => {
    const fixturePath = path.join(fixturesDir, 'sample-with-exif.jpg');
    const fileBuffer = fs.readFileSync(fixturePath);

    const result = await parseMetadata(fileBuffer, {
      name: 'sample-with-exif.jpg',
      type: 'image/jpeg',
      size: fileBuffer.length
    });

    expect(result.hasMetadata).toBe(true);

    // Camera
    expect(result.camera.make).toBe('Sony');
    expect(result.camera.model).toBe('ILCE-7RM4');

    // Lens
    expect(result.lens.model).toBe('FE 35mm F1.8');

    // Exposure
    expect(result.exposure.fNumber).toBe(1.8);
    expect(result.exposure.exposureTime).toBe(0.004);
    expect(result.exposure.iso).toBe(100);
    expect(result.exposure.focalLength).toBe(35);

    // GPS & OpenStreetMap Link
    expect(result.gps.latitude).toBeCloseTo(-6.208805, 4);
    expect(result.gps.longitude).toBeCloseTo(106.845611, 4);
    expect(result.gps.osmUrl).toContain('https://www.openstreetmap.org/?mlat=');
    expect(result.gps.osmUrl).toContain('-6.2088');

    // Software
    expect(result.software).toBe('Adobe Lightroom 12.0');
  });

  it('marks hasMetadata as false for images without EXIF tags (sample-plain.png)', async () => {
    const fixturePath = path.join(fixturesDir, 'sample-plain.png');
    const fileBuffer = fs.readFileSync(fixturePath);

    const result = await parseMetadata(fileBuffer, {
      name: 'sample-plain.png',
      type: 'image/png',
      size: fileBuffer.length
    });

    expect(result.hasMetadata).toBe(false);
    expect(result.file.name).toBe('sample-plain.png');
    expect(result.camera.make).toBeNull();
    expect(result.camera.model).toBeNull();
    expect(result.gps.latitude).toBeNull();
    expect(result.gps.longitude).toBeNull();
  });

  it('gracefully handles empty or corrupted buffers without throwing unhandled exceptions', async () => {
    const emptyBuffer = new Uint8Array(0);
    const result = await parseMetadata(emptyBuffer as unknown as ArrayBuffer);
    expect(result.hasMetadata).toBe(false);
    expect(result.camera.make).toBeNull();
    expect(result.camera.model).toBeNull();
  });

  it('rejects when input is missing or null', async () => {
    await expect(parseMetadata(null as unknown as ArrayBuffer)).rejects.toThrow(
      'Input tidak ditemukan'
    );
  });
});
