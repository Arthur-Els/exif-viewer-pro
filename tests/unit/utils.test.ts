import { describe, expect, it, vi } from 'vitest';
import { copyToClipboard, downloadJSON, formatBytes, formatDate } from '../../src/js/utils.js';

describe('utils', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('formats negative or NaN bytes', () => {
      expect(formatBytes(-10)).toBe('0 B');
      expect(formatBytes(NaN)).toBe('0 B');
    });

    it('formats KB, MB, GB properly with custom decimals', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1024 * 1024 * 2.5, 2)).toBe('2.5 MB');
      expect(formatBytes(1024 * 1024 * 1024 * 3)).toBe('3 GB');
    });
  });

  describe('formatDate', () => {
    it('handles null and undefined', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
    });

    it('formats valid Date objects to Indonesian localized strings', () => {
      const date = new Date(2024, 4, 12, 14, 30, 22); // 12 Mei 2024
      const formatted = formatDate(date);
      expect(formatted).toContain('12');
      expect(formatted).toContain('Mei');
      expect(formatted).toContain('2024');
    });

    it('handles ISO date strings and timestamps', () => {
      const formatted = formatDate('2024-05-12T07:30:22Z');
      expect(formatted).toContain('2024');
    });

    it('returns raw string if parsing fails', () => {
      expect(formatDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('copyToClipboard', () => {
    it('uses navigator.clipboard if available', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true
      });

      const success = await copyToClipboard('Hello World');
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('Hello World');
    });
  });

  describe('downloadJSON', () => {
    it('does not throw when document is undefined (Node test environment)', () => {
      expect(() => downloadJSON({ test: 123 })).not.toThrow();
    });
  });
});
