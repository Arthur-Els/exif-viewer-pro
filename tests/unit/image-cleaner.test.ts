import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  downloadCleanImage,
  generateCleanFileName,
  getExportMimeType,
  stripExifFromImage
} from '../../src/js/image-cleaner.js';

describe('image-cleaner', () => {
  describe('generateCleanFileName', () => {
    it('appends -clean before .jpg extension', () => {
      expect(generateCleanFileName('photo.jpg')).toBe('photo-clean.jpg');
      expect(generateCleanFileName('IMG_2024.jpeg')).toBe('IMG_2024-clean.jpg');
    });

    it('preserves .png and .webp extensions with -clean', () => {
      expect(generateCleanFileName('screenshot.png')).toBe('screenshot-clean.png');
      expect(generateCleanFileName('banner.webp')).toBe('banner-clean.webp');
    });

    it('handles files with multiple dots in the name', () => {
      expect(generateCleanFileName('my.vacation.holiday.2026.png')).toBe(
        'my.vacation.holiday.2026-clean.png'
      );
      expect(generateCleanFileName('project.v1.2.final.jpg')).toBe('project.v1.2.final-clean.jpg');
    });

    it('supports custom target extension override', () => {
      expect(generateCleanFileName('camera-raw.heic', 'jpg')).toBe('camera-raw-clean.jpg');
      expect(generateCleanFileName('archive.tiff', '.png')).toBe('archive-clean.png');
    });

    it('handles files without extensions or empty inputs', () => {
      expect(generateCleanFileName('camera-capture')).toBe('camera-capture-clean.jpg');
      expect(generateCleanFileName('')).toBe('foto-clean.jpg');
    });
  });

  describe('getExportMimeType', () => {
    it('returns image/png for PNG files', () => {
      expect(getExportMimeType('image/png', 'diagram.png')).toEqual({
        mimeType: 'image/png',
        extension: 'png'
      });
      expect(getExportMimeType('', 'diagram.png')).toEqual({
        mimeType: 'image/png',
        extension: 'png'
      });
    });

    it('returns image/webp for WebP files', () => {
      expect(getExportMimeType('image/webp', 'graphic.webp')).toEqual({
        mimeType: 'image/webp',
        extension: 'webp'
      });
    });

    it('defaults to image/jpeg for JPEG and other photographic formats', () => {
      expect(getExportMimeType('image/jpeg', 'portrait.jpg')).toEqual({
        mimeType: 'image/jpeg',
        extension: 'jpg'
      });
      expect(getExportMimeType('image/heic', 'apple.heic')).toEqual({
        mimeType: 'image/jpeg',
        extension: 'jpg'
      });
      expect(getExportMimeType('image/tiff', 'scan.tif')).toEqual({
        mimeType: 'image/jpeg',
        extension: 'jpg'
      });
    });
  });

  describe('downloadCleanImage', () => {
    let originalDocument: typeof globalThis.document;
    let originalUrl: typeof globalThis.URL;

    beforeEach(() => {
      originalDocument = globalThis.document;
      originalUrl = globalThis.URL;
    });

    afterEach(() => {
      globalThis.document = originalDocument;
      globalThis.URL = originalUrl;
      vi.restoreAllMocks();
    });

    it('creates anchor element with download attribute and triggers click', () => {
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        style: {},
        click: mockClick
      };

      globalThis.document = {
        createElement: vi.fn().mockReturnValue(mockAnchor),
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild
        }
      } as unknown as Document;

      const mockRevoke = vi.fn();
      globalThis.URL = {
        createObjectURL: vi.fn().mockReturnValue('blob:clean-image-url'),
        revokeObjectURL: mockRevoke
      } as unknown as typeof URL;

      const testBlob = new Blob(['clean-bytes'], { type: 'image/jpeg' });
      downloadCleanImage(testBlob, 'sample-clean.jpg');

      expect(mockAnchor.download).toBe('sample-clean.jpg');
      expect(mockAnchor.href).toBe('blob:clean-image-url');
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
    });
  });

  describe('stripExifFromImage', () => {
    let originalCreateImageBitmap: typeof globalThis.createImageBitmap;
    let originalDocument: typeof globalThis.document;

    beforeEach(() => {
      originalCreateImageBitmap = globalThis.createImageBitmap;
      originalDocument = globalThis.document;
    });

    afterEach(() => {
      globalThis.createImageBitmap = originalCreateImageBitmap;
      globalThis.document = originalDocument;
      vi.restoreAllMocks();
    });

    it('renders pixel buffer to canvas and extracts clean blob with -clean filename', async () => {
      const mockBitmap = {
        width: 800,
        height: 600,
        close: vi.fn()
      };

      globalThis.createImageBitmap = vi.fn().mockResolvedValue(mockBitmap);

      const mockDrawImage = vi.fn();
      const mockContext = {
        drawImage: mockDrawImage
      };

      const mockToBlob = vi.fn((callback: (blob: Blob) => void) => {
        const cleanBlob = new Blob(['clean-data'], { type: 'image/jpeg' });
        callback(cleanBlob);
      });

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockContext),
        toBlob: mockToBlob
      };

      globalThis.document = {
        createElement: vi.fn().mockReturnValue(mockCanvas)
      } as unknown as Document;

      const dummyFile = new File(['dummy-bytes'], 'summer-trip.jpg', { type: 'image/jpeg' });
      const result = await stripExifFromImage(dummyFile, 'summer-trip.jpg');

      expect(result.fileName).toBe('summer-trip-clean.jpg');
      expect(result.blob).toBeInstanceOf(Blob);
      expect(mockCanvas.width).toBe(800);
      expect(mockCanvas.height).toBe(600);
      expect(mockDrawImage).toHaveBeenCalledWith(mockBitmap, 0, 0, 800, 600);
      expect(mockBitmap.close).toHaveBeenCalled();
      expect(mockToBlob).toHaveBeenCalled();
    });

    it('throws descriptive error if image dimensions cannot be determined', async () => {
      const mockBitmap = {
        width: 0,
        height: 0,
        close: vi.fn()
      };

      globalThis.createImageBitmap = vi.fn().mockResolvedValue(mockBitmap);

      const dummyFile = new File(['corrupt-bytes'], 'corrupt.jpg', { type: 'image/jpeg' });
      await expect(stripExifFromImage(dummyFile, 'corrupt.jpg')).rejects.toThrow(
        'Dimensi gambar tidak valid'
      );
    });
  });
});
