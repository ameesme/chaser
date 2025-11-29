import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  publicDir: resolve(__dirname, '../../'), // Serve files from project root (including config.json)
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
