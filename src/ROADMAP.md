# ROADMAP: strict-флаги

## Отключены временно (шаг 1)

- `noUncheckedIndexedAccess` — вернуть в шаге 7 после переписывания
  legacy-файлов (`lib/stamps/*`, `lib/richText/parser/*`, `presentation/*`).
- `noUnusedLocals` — вернуть в шаге 7.
- `noUnusedParameters` — вернуть в шаге 7.

## Условия возврата

- `noUncheckedIndexedAccess` — после шага 6 (SVG serializers)
  все `arr[i]` имеют guard или invariant.
- `noUnusedLocals/Parameters` — после чистки неиспользуемого
  в `presentation/*` (шаги 4–5).

## Контроль

`npm run typecheck` должен быть зелёным на каждом шаге.
При включении флага — отдельный PR с прогоном.