/**
 * @fileoverview DOM Renderer module for EXIF Viewer.
 * Clean, uncluttered, minimalist 2-column layout.
 */

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
} from './metadata-formatter.js';
import { copyToClipboard, downloadJSON, formatDate } from './utils.js';
import { downloadCleanImage, stripExifFromImage } from './image-cleaner.js';
import type { NormalizedMetadata } from '../types/metadata.js';

interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string | null | undefined>;
  children?: (Node | string)[];
}

function el(tag: string, options: ElementOptions = {}): HTMLElement {
  const { className = '', text = '', attrs = {}, children = [] } = options;
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== '') element.textContent = text;

  for (const [key, val] of Object.entries(attrs)) {
    if (val !== null && val !== undefined) {
      element.setAttribute(key, val);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

function createMetaRow(key: string, val: string | number | null | undefined): HTMLElement | null {
  if (val === null || val === undefined || val === '' || val === '-') {
    return null;
  }
  const row = el('div', { className: 'data-row' });
  row.appendChild(el('span', { className: 'data-key', text: key }));
  row.appendChild(el('span', { className: 'data-val', text: String(val) }));
  return row;
}

export interface RenderResultsOptions {
  containerEl: HTMLElement;
  data: NormalizedMetadata;
  previewUrl: string;
  file?: File;
  onReset: () => void;
  onShowError?: (message: string) => void;
  announceStatus: (message: string) => void;
}

export function renderResults({
  containerEl,
  data,
  previewUrl,
  file,
  onReset,
  onShowError,
  announceStatus
}: RenderResultsOptions): void {
  if (!containerEl) return;
  containerEl.replaceChildren();

  const wrap = el('div', { className: 'results-layout' });

  // 1. Header Toolbar
  const toolbar = el('div', { className: 'results-bar' });
  const fileMeta = el('div', { className: 'file-meta' });
  fileMeta.appendChild(el('span', { className: 'file-name', text: data.file.name }));
  fileMeta.appendChild(
    el('span', {
      className: 'file-sub',
      text: `${formatFileSize(data.file.size)} • ${data.file.type}`
    })
  );
  toolbar.appendChild(fileMeta);

  const actions = el('div', { className: 'actions-group' });

  if (file) {
    const cleanBtn = el('button', {
      className: 'btn btn-primary',
      attrs: { type: 'button', id: 'btn-clean-download' },
      text: 'Remove EXIF & Download'
    });

    cleanBtn.addEventListener('click', async () => {
      cleanBtn.setAttribute('disabled', 'true');
      cleanBtn.textContent = 'Processing...';
      announceStatus('Removing EXIF metadata...');

      try {
        const result = await stripExifFromImage(file, file.name);
        downloadCleanImage(result.blob, result.fileName);

        cleanBtn.textContent = '✓ Downloaded Clean';
        cleanBtn.classList.add('btn-success');
        announceStatus(`Clean photo ${result.fileName} downloaded successfully.`);

        setTimeout(() => {
          cleanBtn.removeAttribute('disabled');
          cleanBtn.classList.remove('btn-success');
          cleanBtn.textContent = 'Remove EXIF & Download';
        }, 2500);
      } catch (err) {
        console.error(err);
        cleanBtn.removeAttribute('disabled');
        cleanBtn.textContent = 'Remove EXIF & Download';
        if (onShowError) onShowError('Failed to remove photo metadata.');
      }
    });

    actions.appendChild(cleanBtn);
  }

  const resetBtn = el('button', {
    className: 'btn btn-secondary',
    attrs: { type: 'button', id: 'btn-reset-photo' },
    text: 'Choose Another Photo'
  });
  resetBtn.addEventListener('click', onReset);
  actions.appendChild(resetBtn);

  toolbar.appendChild(actions);
  wrap.appendChild(toolbar);

  // 2. Main Two-Column View
  const contentGrid = el('div', { className: 'content-grid' });

  // Left: Image View
  const leftCol = el('div', { className: 'media-col' });
  const previewBox = el('div', { className: 'preview-box' });
  const img = el('img', {
    className: 'preview-image',
    attrs: {
      src: previewUrl,
      alt: data.file.name,
      loading: 'lazy'
    }
  });
  previewBox.appendChild(img);
  leftCol.appendChild(previewBox);

  const dimInfo = el('div', { className: 'dim-info' });
  dimInfo.appendChild(
    el('span', {
      text: formatDimensions(
        data.dimensions.width,
        data.dimensions.height,
        data.dimensions.megapixels
      )
    })
  );
  if (data.dimensions.orientation) {
    dimInfo.appendChild(el('span', { text: formatOrientation(data.dimensions.orientation) }));
  }
  leftCol.appendChild(dimInfo);
  contentGrid.appendChild(leftCol);

  // Right: Clean Data Groups
  const rightCol = el('div', { className: 'data-col' });

  // Camera Section
  const cameraTitle = [data.camera.make, data.camera.model].filter(Boolean).join(' ').trim();
  if (cameraTitle || data.lens.model || data.software) {
    const sec = el('div', { className: 'meta-section' });
    sec.appendChild(el('h2', { className: 'section-heading', text: 'Camera & Device' }));
    const list = el('div', { className: 'data-list' });
    if (cameraTitle) list.appendChild(createMetaRow('Camera', cameraTitle)!);
    if (data.lens.model) list.appendChild(createMetaRow('Lens', data.lens.model)!);
    if (data.software) list.appendChild(createMetaRow('Software', data.software)!);
    sec.appendChild(list);
    rightCol.appendChild(sec);
  }

  // Exposure Section
  const expRows: HTMLElement[] = [];
  const addRow = (key: string, val: string | number | null | undefined) => {
    const row = createMetaRow(key, val);
    if (row) expRows.push(row);
  };

  addRow('Shutter Speed', formatExposureTime(data.exposure.exposureTime));
  addRow('Aperture', formatAperture(data.exposure.fNumber));
  addRow('ISO', formatISO(data.exposure.iso));
  addRow(
    'Focal Length',
    formatFocalLength(data.exposure.focalLength, data.exposure.focalLengthIn35mm)
  );
  addRow('Exposure Bias', formatExposureCompensation(data.exposure.exposureCompensation));
  addRow('Flash', formatFlash(data.exposure.flash));
  addRow('Metering Mode', formatMeteringMode(data.exposure.meteringMode));
  addRow('Exposure Program', formatExposureProgram(data.exposure.exposureProgram));
  addRow('White Balance', formatWhiteBalance(data.exposure.whiteBalance));

  if (expRows.length > 0) {
    const sec = el('div', { className: 'meta-section' });
    sec.appendChild(el('h2', { className: 'section-heading', text: 'Exposure Settings' }));
    const list = el('div', { className: 'data-list' });
    expRows.forEach((r) => list.appendChild(r));
    sec.appendChild(list);
    rightCol.appendChild(sec);
  }

  // GPS Location Section
  if (data.gps.latitude !== null && data.gps.longitude !== null) {
    const sec = el('div', { className: 'meta-section' });
    sec.appendChild(el('h2', { className: 'section-heading', text: 'GPS Location' }));
    const list = el('div', { className: 'data-list' });
    list.appendChild(createMetaRow('Latitude', formatCoordinate(data.gps.latitude, 'lat'))!);
    list.appendChild(createMetaRow('Longitude', formatCoordinate(data.gps.longitude, 'lon'))!);
    if (data.gps.altitude) {
      list.appendChild(createMetaRow('Altitude', formatAltitude(data.gps.altitude))!);
    }
    sec.appendChild(list);

    // Google Maps Iframe Embed
    const mapBox = el('div', { className: 'map-frame-box' });
    const mapFrame = el('iframe', {
      className: 'map-iframe',
      attrs: {
        src: `https://maps.google.com/maps?q=${encodeURIComponent(data.gps.latitude)},${encodeURIComponent(data.gps.longitude)}&hl=en&z=15&output=embed`,
        loading: 'lazy',
        referrerpolicy: 'no-referrer-when-downgrade',
        title: 'Google Maps Location'
      }
    });
    mapBox.appendChild(mapFrame);
    sec.appendChild(mapBox);

    // Map Action Links
    const mapLinks = el('div', { className: 'map-links' });
    const gmapsUrl =
      data.gps.googleMapsUrl ||
      `https://www.google.com/maps?q=${encodeURIComponent(data.gps.latitude)},${encodeURIComponent(data.gps.longitude)}`;

    const gmapsBtn = el('a', {
      className: 'btn btn-secondary btn-sm',
      attrs: {
        href: gmapsUrl,
        target: '_blank',
        rel: 'noopener noreferrer'
      },
      text: 'Open in Google Maps ↗'
    });
    mapLinks.appendChild(gmapsBtn);

    if (data.gps.osmUrl) {
      const osmLink = el('a', {
        className: 'link-subtle',
        attrs: {
          href: data.gps.osmUrl,
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        text: 'OpenStreetMap ↗'
      });
      mapLinks.appendChild(osmLink);
    }
    sec.appendChild(mapLinks);

    rightCol.appendChild(sec);
  }

  // Date & File Meta
  const fileRows: HTMLElement[] = [];
  if (data.date.taken) {
    fileRows.push(createMetaRow('Date Taken', formatDate(data.date.taken))!);
  }
  if (data.date.modified) {
    fileRows.push(createMetaRow('Date Digitized', formatDate(data.date.modified))!);
  }
  fileRows.push(createMetaRow('File Size', formatFileSize(data.file.size))!);
  fileRows.push(createMetaRow('Format', data.file.type)!);

  const fileSec = el('div', { className: 'meta-section' });
  fileSec.appendChild(el('h2', { className: 'section-heading', text: 'File & Time' }));
  const fileList = el('div', { className: 'data-list' });
  fileRows.filter(Boolean).forEach((r) => fileList.appendChild(r));
  fileSec.appendChild(fileList);
  rightCol.appendChild(fileSec);

  // Raw JSON toggle
  const jsonSec = el('div', { className: 'meta-section json-section' });
  const jsonToggle = el('button', {
    className: 'link-subtle toggle-btn',
    attrs: { type: 'button' },
    text: 'View Raw JSON'
  });
  const jsonBox = el('div', { className: 'json-box is-hidden' });
  const pre = el('pre', { className: 'json-pre' });
  pre.appendChild(el('code', { text: JSON.stringify(data.raw, null, 2) }));
  jsonBox.appendChild(pre);

  const copyBtn = el('button', {
    className: 'btn btn-secondary btn-sm',
    attrs: { type: 'button' },
    text: 'Copy JSON'
  });
  copyBtn.addEventListener('click', async () => {
    await copyToClipboard(JSON.stringify(data.raw, null, 2));
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy JSON';
    }, 2000);
  });

  const downloadBtn = el('button', {
    className: 'btn btn-secondary btn-sm',
    attrs: { type: 'button' },
    text: 'Download JSON'
  });
  downloadBtn.addEventListener('click', () => {
    downloadJSON(data.raw, `${data.file.name.replace(/\.[^/.]+$/, '')}-metadata.json`);
  });

  const jsonActions = el('div', { className: 'json-actions is-hidden' });
  jsonActions.appendChild(copyBtn);
  jsonActions.appendChild(downloadBtn);

  jsonToggle.addEventListener('click', () => {
    const hidden = jsonBox.classList.toggle('is-hidden');
    jsonActions.classList.toggle('is-hidden', hidden);
    jsonToggle.textContent = hidden ? 'View Raw JSON' : 'Hide Raw JSON';
  });

  jsonSec.appendChild(jsonToggle);
  jsonSec.appendChild(jsonActions);
  jsonSec.appendChild(jsonBox);
  rightCol.appendChild(jsonSec);

  contentGrid.appendChild(rightCol);
  wrap.appendChild(contentGrid);

  containerEl.appendChild(wrap);
  announceStatus(`Photo metadata for ${data.file.name} loaded.`);
}
