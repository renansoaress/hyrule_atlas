/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build pensado para abrir por file:// : caminhos relativos, um único bundle IIFE (sem módulos ES,
// que o Chrome bloqueia em file://), fontes embutidas e nenhum recurso remoto.
export default defineConfig({
  base: './',
  plugins: [react()],
  json: { stringify: true },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 200 * 1024,
    cssCodeSplit: false,
    modulePreload: false,
    sourcemap: false,
    target: 'es2019',
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
