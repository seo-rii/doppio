import {defineConfig} from 'vite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  root: path.resolve(rootDir, 'website'),
  publicDir: false,
  build: {
    emptyOutDir: false,
    outDir: path.resolve(rootDir, 'docs'),
    rollupOptions: {
      input: {
        home: path.resolve(rootDir, 'website', 'index.html'),
        docs: path.resolve(rootDir, 'website', 'docs.html'),
        playground: path.resolve(rootDir, 'website', 'playground', 'index.html')
      }
    },
    target: 'es2022'
  }
});
