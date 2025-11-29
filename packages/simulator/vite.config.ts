import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      '@chaser/core': resolve(__dirname, '../core/src'),
      '@chaser/types': resolve(__dirname, '../types/src')
    }
  }
});
