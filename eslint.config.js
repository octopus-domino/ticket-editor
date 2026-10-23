// eslint.config.js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig(
  {
    ignores: [
      'dist/**', 'node_modules/**', 'coverage/**', 'scripts/**',
      '.imports-backup/**', '**/.imports-backup/**', 'src/.imports-backup/**',
      'eslint.config.js', 'vite.config.ts', 'vitest.config.ts',
      'playwright.config.ts', '.dependency-cruiser.cjs',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: ['eslint.config.js'],
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },

  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: false,
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      complexity: 'off',
      'max-params': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Легаси и сложная логика (отключаем шум для постепенного рефакторинга)
  {
    files: [
      'src/lib/**/*.ts',
      'src/lib/**/*.tsx',
      'src/presentation/hooks/**/*.ts',
      'src/presentation/hooks/**/*.tsx',
      'src/presentation/components/**/*.tsx',
      'src/templates/**/*.ts',
      'src/services/**/*.ts',
      'src/workers/**/*.ts',
    ],
    rules: {
      complexity: 'off',
      'max-params': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);