import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: process.env.INGRESS_PATH || '/', // Support for Home Assistant ingress
  publicDir: false, // Disable copying public dir to avoid including node_modules
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
