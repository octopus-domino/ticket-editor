/* ============================================================
   vitest.config.ts
   CQ-TEST-01..09.
   mergeConfig наследует resolve.alias из vite.config.ts, чтобы
   тесты видели '@/shared', '@/domain', и т.д.
   ============================================================ */

import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/domain/**', 'src/lib/**'],
        exclude: [
          'src/lib/stamps/bankingStamps*.ts',
          'src/lib/stamps/serviceStamps.ts',
          'src/lib/stamps/specialStamps.ts',
        ],
        thresholds: {
          lines: 60,
          functions: 60,
          statements: 60,
          branches: 50,
        },
      },
    },
  }),
);