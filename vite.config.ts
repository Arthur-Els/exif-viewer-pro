/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative base path for GitHub Pages and subfolder deployments
  base: './',
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
