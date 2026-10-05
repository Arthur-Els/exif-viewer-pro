/**
 * @fileoverview Image Metadata Stripper & Cleaner Module.
 * Strips 100% of EXIF, GPS coordinates, camera serial numbers, IPTC, XMP,
 * and embedded thumbnails completely client-side using HTML5 Canvas pixel extraction.
 */

export interface CleanImageResult {
  blob: Blob;
  fileName: string;
}

/**
 * Generate a new filename with "-clean" suffix.
 * e.g., "photo.jpg" -> "photo-clean.jpg"
 * e.g., "my.sample.image.png" -> "my.sample.image-clean.png"
 * e.g., "vacation" -> "vacation-clean.jpg"
 *
 * @param {string} originalName - Original uploaded filename.
 * @param {string} [targetExtension] - Optional override file extension (e.g. "jpg", "png").
 * @returns {string} Sanitized filename with "-clean" suffix.
 */
export function generateCleanFileName(originalName: string, targetExtension?: string): string {
  if (!originalName || typeof originalName !== 'string') {
    return `foto-clean.${targetExtension || 'jpg'}`;
  }

  const trimmed = originalName.trim();
  const lastDotIndex = trimmed.lastIndexOf('.');

  const baseName = lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed || 'foto';
  const originalExt = lastDotIndex > 0 ? trimmed.slice(lastDotIndex + 1).toLowerCase() : '';

  let ext = targetExtension;
  if (!ext) {
    if (originalExt === 'png') {
      ext = 'png';
    } else if (originalExt === 'webp') {
      ext = 'webp';
    } else {
      ext = 'jpg';
    }
  }

  // Remove leading dot if passed (e.g. ".jpg" -> "jpg")
  ext = ext.replace(/^\./, '');

  return `${baseName}-clean.${ext}`;
}

/**
 * Determine the optimal MIME type and file extension for exporting the cleaned image.
 *
 * @param {string} fileType - Source file MIME type.
 * @param {string} fileName - Source file name.
 * @returns {{ mimeType: string; extension: string }}
 */
export function getExportMimeType(
  fileType: string,
  fileName: string
): { mimeType: string; extension: string } {
  const lowerType = (fileType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  if (lowerType === 'image/png' || lowerName.endsWith('.png')) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (lowerType === 'image/webp' || lowerName.endsWith('.webp')) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  // Default to JPEG for JPEG, HEIC, TIFF, AVIF, BMP, etc.
  return { mimeType: 'image/jpeg', extension: 'jpg' };
}

/**
 * Load an image into an HTMLImageElement safely from a Blob or File.
 *
 * @param {File | Blob} file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('Image constructor is not available in this environment.'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal memuat data gambar untuk diproses.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Strips all EXIF, GPS, IPTC, and XMP metadata from an image file by re-encoding
 * its raw pixel buffer through HTML5 Canvas.
 *
 * @param {File | Blob} file - Input image file.
 * @param {string} [fileName='foto.jpg'] - Original filename.
 * @param {number} [quality=0.95] - Compression quality for lossy formats (0.0 to 1.0).
 * @returns {Promise<CleanImageResult>}
 */
export async function stripExifFromImage(
  file: File | Blob,
  fileName: string = 'foto.jpg',
  quality: number = 0.95
): Promise<CleanImageResult> {
  const { mimeType, extension } = getExportMimeType(file.type, fileName);
  const cleanFileName = generateCleanFileName(fileName, extension);

  let width: number;
  let height: number;
  let sourceDrawable: ImageBitmap | HTMLImageElement;

  // Modern browsers: createImageBitmap with orientation normalization
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      width = bitmap.width;
      height = bitmap.height;
      sourceDrawable = bitmap;
    } catch {
      // Fallback to Image element if createImageBitmap is not supported or errors on format
      sourceDrawable = await loadImageElement(file);
      width = sourceDrawable.naturalWidth || sourceDrawable.width;
      height = sourceDrawable.naturalHeight || sourceDrawable.height;
    }
  } else {
    sourceDrawable = await loadImageElement(file);
    width = sourceDrawable.naturalWidth || sourceDrawable.width;
    height = sourceDrawable.naturalHeight || sourceDrawable.height;
  }

  if (!width || !height) {
    throw new Error('Dimensi gambar tidak valid atau tidak terbaca.');
  }

  if (typeof document === 'undefined') {
    throw new Error('DOM document is not available.');
  }

  // Create clean canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Gagal membuat context canvas 2D.');
  }

  // Draw pure pixel buffer (Canvas does not copy EXIF or metadata tags)
  ctx.drawImage(sourceDrawable, 0, 0, width, height);

  // Release ImageBitmap resources if applicable
  if ('close' in sourceDrawable && typeof sourceDrawable.close === 'function') {
    sourceDrawable.close();
  }

  // Export clean Blob
  const cleanBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Gagal mengekspor foto bersih dari canvas.'));
        }
      },
      mimeType,
      mimeType === 'image/png' ? undefined : quality
    );
  });

  return {
    blob: cleanBlob,
    fileName: cleanFileName
  };
}

/**
 * Triggers a browser download of an image Blob.
 *
 * @param {Blob} blob - The image blob to download.
 * @param {string} fileName - Target filename with extension.
 */
export function downloadCleanImage(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }, 200);
}
