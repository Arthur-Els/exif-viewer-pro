/**
 * @fileoverview Worker Client dispatcher. Communicates with `metadata.worker.ts`
 * using transferable ArrayBuffers for zero UI thread stutter.
 * Includes seamless fallback to main thread execution if Web Workers are disabled.
 */

import { getNaturalDimensions, parseMetadata } from './metadata-parser.js';
import type {
  FileInfo,
  NaturalDimensions,
  NormalizedMetadata,
  WorkerRequest,
  WorkerResponse
} from '../types/metadata.js';

/**
 * Parse image metadata via dedicated Web Worker or main-thread fallback.
 *
 * @param {File} file - Image file selected by the user.
 * @returns {Promise<NormalizedMetadata>} Parsed and normalized metadata.
 */
export async function parseMetadataWithWorker(file: File): Promise<NormalizedMetadata> {
  const fileInfo: FileInfo = {
    name: file.name,
    type: file.type || 'image/jpeg',
    size: file.size,
    lastModified: file.lastModified
  };

  // Pre-calculate natural dimensions on the main thread (uses Image/createImageBitmap)
  let naturalDims: NaturalDimensions = { width: null, height: null };
  try {
    naturalDims = await getNaturalDimensions(file);
  } catch (err) {
    console.warn('Gagal membaca dimensi natural di main thread:', err);
  }

  // Attempt Web Worker parsing
  if (typeof Worker !== 'undefined') {
    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (err) {
      console.warn('Gagal membaca ArrayBuffer untuk worker:', err);
      return parseMetadata(file, fileInfo, naturalDims);
    }

    return new Promise((resolve, reject) => {
      let worker: Worker | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        worker = new Worker(new URL('../workers/metadata.worker.ts', import.meta.url), {
          type: 'module'
        });

        // Safety timeout (15 seconds)
        timeoutId = setTimeout(() => {
          if (worker) {
            worker.terminate();
            worker = null;
          }
          reject(new Error('Waktu pemrosesan metadata melebihi batas (timeout).'));
        }, 15000);

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          if (timeoutId) clearTimeout(timeoutId);
          const response = event.data;

          if (worker) {
            worker.terminate();
            worker = null;
          }

          if (response.type === 'SUCCESS') {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Terjadi kesalahan pada worker metadata.'));
          }
        };

        worker.onerror = (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (worker) {
            worker.terminate();
            worker = null;
          }
          console.warn('Worker error, beralih ke fallback main thread:', err);
          // Fallback to main thread execution
          parseMetadata(file, fileInfo, naturalDims).then(resolve).catch(reject);
        };

        const request: WorkerRequest = {
          type: 'PARSE',
          payload: {
            buffer,
            fileInfo,
            naturalDims
          }
        };

        // Transfer buffer ownership for zero-copy performance
        worker.postMessage(request, [buffer]);
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (worker) {
          worker.terminate();
        }
        console.warn('Inisialisasi Web Worker gagal, beralih ke main thread:', err);
        parseMetadata(file, fileInfo, naturalDims).then(resolve).catch(reject);
      }
    });
  }

  // Direct fallback if Worker is unavailable
  return parseMetadata(file, fileInfo, naturalDims);
}
