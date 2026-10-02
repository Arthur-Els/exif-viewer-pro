/**
 * @fileoverview Module for reading and parsing image metadata using `exifr`.
 * Produces a normalized, strongly-typed data object.
 */

import exifr from 'exifr';
import type { FileInfo, NaturalDimensions, NormalizedMetadata } from '../types/metadata.js';

/**
 * Attempt to extract natural image dimensions (width & height)
 * in the browser environment, regardless of whether EXIF contains dimension tags.
 *
 * @param {Blob | File} file - Image blob or file.
 * @returns {Promise<NaturalDimensions>} Dimensions.
 */
export async function getNaturalDimensions(file: Blob | File): Promise<NaturalDimensions> {
  if (typeof window === 'undefined') {
    return { width: null, height: null };
  }

  // Fast path: createImageBitmap (available in modern browsers & web workers)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dims;
    } catch {
      // Fallback below
    }
  }

  // DOM Image fallback (only in main thread where Image is defined)
  if (typeof Image !== 'undefined' && typeof URL !== 'undefined') {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        const width = img.naturalWidth || null;
        const height = img.naturalHeight || null;
        URL.revokeObjectURL(objectUrl);
        resolve({ width, height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: null, height: null });
      };

      img.src = objectUrl;
    });
  }

  return { width: null, height: null };
}

/**
 * Parse image metadata via `exifr` and combine with file attributes and fallback dimensions.
 *
 * @param {ArrayBuffer | Uint8Array | File | Blob} input - Image buffer or file object.
 * @param {Partial<FileInfo>} [customFileInfo] - Optional file attributes.
 * @param {NaturalDimensions} [customNaturalDims] - Optional pre-computed natural dimensions.
 * @returns {Promise<NormalizedMetadata>} Strongly typed structured metadata object.
 */
export async function parseMetadata(
  input: ArrayBuffer | Uint8Array | File | Blob,
  customFileInfo?: Partial<FileInfo>,
  customNaturalDims?: NaturalDimensions
): Promise<NormalizedMetadata> {
  if (!input) {
    throw new Error('Input tidak ditemukan untuk diproses.');
  }

  let inputBuffer: ArrayBuffer | Uint8Array = input as ArrayBuffer | Uint8Array;
  let fileInfo: FileInfo = {
    name: customFileInfo?.name ?? 'Tanpa Nama',
    type: customFileInfo?.type ?? 'image/jpeg',
    size: customFileInfo?.size ?? 0,
    lastModified: customFileInfo?.lastModified ?? Date.now()
  };

  // If input is File or Blob, extract buffer and metadata
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    if (typeof (input as File).name === 'string') {
      const f = input as File;
      fileInfo = {
        name: customFileInfo?.name ?? f.name,
        type: customFileInfo?.type ?? (f.type || 'image/jpeg'),
        size: customFileInfo?.size ?? f.size,
        lastModified: customFileInfo?.lastModified ?? (f.lastModified || Date.now())
      };
    }
    inputBuffer = await input.arrayBuffer();
  }

  let raw: Record<string, unknown> | null;
  try {
    // Parse all metadata segments: TIFF, EXIF, GPS, IPTC, XMP, ICC, JFIF, IHDR
    raw = (await exifr.parse(inputBuffer, {
      tiff: true,
      xmp: true,
      icc: true,
      iptc: true,
      jfif: true,
      ihdr: true,
      mergeOutput: true
    })) as Record<string, unknown> | null;
  } catch (err) {
    console.warn('Gagal membaca tag metadata dengan exifr:', err);
    raw = null;
  }

  // Attempt dedicated GPS extraction if available
  let gpsCoords: { latitude: number; longitude: number } | null;
  try {
    gpsCoords = (await exifr.gps(inputBuffer)) as { latitude: number; longitude: number } | null;
  } catch (err) {
    console.warn('Gagal membaca koordinat GPS:', err);
    gpsCoords = null;
  }

  const rawObj = raw || {};

  // Check if meaningful photographic metadata was found
  const meaningfulKeys = [
    'Make',
    'Model',
    'LensModel',
    'LensMake',
    'ExposureTime',
    'FNumber',
    'ISO',
    'FocalLength',
    'DateTimeOriginal',
    'CreateDate',
    'GPSLatitude',
    'latitude',
    'Software',
    'Orientation'
  ];

  const hasMetadata = meaningfulKeys.some((k) => rawObj[k] !== undefined && rawObj[k] !== null);

  // Fallback dimensions calculation
  let naturalDims = customNaturalDims ?? { width: null, height: null };
  if (
    !naturalDims.width &&
    !naturalDims.height &&
    typeof Blob !== 'undefined' &&
    input instanceof Blob
  ) {
    try {
      naturalDims = await getNaturalDimensions(input);
    } catch (err) {
      console.warn('Gagal membaca dimensi natural gambar:', err);
    }
  }

  // Normalize Dimensions
  const width =
    (rawObj['ExifImageWidth'] as number | undefined) ||
    (rawObj['ImageWidth'] as number | undefined) ||
    naturalDims.width ||
    null;

  const height =
    (rawObj['ExifImageHeight'] as number | undefined) ||
    (rawObj['ImageHeight'] as number | undefined) ||
    naturalDims.height ||
    null;

  let megapixels: string | null = null;
  if (width && height) {
    const mp = (width * height) / 1000000;
    megapixels = mp >= 1 ? `${mp.toFixed(1)} MP` : `${(mp * 1000).toFixed(0)} KP`;
  }

  // Normalize GPS Coordinates
  const latitude =
    gpsCoords?.latitude ?? (typeof rawObj['latitude'] === 'number' ? rawObj['latitude'] : null);
  const longitude =
    gpsCoords?.longitude ?? (typeof rawObj['longitude'] === 'number' ? rawObj['longitude'] : null);
  let altitude: number | null = null;
  if (rawObj['GPSAltitude'] !== undefined && rawObj['GPSAltitude'] !== null) {
    const parsedAlt =
      typeof rawObj['GPSAltitude'] === 'number'
        ? rawObj['GPSAltitude']
        : parseFloat(String(rawObj['GPSAltitude']));
    altitude = isNaN(parsedAlt) ? null : parsedAlt;
  }

  let osmUrl: string | null = null;
  if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
    osmUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=16/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
  }

  return {
    hasMetadata,
    raw: rawObj,
    file: fileInfo,
    camera: {
      make: (rawObj['Make'] as string | undefined) ?? null,
      model: (rawObj['Model'] as string | undefined) ?? null
    },
    lens: {
      model:
        (rawObj['LensModel'] as string | undefined) ??
        (rawObj['Lens'] as string | undefined) ??
        null,
      make: (rawObj['LensMake'] as string | undefined) ?? null
    },
    exposure: {
      iso:
        (rawObj['ISO'] as number | string | undefined) ??
        (rawObj['ISOSpeedRatings'] as number | string | undefined) ??
        null,
      fNumber:
        (rawObj['FNumber'] as number | undefined) ??
        (rawObj['ApertureValue'] as number | undefined) ??
        null,
      exposureTime:
        (rawObj['ExposureTime'] as number | undefined) ??
        (rawObj['ShutterSpeedValue'] as number | undefined) ??
        null,
      focalLength: (rawObj['FocalLength'] as number | undefined) ?? null,
      focalLengthIn35mm: (rawObj['FocalLengthIn35mmFormat'] as number | undefined) ?? null,
      flash: (rawObj['Flash'] as number | string | undefined) ?? null,
      exposureProgram: (rawObj['ExposureProgram'] as number | string | undefined) ?? null,
      exposureCompensation: (rawObj['ExposureCompensation'] as number | undefined) ?? null,
      whiteBalance: (rawObj['WhiteBalance'] as number | string | undefined) ?? null,
      meteringMode: (rawObj['MeteringMode'] as number | string | undefined) ?? null
    },
    date: {
      taken:
        (rawObj['DateTimeOriginal'] as Date | string | undefined) ??
        (rawObj['CreateDate'] as Date | string | undefined) ??
        (rawObj['DateTime'] as Date | string | undefined) ??
        null,
      modified: (rawObj['ModifyDate'] as Date | string | undefined) ?? null
    },
    dimensions: {
      width,
      height,
      orientation: (rawObj['Orientation'] as number | string | undefined) ?? null,
      megapixels
    },
    software:
      (rawObj['Software'] as string | undefined) ??
      (rawObj['ProcessingSoftware'] as string | undefined) ??
      null,
    gps: {
      latitude,
      longitude,
      altitude,
      osmUrl
    }
  };
}
