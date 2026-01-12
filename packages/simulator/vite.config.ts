import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: './', // Use relative paths for ingress compatibility
  publicDir: false, // Disable copying public dir to avoid including node_modules
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
