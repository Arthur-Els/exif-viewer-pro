/**
 * @fileoverview DOM Renderer module for the Photo Metadata Viewer.
 * Builds and mounts the image preview, metadata cards, empty states, and raw JSON viewer.
 *
 * CRITICAL SECURITY: All metadata values are strictly rendered using `textContent`
 * to protect against stored XSS attacks from crafted EXIF tags.
 */

import {
  formatAperture,
  formatAltitude,
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
import type { NormalizedMetadata } from '../types/metadata.js';

interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string | null | undefined>;
  children?: (Node | string)[];
}

/**
 * Safe DOM element factory with textContent escaping.
 */
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

/**
 * Create SVG Icon element safely.
 */
function createSvgIcon(pathData: string, viewBox: string = '0 0 24 24'): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', 'meta-card-icon');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.appendChild(path);

  return svg;
}

/**
 * Create a metadata key-value row.
 */
function createMetaRow(
  label: string,
  value: string | number | null | undefined,
  subtext: string = ''
): HTMLElement {
  const row = el('div', { className: 'meta-row' });
  const keyEl = el('span', { className: 'meta-key', text: label });

  const valContainer = el('div', { className: 'meta-val-wrapper' });
  const valEl = el('span', {
    className: 'meta-val',
    text: value !== null && value !== undefined && value !== '' ? String(value) : '-'
  });
  valContainer.appendChild(valEl);

  if (subtext) {
    const subEl = el('span', { className: 'meta-subval', text: subtext });
    valContainer.appendChild(subEl);
  }

  row.appendChild(keyEl);
  row.appendChild(valContainer);
  return row;
}

/**
 * Create a categorized metadata card.
 */
function createCard(title: string, icon: SVGElement, rows: HTMLElement[]): HTMLElement {
  const card = el('section', { className: 'meta-card' });

  const header = el('div', { className: 'meta-card-header' });
  if (icon) header.appendChild(icon);

  const titleEl = el('h3', { className: 'meta-card-title', text: title });
  header.appendChild(titleEl);

  const body = el('div', { className: 'meta-card-body' });
  for (const row of rows) {
    body.appendChild(row);
  }

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

/**
 * Render the summary badge bar (Quick EXIF specs: Camera, Aperture, Shutter, ISO, Lens).
 */
function createQuickSpecsBar(data: NormalizedMetadata): HTMLElement | null {
  const pills: { label: string; val: string; icon: string }[] = [];

  // Camera model
  const cameraParts = [data.camera.make, data.camera.model].filter(Boolean) as string[];
  const cameraName = cameraParts.reduce(
    (acc, curr) => (acc.includes(curr) ? acc : `${acc} ${curr}`.trim()),
    ''
  );

  if (cameraName) {
    pills.push({
      label: 'Kamera',
      val: cameraName,
      icon: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'
    });
  }

  // Aperture
  if (data.exposure.fNumber) {
    pills.push({
      label: 'Diafragma',
      val: formatAperture(data.exposure.fNumber),
      icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'
    });
  }

  // Shutter Speed
  if (data.exposure.exposureTime) {
    pills.push({
      label: 'Kecepatan Rana',
      val: formatExposureTime(data.exposure.exposureTime),
      icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'
    });
  }

  // ISO
  if (data.exposure.iso) {
    pills.push({
      label: 'Sensitivitas',
      val: formatISO(data.exposure.iso),
      icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z'
    });
  }

  // Focal Length
  if (data.exposure.focalLength) {
    pills.push({
      label: 'Fokus',
      val: formatFocalLength(data.exposure.focalLength),
      icon: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z'
    });
  }

  if (pills.length === 0) return null;

  const bar = el('div', {
    className: 'quick-specs-bar',
    attrs: { 'aria-label': 'Ringkasan Cepat Pengaturan Foto' }
  });

  for (const item of pills) {
    const pill = el('div', { className: 'spec-pill' });
    const icon = createSvgIcon(item.icon);
    const content = el('div', { className: 'spec-pill-content' });
    const lbl = el('span', { className: 'spec-pill-label', text: item.label });
    const val = el('span', { className: 'spec-pill-val', text: item.val });

    content.appendChild(lbl);
    content.appendChild(val);
    pill.appendChild(icon);
    pill.appendChild(content);
    bar.appendChild(pill);
  }

  return bar;
}

/**
 * Render friendly empty state when no photographic EXIF metadata is present.
 */
function createEmptyMetadataNotice(): HTMLElement {
  const notice = el('div', { className: 'empty-metadata-notice' });

  const icon = createSvgIcon(
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  );
  icon.classList.add('empty-notice-icon');

  const title = el('h4', {
    className: 'empty-notice-title',
    text: 'Foto Ini Tidak Memiliki Metadata EXIF / Kamera'
  });

  const desc = el('p', {
    className: 'empty-notice-desc',
    text: 'Banyak aplikasi pesan (seperti WhatsApp, Telegram) dan media sosial (seperti Instagram, Facebook, X) secara otomatis menghapus metadata saat foto dikirim atau diunggah. Hal ini bertujuan untuk melindungi privasi pengirim dan menghemat kuota melalui kompresi data.'
  });

  const tip = el('p', {
    className: 'empty-notice-tip',
    text: '💡 Tips: Agar metadata lengkap tetap terbaca, gunakan file foto asli langsung dari kamera atau galeri ponsel (misal dikirim dalam bentuk "Dokumen/File").'
  });

  notice.appendChild(icon);
  notice.appendChild(title);
  notice.appendChild(desc);
  notice.appendChild(tip);

  return notice;
}

/**
 * Render the Raw JSON explorer card with copy and download controls.
 */
function createRawJsonSection(
  rawData: Record<string, unknown>,
  fileName: string,
  announceStatus: (msg: string) => void
): HTMLElement {
  const section = el('section', { className: 'meta-card raw-json-section' });

  const header = el('div', { className: 'meta-card-header raw-json-header' });
  const icon = createSvgIcon('M16 18l6-6-6-6M8 6l-6 6 6 6');
  const title = el('h3', { className: 'meta-card-title', text: 'Data Mentah (Raw JSON)' });

  const actions = el('div', { className: 'raw-json-actions' });

  // Toggle Collapse Button
  const toggleBtn = el('button', {
    className: 'btn btn-outline btn-sm',
    attrs: {
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': 'raw-json-content',
      id: 'btn-toggle-json'
    },
    text: 'Tampilkan JSON'
  });

  // Copy JSON Button
  const copyBtn = el('button', {
    className: 'btn btn-outline btn-sm',
    attrs: {
      type: 'button',
      id: 'btn-copy-json',
      title: 'Salin JSON ke clipboard'
    },
    text: 'Salin JSON'
  });

  // Download JSON Button
  const downloadBtn = el('button', {
    className: 'btn btn-primary btn-sm',
    attrs: {
      type: 'button',
      id: 'btn-download-json',
      title: 'Unduh file metadata.json'
    },
    text: 'Unduh JSON'
  });

  actions.appendChild(toggleBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(downloadBtn);

  header.appendChild(icon);
  header.appendChild(title);
  header.appendChild(actions);

  // Content block (initially collapsed)
  const jsonContent = el('div', {
    className: 'raw-json-body is-hidden',
    attrs: { id: 'raw-json-content' }
  });

  const pre = el('pre', { className: 'raw-json-code' });
  const code = el('code', {
    text: JSON.stringify(rawData, null, 2)
  });
  pre.appendChild(code);
  jsonContent.appendChild(pre);

  // Toggle behavior
  toggleBtn.addEventListener('click', () => {
    const isHidden = jsonContent.classList.toggle('is-hidden');
    const isExpanded = !isHidden;
    toggleBtn.setAttribute('aria-expanded', String(isExpanded));
    toggleBtn.textContent = isExpanded ? 'Sembunyikan JSON' : 'Tampilkan JSON';
    announceStatus(isExpanded ? 'Data mentah JSON ditampilkan' : 'Data mentah JSON disembunyikan');
  });

  // Copy behavior
  copyBtn.addEventListener('click', async () => {
    const success = await copyToClipboard(JSON.stringify(rawData, null, 2));
    if (success) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Tersalin!';
      copyBtn.classList.add('btn-success');
      announceStatus('JSON berhasil disalin ke clipboard.');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('btn-success');
      }, 2000);
    } else {
      alert('Gagal menyalin ke clipboard.');
    }
  });

  // Download behavior
  downloadBtn.addEventListener('click', () => {
    const safeBaseName = (fileName || 'foto').replace(/\.[^/.]+$/, '');
    downloadJSON(rawData, `${safeBaseName}-metadata.json`);
    announceStatus('File JSON sedang diunduh.');
  });

  section.appendChild(header);
  section.appendChild(jsonContent);

  return section;
}

export interface RenderResultsOptions {
  containerEl: HTMLElement;
  data: NormalizedMetadata;
  previewUrl: string;
  onReset: () => void;
  announceStatus: (message: string) => void;
}

/**
 * Main DOM renderer for metadata results.
 */
export function renderResults({
  containerEl,
  data,
  previewUrl,
  onReset,
  announceStatus
}: RenderResultsOptions): void {
  if (!containerEl) return;

  // Clear existing content safely
  containerEl.replaceChildren();

  const resultsWrapper = el('div', { className: 'results-wrapper' });

  // 1. Top Bar with Action (Change Photo)
  const topBar = el('div', { className: 'results-top-bar' });
  const topBarTitle = el('div', { className: 'top-bar-info' });
  const fileNameH2 = el('h2', { className: 'photo-title', text: data.file.name });
  const fileMetaSpan = el('span', {
    className: 'photo-subtitle',
    text: `${formatFileSize(data.file.size)} • ${data.file.type}`
  });
  topBarTitle.appendChild(fileNameH2);
  topBarTitle.appendChild(fileMetaSpan);

  const resetBtn = el('button', {
    className: 'btn btn-outline',
    attrs: { type: 'button', id: 'btn-reset-photo' },
    text: 'Pilih Foto Lain'
  });
  resetBtn.addEventListener('click', onReset);

  topBar.appendChild(topBarTitle);
  topBar.appendChild(resetBtn);
  resultsWrapper.appendChild(topBar);

  // 2. Main Two-Column Layout (Preview & Metadata Grid)
  const mainGrid = el('div', { className: 'results-layout-grid' });

  // Left column: Image preview card
  const previewCard = el('div', { className: 'preview-card' });
  const imgWrapper = el('div', { className: 'preview-image-wrapper' });
  const imgEl = el('img', {
    className: 'preview-image',
    attrs: {
      src: previewUrl,
      alt: `Pratinjau foto ${data.file.name}`,
      loading: 'lazy'
    }
  });
  imgWrapper.appendChild(imgEl);

  const previewFooter = el('div', { className: 'preview-card-footer' });
  const previewDimText = el('span', {
    className: 'preview-badge',
    text: formatDimensions(
      data.dimensions.width,
      data.dimensions.height,
      data.dimensions.megapixels
    )
  });
  previewFooter.appendChild(previewDimText);

  previewCard.appendChild(imgWrapper);
  previewCard.appendChild(previewFooter);
  mainGrid.appendChild(previewCard);

  // Right column: Metadata cards container
  const metadataColumn = el('div', { className: 'metadata-column' });

  // Quick specs pill bar
  const quickSpecs = createQuickSpecsBar(data);
  if (quickSpecs) {
    metadataColumn.appendChild(quickSpecs);
  }

  // If no photographic metadata found, display friendly empty state
  if (!data.hasMetadata) {
    metadataColumn.appendChild(createEmptyMetadataNotice());
  }

  // Cards Grid
  const cardsGrid = el('div', { className: 'cards-grid' });

  // --- CARD 1: INFORMASI FILE ---
  const fileCard = createCard(
    'Informasi File',
    createSvgIcon('M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7'),
    [
      createMetaRow('Nama File', data.file.name),
      createMetaRow('Tipe File', data.file.type),
      createMetaRow('Ukuran File', formatFileSize(data.file.size)),
      createMetaRow('Terakhir Dimodifikasi', formatDate(data.file.lastModified))
    ]
  );
  cardsGrid.appendChild(fileCard);

  // --- CARD 2: KAMERA ---
  if (data.camera.make || data.camera.model) {
    const cameraCard = createCard(
      'Kamera',
      createSvgIcon(
        'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
      ),
      [
        createMetaRow('Merek Kamera', data.camera.make),
        createMetaRow('Model Kamera', data.camera.model)
      ]
    );
    cardsGrid.appendChild(cameraCard);
  }

  // --- CARD 3: LENSA ---
  if (data.lens.model || data.lens.make) {
    const lensCard = createCard(
      'Lensa',
      createSvgIcon('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'),
      [
        createMetaRow('Model Lensa', data.lens.model),
        createMetaRow('Pembuat Lensa', data.lens.make)
      ]
    );
    cardsGrid.appendChild(lensCard);
  }

  // --- CARD 4: PENGATURAN EKSPOSUR ---
  const hasExposureData =
    data.exposure.iso ||
    data.exposure.fNumber ||
    data.exposure.exposureTime ||
    data.exposure.focalLength ||
    data.exposure.flash !== null ||
    data.exposure.exposureProgram ||
    data.exposure.exposureCompensation !== null ||
    data.exposure.whiteBalance ||
    data.exposure.meteringMode;

  if (hasExposureData) {
    const exposureCard = createCard(
      'Pengaturan Eksposur',
      createSvgIcon(
        'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'
      ),
      [
        createMetaRow('Sensitivitas (ISO)', formatISO(data.exposure.iso)),
        createMetaRow('Diafragma (Aperture)', formatAperture(data.exposure.fNumber)),
        createMetaRow(
          'Kecepatan Rana (Shutter Speed)',
          formatExposureTime(data.exposure.exposureTime)
        ),
        createMetaRow(
          'Panjang Fokus (Focal Length)',
          formatFocalLength(data.exposure.focalLength, data.exposure.focalLengthIn35mm)
        ),
        createMetaRow('Blitz (Flash)', formatFlash(data.exposure.flash)),
        createMetaRow(
          'Mode Program Eksposur',
          formatExposureProgram(data.exposure.exposureProgram)
        ),
        createMetaRow(
          'Kompensasi Eksposur',
          formatExposureCompensation(data.exposure.exposureCompensation)
        ),
        createMetaRow(
          'Keseimbangan Putih (White Balance)',
          formatWhiteBalance(data.exposure.whiteBalance)
        ),
        createMetaRow('Mode Pengukuran (Metering)', formatMeteringMode(data.exposure.meteringMode))
      ]
    );
    cardsGrid.appendChild(exposureCard);
  }

  // --- CARD 5: TANGGAL ---
  if (data.date.taken || data.date.modified) {
    const dateCard = createCard(
      'Tanggal & Waktu',
      createSvgIcon(
        'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z'
      ),
      [
        createMetaRow('Waktu Pengambilan Foto', formatDate(data.date.taken)),
        createMetaRow('Waktu Modifikasi Digital', formatDate(data.date.modified))
      ]
    );
    cardsGrid.appendChild(dateCard);
  }

  // --- CARD 6: DIMENSI ---
  const dimensionCard = createCard(
    'Dimensi & Orientasi',
    createSvgIcon(
      'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4'
    ),
    [
      createMetaRow('Resolusi', formatDimensions(data.dimensions.width, data.dimensions.height)),
      createMetaRow('Megapiksel', data.dimensions.megapixels),
      createMetaRow('Orientasi', formatOrientation(data.dimensions.orientation))
    ]
  );
  cardsGrid.appendChild(dimensionCard);

  // --- CARD 7: SOFTWARE ---
  if (data.software) {
    const softwareCard = createCard(
      'Perangkat Lunak',
      createSvgIcon('M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'),
      [createMetaRow('Software / Editor', data.software)]
    );
    cardsGrid.appendChild(softwareCard);
  }

  // --- CARD 8: GPS & LOKASI ---
  if (data.gps.latitude !== null && data.gps.longitude !== null) {
    const gpsRows = [
      createMetaRow('Garis Lintang (Latitude)', formatCoordinate(data.gps.latitude, 'lat')),
      createMetaRow('Garis Bujur (Longitude)', formatCoordinate(data.gps.longitude, 'lon')),
      createMetaRow('Ketinggian (Altitude)', formatAltitude(data.gps.altitude))
    ];

    if (data.gps.osmUrl) {
      const osmRow = el('div', { className: 'meta-row meta-row-action' });
      const osmLink = el('a', {
        className: 'btn btn-outline btn-osm',
        attrs: {
          href: data.gps.osmUrl,
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        text: 'Buka Lokasi di OpenStreetMap ↗'
      });
      osmRow.appendChild(osmLink);
      gpsRows.push(osmRow);
    }

    const gpsCard = createCard(
      'Lokasi GPS',
      createSvgIcon(
        'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z'
      ),
      gpsRows
    );
    cardsGrid.appendChild(gpsCard);
  }

  metadataColumn.appendChild(cardsGrid);

  // 3. Raw JSON Section
  const rawJsonSection = createRawJsonSection(data.raw, data.file.name, announceStatus);
  metadataColumn.appendChild(rawJsonSection);

  mainGrid.appendChild(metadataColumn);
  resultsWrapper.appendChild(mainGrid);

  containerEl.appendChild(resultsWrapper);

  // Scroll smoothly to results
  resultsWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Announce for accessibility
  announceStatus(`Metadata foto ${data.file.name} berhasil dimuat.`);
}
