import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Локальный backend. Если Spring Boot в IntelliJ запущен на другом порту,
// переопределите через VITE_BACKEND_URL=http://localhost:8081 npm run dev
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8080';

export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
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
  // Vite читает .env* и подставляет import.meta.env.VITE_* при сборке.
  // Явно указываем корень, чтобы .env.production не потерялся.
  envDir: ROOT,
  envPrefix: 'VITE_',
  server: {
    port: 5173,
    proxy: {
      // Все API-запросы → Spring Boot.
      // Браузер видит один origin (localhost:5173) → cookie работают
      // без SameSite=None и Secure.
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/oauth2': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/login/oauth2': {
        target: BACKEND_URL,
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