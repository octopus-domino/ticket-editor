/* ============================================================
   vite.config.ts
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
      '@/ui': path.resolve(ROOT, 'src/presentation'),
      '@/presentation': path.resolve(ROOT, 'src/presentation'),
      '@/shared': path.resolve(ROOT, 'src/shared'),
      '@/domain': path.resolve(ROOT, 'src/domain'),
      '@/application': path.resolve(ROOT, 'src/application'),
      '@/infra': path.resolve(ROOT, 'src/infrastructure'),
      '@/lib': path.resolve(ROOT, 'src/lib'),
      '@/auth': path.resolve(ROOT, 'src/auth'),
      '@/workspace': path.resolve(ROOT, 'src/workspace'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Все запросы к /api проксируются на Spring Boot.
      // Фронт и бэк для браузера становятся одним origin → cookie работают.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
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
          'router-vendor': ['react-router-dom'],
        },
      },
    },
  },
});