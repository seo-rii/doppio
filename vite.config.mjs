import {defineConfig} from 'vite';
import inject from '@rollup/plugin-inject';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function rootPath(...parts) {
  return path.resolve(rootDir, ...parts);
}

function replaceLegacyJsonIncludes() {
  const replacements = {
    'jdk.json': rootPath('vendor', 'java_home', 'jdk.json'),
    'package.json': rootPath('package.json'),
    'benchmarks.json': rootPath('vendor', 'benchmarks', 'benchmarks.json')
  };

  return {
    name: 'doppio-legacy-json-includes',
    resolveId(source) {
      return replacements[path.basename(source)] || null;
    }
  };
}

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: rootPath('build', 'release-cli', 'src', 'index.js'),
      fileName: () => 'doppio.js',
      formats: ['umd'],
      name: 'Doppio'
    },
    minify: 'esbuild',
    outDir: rootPath('build', 'release'),
    sourcemap: true,
    target: 'es2015',
    commonjsOptions: {
      include: [/[\\/]build[\\/]release-cli[\\/]/, /node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      external: ['browserfs'],
      output: {
        globals: {
          browserfs: 'BrowserFS'
        }
      },
      plugins: [
        replaceLegacyJsonIncludes(),
        inject({
          Buffer: rootPath('node_modules', 'browserfs', 'dist', 'shims', 'bufferGlobal.js'),
          process: rootPath('node_modules', 'browserfs', 'dist', 'shims', 'process.js')
        })
      ]
    }
  },
  resolve: {
    alias: {
      BFSBuffer: rootPath('node_modules', 'browserfs', 'dist', 'shims', 'bufferGlobal.js'),
      buffer: rootPath('node_modules', 'browserfs', 'dist', 'shims', 'buffer.js'),
      crypto: rootPath('build-shims', 'crypto.mjs'),
      fs: rootPath('node_modules', 'browserfs', 'dist', 'shims', 'fs.js'),
      path: rootPath('node_modules', 'browserfs', 'dist', 'shims', 'path.js'),
      process: rootPath('node_modules', 'browserfs', 'dist', 'shims', 'process.js')
    }
  }
});
