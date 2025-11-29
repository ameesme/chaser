import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false, // Disable public directory feature
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
