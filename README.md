# Photo Metadata Viewer 📸

[![CI Quality Gate](https://github.com/Arthur-Els/exif-viewer-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/Arthur-Els/exif-viewer-pro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6.svg)](https://www.typescriptlang.org/)

A production-grade, privacy-first client-side web application to inspect and analyze EXIF, IPTC, XMP, and GPS metadata from photos. Built with strict TypeScript, Vite, Web Workers, and zero backend dependencies.

[🌐 **Buka Live Demo**](https://arthur-els.github.io/exif-viewer-pro/)

---

## Pratinjau Tampilan (Screenshot)

```
+-----------------------------------------------------------------------------------+
|  [📷] Photo Metadata Viewer                                                       |
|  [🛡️ Foto diproses di perangkatmu dan tidak diupload ke server.]                 |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |             [ ⬆️ ] Pilih atau Seret Foto ke Sini                            |  |
|  |         Mendukung JPEG, PNG, WebP, HEIC, TIFF • Maks. 25 MB                 |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  [ Pratinjau Foto ]          [ Ringkasan Pengaturan ]                             |
|  +---------------+           [ Sony ILCE-7RM4 ] [ f/1.8 ] [ 1/250 s ] [ ISO 100 ] |
|  |               |                                                                |
|  |   IMG_001.JPG |           [ Kartu Informasi File ] [ Kartu Pengaturan Lensa ]  |
|  |               |           [ Kartu Eksposur       ] [ Kartu Lokasi GPS       ]  |
|  +---------------+           [ Tautan OpenStreetMap ↗]                            |
|                              [ Tampilkan Data Mentah (Raw JSON)               ]   |
+-----------------------------------------------------------------------------------+
```

_(Placeholder screenshot: Simpan tangkapan layar antarmuka aplikasi ke `./docs/screenshot.png` untuk dokumentasi visual)._

---

## Fitur Utama (Features)

1. **Validasi File Magic Bytes Asli**:
   - Memeriksa struktur biner _magic bytes_ nyata (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`, TIFF `II*`/`MM*`, HEIC/AVIF `ftyp`), bukan hanya ekstensi berkas.
   - Validasi batas ukuran file hingga **25 MB** dengan notifikasi bahasa Indonesia yang jelas.

2. **Pemrosesan di Latar Belakang (Web Worker)**:
   - Pembongkaran struktur EXIF dilakukan di dalam dedicated Web Worker (`src/workers/metadata.worker.ts`) menggunakan _transferable ArrayBuffer_, sehingga antarmuka tetap responsif 60 FPS tanpa _lag_.

3. **Keamanan & Standar Ketat (Zero-XSS & CSP)**:
   - Seluruh nilai metadata dirender murni melalui `textContent` dan manipulasi DOM aman.
   - Dilengkapi _Content Security Policy_ (CSP) statis untuk mencegah injeksi skrip eksternal atau pelacak.

4. **Pengelompokan Metadata Lengkap**:
   - **File**: Nama, MIME type, ukuran file aktual dan terformat, serta tanggal modifikasi.
   - **Kamera & Lensa**: Make, model kamera, dan profil lensa.
   - **Pengaturan Eksposur**: ISO, aperture (`f/1.8`), shutter speed (`1/250 s`), focal length (`35 mm & setara full-frame`), status blitz, exposure program, EV bias, white balance, dan metering mode.
   - **Tanggal & Waktu**: Waktu jepretan asli (_DateTimeOriginal_) dan waktu digital.
   - **Dimensi**: Resolusi piksel, megapiksel (MP), dan orientasi sensor.
   - **GPS & Lokasi**: Derajat, Menit, Detik (DMS) + koordinat desimal, ketinggian, serta tombol navigasi langsung ke **OpenStreetMap**.

5. **Eksplorasi Data Mentah (Raw JSON)**:
   - Penampil JSON yang dapat diciutkan (_collapsible_).
   - Tombol **Salin JSON** dengan indikator _feedback_ instan dan tombol **Unduh JSON** (`${foto}-metadata.json`).

6. **Aksesibilitas & Tema Otomatis (WCAG AA Compliant)**:
   - Navigasi keyboard penuh (`Enter`/`Space` pada dropzone).
   - Kontras warna teks memenuhi standar WCAG AA/AAA.
   - _Screen reader announcements_ via `aria-live="polite"`.
   - Dark mode otomatis sesuai preferensi sistem operasi (`prefers-color-scheme`).

---

## Tech Stack

- **Runtime & Bundler**: [Vite](https://vitejs.dev/) (ES Modules)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Metadata Engine**: [`exifr`](https://github.com/MikeKovarik/exifr) (Full Segment Parser: TIFF, EXIF, GPS, IPTC, XMP, ICC)
- **Concurrency**: HTML5 Web Worker (`DedicatedWorkerGlobalScope`)
- **Styling**: Vanilla CSS dengan CSS Custom Properties (Tokens)
- **Testing**: [Vitest](https://vitest.dev/) + `@vitest/coverage-v8`
- **Code Quality**: ESLint v9 (Flat Config with `typescript-eslint`) + Prettier
- **CI/CD**: GitHub Actions (Lint, Typecheck, Test, Build, GitHub Pages Deployment)

---

## Arsitektur & Tanggung Jawab Modul (Architecture Overview)

```text
photo-metadata-viewer/
├─ .github/workflows/
│  ├─ ci.yml                  # CI: Typecheck, Lint, Vitest, Build
│  └─ deploy.yml              # CD: Otomatis deploy ke GitHub Pages
├─ tests/
│  ├─ fixtures/               # Sampel biner JPEG (EXIF), PNG, WebP, dan file uji
│  └─ unit/                   # Unit test: formatter, parser, validator, utils
├─ src/
│  ├─ main.ts                 # Titik masuk utama, orkestrasi DOM, preview lifecycle
│  ├─ vite-env.d.ts           # Definisi tipe ambient Vite (CSS, Workers)
│  ├─ types/
│  │  └─ metadata.ts          # Kontrak interface TypeScript (NormalizedMetadata, dll.)
│  ├─ workers/
│  │  └─ metadata.worker.ts   # Web Worker untuk pemrosesan file di thread latar belakang
│  ├─ js/
│  │  ├─ file-validator.ts    # Pemeriksaan Magic Bytes biner & batas 25 MB
│  │  ├─ dropzone.ts          # Drag-and-drop, dialog file, keyboard listener
│  │  ├─ worker-client.ts     # Jembatan komunikasi ArrayBuffer dengan worker (+ fallback)
│  │  ├─ metadata-parser.ts   # Pembungkus exifr & normalisasi segmen metadata
│  │  ├─ metadata-formatter.ts# Konversi nilai mentah menjadi notasi ramah fotografi
│  │  ├─ renderer.ts          # Pembangun DOM kartu metadata (XSS Safe via textContent)
│  │  └─ utils.ts             # Helper formatBytes, formatDate (id-ID), copy, download
│  └─ styles/
│     ├─ base.css             # CSS reset, token variabel, dark mode, tipografi
│     └─ components.css       # Style dropzone, cards, table rows, button states
├─ index.html                 # Markup semantik dengan CSP meta tag
├─ tsconfig.json              # Konfigurasi TypeScript strict
├─ eslint.config.js           # Konfigurasi ESLint flat
├─ .prettierrc                # Format kode konsisten
└─ vite.config.ts             # Konfigurasi bundler Vite & runner Vitest
```

---

## Keputusan Desain: Mengapa Client-Side Saja? (Design Decisions)

1. **Privasi & Keamanan Pengguna 100%**:
   Metadata foto sering memuat informasi sensitif seperti koordinat rumah (GPS), nama pemilik, serial kamera, hingga waktu kegiatan pribadi. Dengan arsitektur murni _client-side_, foto tidak pernah dikirim ke jaringan mana pun.
2. **Kinerja Instan Tanpa Latensi Unggah**:
   Mengunggah file foto beresolusi tinggi (10 MB – 25 MB) ke server membutuhkan bandwidth dan waktu. Di peramban, pembacaan file lokal memakan waktu kurang dari 50 milidetik.
3. **Biaya Infrastruktur Nol ($0 Hosting)**:
   Aplikasi statis dapat di-hosting secara gratis di GitHub Pages, Cloudflare Pages, atau Vercel tanpa kebutuhan server Node.js, database, atau tagihan cloud.
4. **Isolasi Beban Komputasi via Web Worker**:
   Membongkar struktur biner TIFF/EXIF berukuran besar dapat menyebabkan _jank_ pada animasi antarmuka. Dengan memindahkannya ke Web Worker, thread UI utama tetap mulus.

---

## Cara Menjalankan & Mengembangkan (Development Guide)

### 1. Menjalankan Server Lokal

```bash
# Masuk ke direktori
cd photo-metadata-viewer

# Pasang dependensi
npm install

# Jalankan dev server Vite
npm run dev
```

Buka URL lokal yang muncul di terminal (biasanya `http://localhost:5173`).

### 2. Menjalankan Pengujian (Testing)

```bash
# Menjalankan seluruh pengujian unit Vitest
npm test

# Menjalankan pengujian dengan laporan cakupan kode (coverage)
npm run test:coverage
```

### 3. Pengecekan Kualitas Kode (Linting & Typecheck)

```bash
# Validasi tipe TypeScript secara ketat
npm run typecheck

# Analisis kode statis dengan ESLint
npm run lint

# Format kode otomatis dengan Prettier
npm run format
```

### 4. Membangun Bundel Produksi

```bash
npm run build
```

Hasil kompilasi siap saji akan dibuat di folder `dist/`. Anda dapat mengujinya dengan:

```bash
npm run preview
```

---

## Panduan Deploy ke GitHub Pages

Proyek ini telah dikonfigurasi dengan alur kerja GitHub Actions otomatis di [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Pastikan repository Anda di-push ke GitHub:
   ```bash
   git add .
   git commit -m "feat: upgrade photo metadata viewer to production quality"
   git push origin main
   ```
2. Pada repository GitHub Anda, buka **Settings** -> **Pages**.
3. Pada opsi **Build and deployment** > **Source**, pilih **GitHub Actions**.
4. Setiap push ke branch `main` akan secara otomatis memicu pengecekan kualitas CI dan mempublikasikan aplikasi ke GitHub Pages.

---

## Lisensi (License)

Dilisensikan di bawah [MIT License](LICENSE).
