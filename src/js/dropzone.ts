/**
 * @fileoverview Module for handling image file uploads via click, drag-and-drop,
 * and keyboard interactions with thorough magic-bytes validation and Indonesian error reporting.
 */

import { validateFileWithMagicBytes } from './file-validator.js';
import type { FileValidationResult } from '../types/metadata.js';

export { MAX_FILE_SIZE_BYTES } from './file-validator.js';

/**
 * Validate a candidate file against size limits and authentic magic bytes.
 *
 * @param {File} file - Candidate file.
 * @returns {Promise<FileValidationResult>} Result.
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  return validateFileWithMagicBytes(file);
}

export interface DropzoneOptions {
  dropzoneEl: HTMLElement;
  fileInputEl: HTMLInputElement;
  onFileSelected: (file: File) => void;
  onError: (errorMsg: string) => void;
}

export interface DropzoneController {
  destroy: () => void;
  openPicker: () => void;
}

/**
 * Initialize dropzone event listeners.
 *
 * @param {DropzoneOptions} options
 * @returns {DropzoneController} Control methods.
 */
export function initDropzone({
  dropzoneEl,
  fileInputEl,
  onFileSelected,
  onError
}: DropzoneOptions): DropzoneController {
  if (!dropzoneEl || !fileInputEl) {
    throw new Error('Dropzone element and file input element are required.');
  }

  // Ensure keyboard accessibility
  if (!dropzoneEl.hasAttribute('tabindex')) {
    dropzoneEl.setAttribute('tabindex', '0');
  }
  dropzoneEl.setAttribute('role', 'button');
  dropzoneEl.setAttribute(
    'aria-label',
    'Area unggah foto. Klik atau seret file gambar ke sini untuk memeriksa metadata.'
  );

  let dragCounter = 0;

  /**
   * Process a single candidate file from either drop or input selection.
   * @param {File} file
   */
  async function handleCandidateFile(file: File) {
    const validation = await validateFileWithMagicBytes(file);
    if (!validation.valid) {
      if (typeof onError === 'function') {
        onError(validation.error || 'Format file tidak valid.');
      }
      return;
    }

    if (typeof onFileSelected === 'function') {
      onFileSelected(file);
    }
  }

  // Click to open file picker
  function handleClick(e: MouseEvent) {
    if (e.target === fileInputEl) return;
    fileInputEl.click();
  }

  // Keyboard activation (Enter or Space)
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputEl.click();
    }
  }

  // Drag over window protection
  function preventDefaults(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: DragEvent) {
    preventDefaults(e);
    dragCounter++;
    dropzoneEl.classList.add('is-dragover');
  }

  function handleDragOver(e: DragEvent) {
    preventDefaults(e);
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    dropzoneEl.classList.add('is-dragover');
  }

  function handleDragLeave(e: DragEvent) {
    preventDefaults(e);
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropzoneEl.classList.remove('is-dragover');
    }
  }

  function handleDrop(e: DragEvent) {
    preventDefaults(e);
    dragCounter = 0;
    dropzoneEl.classList.remove('is-dragover');

    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) {
      return;
    }

    const file = dt.files[0];
    if (file) {
      void handleCandidateFile(file);
    }
  }

  // Input change
  function handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      if (file) {
        void handleCandidateFile(file);
      }
      target.value = '';
    }
  }

  dropzoneEl.addEventListener('click', handleClick);
  dropzoneEl.addEventListener('keydown', handleKeyDown);
  dropzoneEl.addEventListener('dragenter', handleDragEnter);
  dropzoneEl.addEventListener('dragover', handleDragOver);
  dropzoneEl.addEventListener('dragleave', handleDragLeave);
  dropzoneEl.addEventListener('drop', handleDrop);
  fileInputEl.addEventListener('change', handleInputChange);

  window.addEventListener('dragover', preventDefaults);
  window.addEventListener('drop', preventDefaults);

  return {
    destroy() {
      dropzoneEl.removeEventListener('click', handleClick);
      dropzoneEl.removeEventListener('keydown', handleKeyDown);
      dropzoneEl.removeEventListener('dragenter', handleDragEnter);
      dropzoneEl.removeEventListener('dragover', handleDragOver);
      dropzoneEl.removeEventListener('dragleave', handleDragLeave);
      dropzoneEl.removeEventListener('drop', handleDrop);
      fileInputEl.removeEventListener('change', handleInputChange);
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    },
    openPicker() {
      fileInputEl.click();
    }
  };
}
