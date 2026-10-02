/**
 * @fileoverview Robust client-side file validation using binary magic bytes inspection
 * for JPEG, PNG, WebP, TIFF, and HEIC/AVIF container formats.
 */

import type { FileValidationResult } from '../types/metadata.js';
import { formatBytes } from './utils.js';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Known compatible HEIC/AVIF brands in the ftyp box.
 */
const KNOWN_FTYP_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'heim',
  'heis',
  'mif1',
  'msf1',
  'avif',
  'avis'
]);

/**
 * Detect image format by examining the leading header magic bytes.
 *
 * @param {Uint8Array} bytes - First 12 to 64 bytes of the candidate file.
 * @returns {string | null} Detected format ('JPEG', 'PNG', 'WEBP', 'TIFF', 'HEIC', 'AVIF') or null if unknown.
 */
export function detectImageFormat(bytes: Uint8Array): string | null {
  if (!bytes || bytes.length < 4) return null;

  // 1. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'JPEG';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'PNG';
  }

  // 3. WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46 && // 'F'
    bytes[8] === 0x57 && // 'W'
    bytes[9] === 0x45 && // 'E'
    bytes[10] === 0x42 && // 'B'
    bytes[11] === 0x50 // 'P'
  ) {
    return 'WEBP';
  }

  // 4. TIFF: Little-endian ('II*\0') or Big-endian ('MM\0*')
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
  ) {
    return 'TIFF';
  }

  // 5. HEIC / AVIF: ISOBMFF ftyp box at offset 4
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && // 'f'
    bytes[5] === 0x74 && // 't'
    bytes[6] === 0x79 && // 'y'
    bytes[7] === 0x70 // 'p'
  ) {
    // Read major brand (bytes 8-11)
    const majorBrand = String.fromCharCode(
      bytes[8] ?? 0,
      bytes[9] ?? 0,
      bytes[10] ?? 0,
      bytes[11] ?? 0
    ).toLowerCase();

    if (majorBrand.includes('avif') || majorBrand.includes('avis')) {
      return 'AVIF';
    }
    if (KNOWN_FTYP_BRANDS.has(majorBrand)) {
      return 'HEIC';
    }

    // Inspect compatible brands up to byte 64
    const limit = Math.min(bytes.length, 64);
    for (let i = 16; i + 4 <= limit; i += 4) {
      const compBrand = String.fromCharCode(
        bytes[i] ?? 0,
        bytes[i + 1] ?? 0,
        bytes[i + 2] ?? 0,
        bytes[i + 3] ?? 0
      ).toLowerCase();

      if (compBrand.includes('avif') || compBrand.includes('avis')) {
        return 'AVIF';
      }
      if (KNOWN_FTYP_BRANDS.has(compBrand)) {
        return 'HEIC';
      }
    }
  }

  return null;
}

/**
 * Validate a candidate file against size limit and genuine binary magic bytes.
 *
 * @param {File} file - File selected by user.
 * @returns {Promise<FileValidationResult>} Validation status and Indonesian error message if invalid.
 */
export async function validateFileWithMagicBytes(file: File): Promise<FileValidationResult> {
  if (!file) {
    return {
      valid: false,
      error: 'Tidak ada file yang dipilih.'
    };
  }

  // 1. File Size Validation (Max 25 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran file terlalu besar (maksimal 25 MB). File Anda berukuran ${formatBytes(file.size)}.`
    };
  }

  if (file.size < 4) {
    return {
      valid: false,
      error: 'File gambar kosong atau rusak.'
    };
  }

  // 2. Binary Magic Bytes Validation
  try {
    const headerSlice = file.slice(0, 64);
    const buffer = await headerSlice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const detectedFormat = detectImageFormat(bytes);

    if (!detectedFormat) {
      return {
        valid: false,
        error:
          'Format file tidak didukung atau isi berkas tidak valid. Harap pilih gambar JPEG, PNG, WebP, HEIC, atau TIFF yang valid.'
      };
    }

    return {
      valid: true,
      detectedFormat
    };
  } catch (err) {
    console.error('Gagal membaca magic bytes file:', err);
    return {
      valid: false,
      error: 'Gagal memverifikasi format file gambar. Pastikan file tidak terkunci atau rusak.'
    };
  }
}
