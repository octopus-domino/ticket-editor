// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\/ui$/, replacement: path.resolve(root, 'src/presentation') },
      { find: /^@\/ui\//, replacement: path.resolve(root, 'src/presentation') + '/' },
      { find: /^@\/infra$/, replacement: path.resolve(root, 'src/infrastructure') },
      { find: /^@\/infra\//, replacement: path.resolve(root, 'src/infrastructure') + '/' },
      { find: /^@\//, replacement: path.resolve(root, 'src') + '/' },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**', 'coverage/**'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/domain/**/*.ts', 'src/lib/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/**/types.ts',

        // 1. Статические конфиги/шаблоны (сотни строк объект-литералов, логики нет)
        'src/lib/stamps/bankingStamps.ts',
        'src/lib/stamps/bankingStampsFilled.ts',
        'src/lib/stamps/bankingStampsWithImages.ts',
        'src/lib/stamps/serviceStamps.ts',
        'src/lib/stamps/specialStamps.ts',
        'src/lib/stamps/library.ts',

        // 2. Жесткая зависимость от Browser API (Canvas, Path2D, Worker)
        'src/lib/canvas/**',
        'src/lib/stamps/fillGeometry.ts',
        'src/lib/stamps/fillRasterizer.ts',
        'src/lib/stamps/rasterFill.ts',
        'src/lib/graphics/shapeContour.ts',
        'src/lib/stamps/shapes/strategies.ts', // buildRectPath relies on Path2D

        // 3. Fetch/CORS/Blob/Image
        'src/lib/embedImages.ts',
        'src/lib/serverExport.ts',
        'src/lib/qr.ts',
        'src/lib/download.ts',
        'src/lib/imageTools.ts',
        'src/lib/modelBinding.ts',
        'src/lib/svg/exporters.ts', // heavy DOM/serialization

        // 4. Шимы (re-exports)
        'src/lib/richText.ts',
        'src/lib/richText/parser.ts',
        'src/lib/richText/parser/index.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});