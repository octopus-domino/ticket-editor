# ticket-editor

[![CI](https://github.com/octopus-domino/ticket-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/octopus-domino/ticket-editor/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Визуальный редактор для проектирования билетов, бланков и документов. Canvas на Konva, rich-text на TipTap, экспорт в SVG, PDF и PDF/A через серверный рендерер [`ticket-pdf`](../ticket-pdf).

---

## Возможности

- **Canvas-редактор** (Konva) с drag & drop, трансформером, снапами, группами, слоями.
- **Rich Text** (TipTap) — форматирование, таблицы с per-side границами, вложенные списки.
- **Штампы и печати** — векторные фигуры, текст по дуге, заливка областей (anchor-fill).
- **Pathfinder** — union / subtract / intersect / xor через `polyclip-ts`.
- **Undo / Redo** (immer + лимиты по количеству и по байтам), автосохранение в localStorage.
- **Экспорт**:
  - JSON (импорт/экспорт документа целиком).
  - SVG (локально, `lib/svg/serialize.ts`).
  - SVG, PDF, PDF/A через `ticket-pdf` (встраивание картинок, встроенные шрифты).
- **Шаблоны** — типовые макеты и готовые бандлы (билет, заявление, каталог и т.д.).
- **Feature flags** — `src/shared/flags.ts`, включаются через `VITE_FEATURE_*`.

---

## Quick start

**Требования:** Node.js ≥ 20, npm ≥ 10.

```bash
# 1. Установить зависимости
npm install

# 2. (Опционально) настроить .env
cp .env.example .env
# По умолчанию: VITE_EXPORT_API=http://localhost:8080/api/export

# 3. Запустить dev-сервер
npm run dev