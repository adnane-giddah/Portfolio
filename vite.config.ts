import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works from a subfolder on GitHub Pages
  base: './',
  build: { outDir: 'dist', sourcemap: false },
});
