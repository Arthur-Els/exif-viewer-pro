/**
 * @fileoverview Main application entry point for EXIF Viewer.
 * Orchestrates file upload events, Web Worker background metadata extraction,
 * DOM rendering, and memory lifecycle management (revoking preview Object URLs).
 */

import './styles/base.css';
import './styles/components.css';

import { initDropzone } from './js/dropzone.js';
import { renderResults } from './js/renderer.js';
import { parseMetadataWithWorker } from './js/worker-client.js';

/**
 * Application state.
 */
let currentPreviewUrl: string | null = null;

/**
 * DOM Elements.
 */
const dropzoneEl = document.getElementById('dropzone') as HTMLElement | null;
const fileInputEl = document.getElementById('file-input') as HTMLInputElement | null;
const uploadSectionEl = document.getElementById('upload-section') as HTMLElement | null;
const resultsSectionEl = document.getElementById('results-section') as HTMLElement | null;
const loadingSectionEl = document.getElementById('loading-section') as HTMLElement | null;
const alertToastEl = document.getElementById('alert-toast') as HTMLElement | null;
const alertMessageEl = document.getElementById('alert-message') as HTMLElement | null;
const alertCloseBtnEl = document.getElementById('alert-close-btn') as HTMLButtonElement | null;
const statusAnnouncerEl = document.getElementById('status-announcer') as HTMLElement | null;

/**
 * Announce messages politely to assistive technologies (screen readers).
 *
 * @param {string} message - Announcement text.
 */
function announceStatus(message: string): void {
  if (statusAnnouncerEl) {
    statusAnnouncerEl.textContent = message;
  }
}

/**
 * Display user-friendly Indonesian error notifications.
 *
 * @param {string} message - Error description.
 */
function showError(message: string): void {
  if (!alertToastEl || !alertMessageEl) return;
  alertMessageEl.textContent = message;
  alertToastEl.classList.remove('is-hidden');
  announceStatus(`Alert: ${message}`);
}

/**
 * Dismiss the error alert notification.
 */
function hideError(): void {
  if (!alertToastEl) return;
  alertToastEl.classList.add('is-hidden');
}

/**
 * Set loading indicator state.
 *
 * @param {boolean} isLoading
 */
function setLoading(isLoading: boolean): void {
  if (!loadingSectionEl || !uploadSectionEl || !resultsSectionEl) return;
  if (isLoading) {
    loadingSectionEl.classList.remove('is-hidden');
    uploadSectionEl.classList.add('is-hidden');
    resultsSectionEl.classList.add('is-hidden');
    announceStatus('Reading and analyzing photo metadata...');
  } else {
    loadingSectionEl.classList.add('is-hidden');
  }
}

/**
 * Revoke existing preview Object URL to prevent browser memory leaks.
 */
function revokePreviewUrl(): void {
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
}

/**
 * Reset application state to allow uploading a new photo.
 */
function resetToUpload(): void {
  revokePreviewUrl();
  hideError();
  if (resultsSectionEl) {
    resultsSectionEl.replaceChildren();
    resultsSectionEl.classList.add('is-hidden');
  }
  if (uploadSectionEl) {
    uploadSectionEl.classList.remove('is-hidden');
  }
  announceStatus('Ready for a new photo.');
}

/**
 * Handle validated file selection from either drop or file picker.
 *
 * @param {File} file - Validated image file.
 */
async function handleFileSelected(file: File): Promise<void> {
  hideError();
  setLoading(true);

  try {
    // Revoke previous object URL if any
    revokePreviewUrl();

    // Create fresh object URL for the preview image
    currentPreviewUrl = URL.createObjectURL(file);

    // Parse EXIF, GPS, IPTC, XMP metadata in a dedicated Web Worker
    const metadata = await parseMetadataWithWorker(file);

    // Render results to DOM safely
    setLoading(false);
    if (uploadSectionEl) uploadSectionEl.classList.add('is-hidden');
    if (resultsSectionEl) {
      resultsSectionEl.classList.remove('is-hidden');

      renderResults({
        containerEl: resultsSectionEl,
        data: metadata,
        previewUrl: currentPreviewUrl,
        file,
        onReset: resetToUpload,
        onShowError: showError,
        announceStatus
      });
    }
  } catch (err) {
    console.error('Error occurred while processing photo:', err);
    setLoading(false);
    if (uploadSectionEl) uploadSectionEl.classList.remove('is-hidden');
    if (resultsSectionEl) resultsSectionEl.classList.add('is-hidden');
    revokePreviewUrl();
    showError('Failed to process this image file. Please verify it is not corrupted and try again.');
  }
}

/**
 * Initialize event listeners and module wiring.
 */
function initApp(): void {
  if (alertCloseBtnEl) {
    alertCloseBtnEl.addEventListener('click', hideError);
  }

  if (dropzoneEl && fileInputEl) {
    initDropzone({
      dropzoneEl,
      fileInputEl,
      onFileSelected: handleFileSelected,
      onError: showError
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
