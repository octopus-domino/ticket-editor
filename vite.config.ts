/* ============================================================
   vite.config.ts

   NFR-PERF-08: react/konva/tiptap — отдельные vendor-чанки.
   NFR-SEC-08: env через define.
   ESM-safe: __dirname через fileURLToPath(import.meta.url).
   ============================================================ */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/shared': path.resolve(ROOT, 'src/shared'),
      '@/domain': path.resolve(ROOT, 'src/domain'),
      '@/application': path.resolve(ROOT, 'src/application'),
      '@/infra': path.resolve(ROOT, 'src/infrastructure'),
      '@/lib': path.resolve(ROOT, 'src/lib'),
      '@/ui': path.resolve(ROOT, 'src/presentation'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'konva-vendor': ['konva', 'react-konva'],
          'tiptap-vendor': [
            '@tiptap/core',
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-underline',
            '@tiptap/extension-text-align',
            '@tiptap/extension-text-style',
            '@tiptap/extension-color',
            '@tiptap/extension-highlight',
            '@tiptap/extension-link',
            '@tiptap/extension-table',
            '@tiptap/extension-table-row',
            '@tiptap/extension-table-cell',
            '@tiptap/extension-table-header',
            '@tiptap/extension-font-family',
            '@tiptap/extension-gapcursor',
          ],
          'zod-vendor': ['zod'],
        },
      },
    },
  },
  server: { port: 5173 },
});