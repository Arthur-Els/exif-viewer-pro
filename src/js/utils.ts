/**
 * @fileoverview Utility helper functions for formatting bytes, dates,
 * copying data to the clipboard, and triggering file downloads.
 */

/**
 * Format bytes into human-readable string (KB, MB, GB, etc.).
 *
 * @param {number} bytes - Size in bytes.
 * @param {number} [decimals=2] - Number of decimal places to preserve.
 * @returns {string} Formatted size string (e.g. "2.45 MB").
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);
  const formattedValue = parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm));

  return `${formattedValue} ${sizes[safeIndex]}`;
}

/**
 * Copy text content to the user's system clipboard.
 * Supports the modern Clipboard API with a reliable fallback for older environments.
 *
 * @param {string} text - The text to be copied.
 * @returns {Promise<boolean>} Resolves to true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const safeText = typeof text !== 'string' ? String(text ?? '') : text;

  // Modern navigator.clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(safeText);
      return true;
    } catch {
      // Fallback below
    }
  }

  // Fallback using textarea element
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = safeText;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Download a JavaScript object or string as a formatted JSON file.
 *
 * @param {object|string} data - JSON-serializable object or JSON string.
 * @param {string} [filename='metadata.json'] - Target filename for the download.
 * @returns {void}
 */
export function downloadJSON(data: object | string, filename: string = 'metadata.json'): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Clean up element and revoke temporary blob URL
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }, 100);
}

/**
 * Format a Date object or valid date string into localized Indonesian format.
 *
 * @param {Date|string|number|null|undefined} dateInput - Date object, ISO string, or timestamp.
 * @returns {string} Formatted Indonesian date string or raw input if invalid.
 */
export function formatDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-';

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
