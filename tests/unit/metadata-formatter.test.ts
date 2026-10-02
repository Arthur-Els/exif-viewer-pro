import { describe, expect, it } from 'vitest';
import {
  formatAltitude,
  formatAperture,
  formatCoordinate,
  formatDimensions,
  formatExposureCompensation,
  formatExposureProgram,
  formatExposureTime,
  formatFileSize,
  formatFlash,
  formatFocalLength,
  formatISO,
  formatMeteringMode,
  formatOrientation,
  formatWhiteBalance
} from '../../src/js/metadata-formatter.js';

describe('metadata-formatter', () => {
  describe('formatExposureTime (Shutter Speed)', () => {
    it('formats fractions less than 1 second correctly', () => {
      expect(formatExposureTime(0.004)).toBe('1/250 s');
      expect(formatExposureTime(0.001)).toBe('1/1000 s');
      expect(formatExposureTime(0.5)).toBe('1/2 s');
      expect(formatExposureTime('0.002')).toBe('1/500 s');
    });

    it('formats times 1 second or greater correctly', () => {
      expect(formatExposureTime(1)).toBe('1 s');
      expect(formatExposureTime(2)).toBe('2 s');
      expect(formatExposureTime(2.5)).toBe('2.5 s');
    });

    it('gracefully handles missing, null, undefined, or invalid values', () => {
      expect(formatExposureTime(null)).toBe('-');
      expect(formatExposureTime(undefined)).toBe('-');
      expect(formatExposureTime('')).toBe('-');
      expect(formatExposureTime('invalid')).toBe('invalid');
      expect(formatExposureTime(0)).toBe('0');
    });
  });

  describe('formatAperture', () => {
    it('formats standard numeric apertures correctly', () => {
      expect(formatAperture(1.4)).toBe('f/1.4');
      expect(formatAperture(1.8)).toBe('f/1.8');
      expect(formatAperture(2.8)).toBe('f/2.8');
      expect(formatAperture(4.0)).toBe('f/4');
      expect(formatAperture(16)).toBe('f/16');
    });

    it('handles string aperture inputs and avoids duplicate prefixes', () => {
      expect(formatAperture('f/2.8')).toBe('f/2.8');
      expect(formatAperture('2.8')).toBe('f/2.8');
    });

    it('gracefully handles missing, null, or undefined values', () => {
      expect(formatAperture(null)).toBe('-');
      expect(formatAperture(undefined)).toBe('-');
      expect(formatAperture('')).toBe('-');
    });
  });

  describe('formatCoordinate (GPS Latitude & Longitude)', () => {
    it('formats south latitude correctly with DMS and decimal degrees', () => {
      const formatted = formatCoordinate(-6.208806, 'lat');
      expect(formatted).toContain("6° 12'");
      expect(formatted).toContain('S (Selatan)');
      expect(formatted).toContain('(-6.208806°)');
    });

    it('formats north latitude correctly', () => {
      const formatted = formatCoordinate(48.8584, 'lat');
      expect(formatted).toContain("48° 51'");
      expect(formatted).toContain('N (Utara)');
    });

    it('formats east longitude correctly', () => {
      const formatted = formatCoordinate(106.845611, 'lon');
      expect(formatted).toContain("106° 50'");
      expect(formatted).toContain('E (Timur)');
      expect(formatted).toContain('(106.845611°)');
    });

    it('formats west longitude correctly', () => {
      const formatted = formatCoordinate(-74.006, 'lon');
      expect(formatted).toContain("74° 0'");
      expect(formatted).toContain('W (Barat)');
    });

    it('gracefully handles missing or NaN coordinates', () => {
      expect(formatCoordinate(null, 'lat')).toBe('-');
      expect(formatCoordinate(undefined, 'lon')).toBe('-');
      expect(formatCoordinate(NaN, 'lat')).toBe('-');
    });
  });

  describe('formatFocalLength', () => {
    it('formats base focal length in mm', () => {
      expect(formatFocalLength(35)).toBe('35 mm');
      expect(formatFocalLength(50.4)).toBe('50.4 mm');
    });

    it('includes 35mm full-frame equivalent if different', () => {
      expect(formatFocalLength(35, 52)).toBe('35 mm (setara 52 mm full-frame)');
    });

    it('does not duplicate full-frame note if values match', () => {
      expect(formatFocalLength(50, 50)).toBe('50 mm');
    });

    it('handles missing values', () => {
      expect(formatFocalLength(null)).toBe('-');
      expect(formatFocalLength(undefined)).toBe('-');
    });
  });

  describe('formatISO', () => {
    it('formats numeric ISO with ISO prefix', () => {
      expect(formatISO(100)).toBe('ISO 100');
      expect(formatISO(3200)).toBe('ISO 3200');
    });

    it('avoids duplicate ISO prefix for string inputs', () => {
      expect(formatISO('ISO 400')).toBe('ISO 400');
      expect(formatISO('800')).toBe('ISO 800');
    });

    it('handles missing values', () => {
      expect(formatISO(null)).toBe('-');
      expect(formatISO(undefined)).toBe('-');
    });
  });

  describe('formatExposureCompensation', () => {
    it('formats 0 EV', () => {
      expect(formatExposureCompensation(0)).toBe('0 EV');
    });

    it('formats positive and negative EV values', () => {
      expect(formatExposureCompensation(0.6666)).toBe('+0.7 EV');
      expect(formatExposureCompensation(-1.3333)).toBe('-1.3 EV');
    });

    it('handles missing values', () => {
      expect(formatExposureCompensation(null)).toBe('-');
      expect(formatExposureCompensation(undefined)).toBe('-');
    });
  });

  describe('formatFlash', () => {
    it('translates numeric flash bitmasks into Indonesian descriptions', () => {
      expect(formatFlash(0)).toBe('Mati (Flash did not fire)');
      expect(formatFlash(1)).toBe('Menyala (Flash fired)');
      expect(formatFlash(24)).toBe('Mati, mode otomatis');
      expect(formatFlash(25)).toBe('Menyala, mode otomatis');
    });

    it('translates string flash descriptions', () => {
      expect(formatFlash('Flash did not fire')).toBe('Mati (Flash did not fire)');
      expect(formatFlash('Flash fired')).toBe('Menyala (Flash fired)');
      expect(formatFlash('off')).toBe('Mati (Flash did not fire)');
    });

    it('handles missing values', () => {
      expect(formatFlash(null)).toBe('-');
      expect(formatFlash(undefined)).toBe('-');
    });
  });

  describe('formatExposureProgram', () => {
    it('translates standard program codes', () => {
      expect(formatExposureProgram(1)).toBe('Manual');
      expect(formatExposureProgram(2)).toBe('Program AE (Otomatis Normal)');
      expect(formatExposureProgram(3)).toBe('Prioritas Diafragma (Aperture Priority)');
      expect(formatExposureProgram(4)).toBe('Prioritas Rana (Shutter Priority)');
    });

    it('handles string modes', () => {
      expect(formatExposureProgram('Aperture priority')).toBe(
        'Prioritas Diafragma (Aperture Priority)'
      );
      expect(formatExposureProgram('Manual')).toBe('Manual');
    });

    it('handles missing values', () => {
      expect(formatExposureProgram(null)).toBe('-');
      expect(formatExposureProgram(undefined)).toBe('-');
    });
  });

  describe('formatWhiteBalance and formatMeteringMode', () => {
    it('translates white balance modes', () => {
      expect(formatWhiteBalance(0)).toBe('Otomatis (Auto)');
      expect(formatWhiteBalance('Auto')).toBe('Otomatis (Auto)');
      expect(formatWhiteBalance(1)).toBe('Manual');
      expect(formatWhiteBalance('Manual')).toBe('Manual');
      expect(formatWhiteBalance(null)).toBe('-');
    });

    it('translates metering modes', () => {
      expect(formatMeteringMode(1)).toBe('Rata-rata (Average)');
      expect(formatMeteringMode(2)).toBe('Pusat Berbobot (Center-Weighted Average)');
      expect(formatMeteringMode(3)).toBe('Titik (Spot)');
      expect(formatMeteringMode(5)).toBe('Pola / Evaluatif (Pattern / Multi-segment)');
      expect(formatMeteringMode(null)).toBe('-');
    });
  });

  describe('formatOrientation', () => {
    it('translates orientation codes into human readable descriptions', () => {
      expect(formatOrientation(1)).toBe('Normal (0°)');
      expect(formatOrientation(3)).toBe('Diputar 180°');
      expect(formatOrientation(6)).toBe('Diputar 90° CW (Searah jarum jam)');
      expect(formatOrientation(8)).toBe('Diputar 90° CCW (Berlawanan jarum jam)');
      expect(formatOrientation(null)).toBe('-');
    });
  });

  describe('formatAltitude, formatFileSize, formatDimensions', () => {
    it('formats altitude above and below sea level', () => {
      expect(formatAltitude(25.4)).toBe('25.4 meter di atas permukaan laut');
      expect(formatAltitude(-10)).toBe('10.0 meter di bawah permukaan laut');
      expect(formatAltitude(null)).toBe('-');
    });

    it('formats file sizes with units and bytes', () => {
      const formatted = formatFileSize(2048);
      expect(formatted).toContain('2 KB');
      expect(formatted).toContain('2.048 byte');
      expect(formatFileSize(null)).toBe('-');
    });

    it('formats image dimensions with optional megapixels', () => {
      expect(formatDimensions(4000, 3000, '12.0 MP')).toBe('4.000 × 3.000 px (12.0 MP)');
      expect(formatDimensions(1920, 1080)).toBe('1.920 × 1.080 px');
      expect(formatDimensions(null, null)).toBe('-');
    });
  });
});
