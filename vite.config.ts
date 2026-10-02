/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Use /exif-viewer-pro/ for GitHub Pages production builds, '/' for local dev
  base: process.env.NODE_ENV === 'production' ? '/exif-viewer-pro/' : '/',
  server: {
    port: 5173,
    open: false
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/types/**', 'src/workers/**', '**/*.d.ts']
    }
  }
});
