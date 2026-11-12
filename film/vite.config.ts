// Dev server for the experience film only (npm run film starts it). The app's vite.config.ts is untouched.
// maplibre-gl is not pre-bundled so it can start its own module worker.
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: { port: 5179, strictPort: true },
  optimizeDeps: { exclude: ['maplibre-gl'], include: ['three'] },
});
