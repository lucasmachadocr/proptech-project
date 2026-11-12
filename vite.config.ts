/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH is set by the GitHub Pages workflow to "/<repo>/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  // maplibre-gl starts its own module worker; pre-bundling would break its URL in dev.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
