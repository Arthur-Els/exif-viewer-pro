/**
 * @fileoverview Web Worker for non-blocking EXIF / metadata extraction.
 * Offloads CPU-intensive binary parsing to a background worker thread.
 */

import { parseMetadata } from '../js/metadata-parser.js';
import type { WorkerRequest, WorkerResponse } from '../types/metadata.js';

// Dedicated Worker scope
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  if (message.type === 'PARSE') {
    try {
      const { buffer, fileInfo, naturalDims } = message.payload;
      const normalizedData = await parseMetadata(buffer, fileInfo, naturalDims);

      const response: WorkerResponse = {
        type: 'SUCCESS',
        data: normalizedData
      };

      self.postMessage(response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const response: WorkerResponse = {
        type: 'ERROR',
        error: errorMsg
      };

      self.postMessage(response);
    }
  }
};
