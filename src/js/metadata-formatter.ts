/**
 * @fileoverview Formats raw EXIF/metadata values into human-readable Indonesian text
 * (e.g. shutter speed "1/250 s", aperture "f/1.8", focal length "35 mm", GPS coordinates, etc.).
 */

import { formatBytes } from './utils.js';

/**
 * Format shutter speed / exposure time into human-friendly notation.
 *
 * @param {number|string|null|undefined} value - Raw exposure time in seconds.
 * @returns {string} Formatted shutter speed (e.g. "1/250 s", "2 s").
 */
export function formatExposureTime(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || num <= 0) {
    return String(value);
  }

  // Exposure time < 1 second -> express as fraction "1/x s"
  if (num < 1) {
    const denominator = Math.round(1 / num);
    return `1/${denominator} s`;
  }

  // Exact whole seconds or decimal seconds
  if (Number.isInteger(num)) {
    return `${num} s`;
  }

  return `${num.toFixed(1)} s`;
}

/**
 * Format aperture (f-number) into standard photography notation (e.g. "f/1.8").
 *
 * @param {number|string|null|undefined} value - Aperture f-number.
 * @returns {string} Formatted aperture.
 */
export function formatAperture(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || num <= 0) {
    const str = String(value);
    return str.startsWith('f/') ? str : `f/${str}`;
  }

  // Round to at most 1 decimal place if needed (e.g. 2.8, 1.4, 4)
  const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(1);
  return `f/${formatted}`;
}

/**
 * Format focal length and optional 35mm equivalent notation.
 *
 * @param {number|string|null|undefined} focalLength - Focal length in mm.
 * @param {number|string|null|undefined} [focalLength35mm] - 35mm equivalent in mm.
 * @returns {string} Formatted focal length (e.g. "35 mm (setara 52 mm full-frame)").
 */
export function formatFocalLength(
  focalLength: number | string | null | undefined,
  focalLength35mm?: number | string | null | undefined
): string {
  if (focalLength === null || focalLength === undefined || focalLength === '') return '-';

  const flNum = typeof focalLength === 'number' ? focalLength : parseFloat(String(focalLength));
  if (isNaN(flNum)) return String(focalLength);

  const base = `${parseFloat(flNum.toFixed(1))} mm`;

  if (focalLength35mm !== null && focalLength35mm !== undefined && focalLength35mm !== '') {
    const eqNum =
      typeof focalLength35mm === 'number' ? focalLength35mm : parseFloat(String(focalLength35mm));
    if (!isNaN(eqNum) && Math.round(eqNum) !== Math.round(flNum)) {
      return `${base} (setara ${Math.round(eqNum)} mm full-frame)`;
    }
  }

  return base;
}

/**
 * Format ISO sensitivity rating.
 *
 * @param {number|string|null|undefined} value - ISO value.
 * @returns {string} Formatted ISO (e.g. "ISO 400").
 */
export function formatISO(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const str = String(value).trim();
  if (str.toUpperCase().startsWith('ISO')) {
    return str;
  }
  return `ISO ${str}`;
}

/**
 * Format exposure compensation in Exposure Value (EV).
 *
 * @param {number|string|null|undefined} value - Exposure bias in EV.
 * @returns {string} Formatted EV (e.g. "+0.7 EV", "0 EV", "-1.0 EV").
 */
export function formatExposureCompensation(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);

  if (num === 0) return '0 EV';
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(1)} EV`;
}

/**
 * Translate EXIF Flash value into descriptive Indonesian text.
 *
 * @param {number|string|null|undefined} value - Flash code or description.
 * @returns {string} Indonesian flash description.
 */
export function formatFlash(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  if (typeof value === 'number') {
    const fired = (value & 0x01) !== 0;
    const mode = (value >> 3) & 0x03; // 1 = on, 2 = off, 3 = auto

    if (fired) {
      if (mode === 3) return 'Menyala, mode otomatis';
      return 'Menyala (Flash fired)';
    } else {
      if (mode === 3) return 'Mati, mode otomatis';
      return 'Mati (Flash did not fire)';
    }
  }

  const str = String(value).toLowerCase();
  if (str.includes('did not fire') || str.includes('off') || str === 'no') {
    return 'Mati (Flash did not fire)';
  }
  if (str.includes('fired') || str === 'yes') {
    return 'Menyala (Flash fired)';
  }

  return String(value);
}

/**
 * Translate Exposure Program code or string to Indonesian.
 *
 * @param {number|string|null|undefined} value - Program mode.
 * @returns {string} Indonesian program description.
 */
export function formatExposureProgram(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const programs: Record<number, string> = {
    0: 'Tidak Diketahui (Not defined)',
    1: 'Manual',
    2: 'Program AE (Otomatis Normal)',
    3: 'Prioritas Diafragma (Aperture Priority)',
    4: 'Prioritas Rana (Shutter Priority)',
    5: 'Program Kreatif (Kedalaman Ruang)',
    6: 'Program Aksi (Kecepatan Rana Cepat)',
    7: 'Mode Potret (Portrait)',
    8: 'Mode Lanskap (Landscape)'
  };

  if (typeof value === 'number' && programs[value]) {
    return programs[value]!;
  }

  const str = String(value).toLowerCase();
  if (str.includes('manual')) return 'Manual';
  if (str.includes('aperture')) return 'Prioritas Diafragma (Aperture Priority)';
  if (str.includes('shutter')) return 'Prioritas Rana (Shutter Priority)';
  if (str.includes('program') || str.includes('normal')) return 'Program AE (Otomatis Normal)';
  if (str.includes('portrait')) return 'Mode Potret (Portrait)';
  if (str.includes('landscape')) return 'Mode Lanskap (Landscape)';

  return String(value);
}

/**
 * Translate White Balance to Indonesian.
 *
 * @param {number|string|null|undefined} value - White balance.
 * @returns {string} Indonesian white balance.
 */
export function formatWhiteBalance(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  if (value === 0 || String(value).toLowerCase().includes('auto')) {
    return 'Otomatis (Auto)';
  }
  if (value === 1 || String(value).toLowerCase().includes('manual')) {
    return 'Manual';
  }

  return String(value);
}

/**
 * Translate Metering Mode to Indonesian.
 *
 * @param {number|string|null|undefined} value - Metering mode.
 * @returns {string} Indonesian metering description.
 */
export function formatMeteringMode(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const modes: Record<number, string> = {
    0: 'Tidak Diketahui',
    1: 'Rata-rata (Average)',
    2: 'Pusat Berbobot (Center-Weighted Average)',
    3: 'Titik (Spot)',
    4: 'Multi-Spot',
    5: 'Pola / Evaluatif (Pattern / Multi-segment)',
    6: 'Sebagian (Partial)'
  };

  if (typeof value === 'number' && modes[value]) {
    return modes[value]!;
  }

  const str = String(value).toLowerCase();
  if (str.includes('spot')) return 'Titik (Spot)';
  if (str.includes('center')) return 'Pusat Berbobot (Center-Weighted Average)';
  if (str.includes('pattern') || str.includes('evaluative') || str.includes('multi')) {
    return 'Pola / Evaluatif (Pattern / Multi-segment)';
  }
  if (str.includes('average')) return 'Rata-rata (Average)';
  if (str.includes('partial')) return 'Sebagian (Partial)';

  return String(value);
}

/**
 * Translate Orientation tag into human readable degree orientation.
 *
 * @param {number|string|null|undefined} value - Orientation tag.
 * @returns {string} Descriptive orientation.
 */
export function formatOrientation(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const orientations: Record<number, string> = {
    1: 'Normal (0°)',
    2: 'Dibalik Horizontal',
    3: 'Diputar 180°',
    4: 'Dibalik Vertikal',
    5: 'Dibalik Horizontal & Diputar 90° CCW',
    6: 'Diputar 90° CW (Searah jarum jam)',
    7: 'Dibalik Horizontal & Diputar 90° CW',
    8: 'Diputar 90° CCW (Berlawanan jarum jam)'
  };

  if (typeof value === 'number' && orientations[value]) {
    return orientations[value]!;
  }

  return String(value);
}

/**
 * Convert decimal latitude/longitude coordinate into Degrees, Minutes, Seconds (DMS) notation.
 *
 * @param {number|null|undefined} coordinate - Decimal degrees.
 * @param {'lat'|'lon'} type - Latitude or longitude.
 * @returns {string} DMS formatted string (e.g. `6° 12' 31.7" S (-6.2088°)`).
 */
export function formatCoordinate(
  coordinate: number | null | undefined,
  type: 'lat' | 'lon'
): string {
  if (coordinate === null || coordinate === undefined || isNaN(coordinate)) {
    return '-';
  }

  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  const direction =
    type === 'lat'
      ? coordinate >= 0
        ? 'N (Utara)'
        : 'S (Selatan)'
      : coordinate >= 0
        ? 'E (Timur)'
        : 'W (Barat)';

  return `${degrees}° ${minutes}' ${seconds}" ${direction} (${coordinate.toFixed(6)}°)`;
}

/**
 * Format altitude value.
 *
 * @param {number|string|null|undefined} altitude - Altitude in meters.
 * @returns {string} Formatted altitude.
 */
export function formatAltitude(altitude: number | string | null | undefined): string {
  if (altitude === null || altitude === undefined || altitude === '') return '-';

  const num = typeof altitude === 'number' ? altitude : parseFloat(String(altitude));
  if (isNaN(num)) return String(altitude);

  if (num >= 0) {
    return `${num.toFixed(1)} meter di atas permukaan laut`;
  }
  return `${Math.abs(num).toFixed(1)} meter di bawah permukaan laut`;
}

/**
 * Format full file size with both human-readable unit and exact bytes.
 *
 * @param {number|null|undefined} bytes - File size in bytes.
 * @returns {string} Formatted string.
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || isNaN(bytes)) return '-';
  const human = formatBytes(bytes);
  const formattedNumber = new Intl.NumberFormat('id-ID').format(bytes);
  return `${human} (${formattedNumber} byte)`;
}

/**
 * Format image dimensions (width x height) with megapixels.
 *
 * @param {number|null|undefined} width - Image width in px.
 * @param {number|null|undefined} height - Image height in px.
 * @param {string|null|undefined} [megapixels] - Megapixels notation.
 * @returns {string} Formatted dimensions string.
 */
export function formatDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
  megapixels?: string | null | undefined
): string {
  if (!width || !height) return '-';

  const formattedW = new Intl.NumberFormat('id-ID').format(width);
  const formattedH = new Intl.NumberFormat('id-ID').format(height);
  const base = `${formattedW} × ${formattedH} px`;

  if (megapixels) {
    return `${base} (${megapixels})`;
  }
  return base;
}
