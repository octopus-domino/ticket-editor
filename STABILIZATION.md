# Состояние после рефакторинга — 2026-11-03

До изменений сохранены и отправлены исходные пользовательские правки: frontend `ba3853e`, backend `43905fc`. Исходный аудит и сравнение 12 HTML-документов требований находятся в `C:\sand_temp\project_state_2026-11-03.html`. Этот документ описывает последующий рефакторинг, а не заменяет исходную оценку полноты требований.

## Архитектура

Прикладные сценарии сохранения зависят от портов, а не от HTTP или IndexedDB. `RevisionSaveQueue` сериализует ревизии каждого ресурса отдельно; `DocumentPersistence` управляет локальным восстановлением и удалённым сохранением. Реализация локального хранилища вынесена в `IndexedDraftRepository`.

HTTP-клиент получает сессию через порт `HttpSession`; зависимость от auth store и цикл импортов устранены. Сброс состояния при смене пользователя организован в composition root. Preview разрешает данные в копии элемента и не создаёт команды истории документа.

На сервере генерация зависит от `GenerationCatalog`, `DocumentRenderer`, `DocumentPackager`, `JobStore` и `JobFileStorage`. JPA, дисковые файлы, PDF/SVG и асинхронный исполнитель находятся в адаптерах. `GenerationWorker` — отдельный Spring bean, поэтому `@Async` действительно работает через proxy.

## Изменения по замечаниям аудита

| Аудит | Реализованное изменение |
|---|---|
| F01 | Исправлены ошибки TypeScript, типы QR, ref и bulk confirmation; typecheck и lint входят в CI. |
| F02–F03 | Независимая очередь сохранения моделей, последовательные ревизии, защита новых значений от позднего ответа, flush перед reload/delete. |
| F04–F05 | Структурное обновление путей сохраняет соседей массива; запрещены опасные ключи, некорректные пути и чрезмерные индексы. |
| F06 | Исправлены индекс истории после удаления старых записей и ветвление после undo. |
| F07 | QR включён в общую JSON-схему и проверяется тестом round trip. |
| F08 | Отдельная страница редактирования шаблона, правильный repository и восстановление локального черновика. |
| F09 | Batch получает исходные слайды и отдельные значения каждой модели. |
| F10 | Общий coordinator, обязательная валидация, async для >100 моделей, отмена и повторное скачивание результата. |
| F11–F13 | Отдельный async worker, null-safe status DTO; GET polling не расходует POST rate limit. |
| F14–F15 | Подстановка QR, chart, stamp и HTML; ручные bindings и серверная валидация схемы/типов/владельца модели. |
| F16 | Nullable values больше не передаются в `Map.copyOf`; CRUD с null проверяется через HTTP. |
| F17 | Кооперативная отмена между элементами и перед публикацией; дисковые metadata/results переживают restart. Прерванные задания после restart получают failed. |
| F18 | Filename patterns, SVG embedImages/prettyPrint, структурированные ошибки и MIME, multipage PDF/PDF-A. PDF требует embedImages=true; неподдержанные PDF-версии отклоняются явно. |
| F19 | Черновики IndexedDB по owner/document, очередь ревизий, flush при уходе, статусы сохранения и retry. |
| F20 | Миграция legacy data закреплена за документом и сохраняет schemaId/modelId, не зависит от глобального выбора схемы. |
| F21 | Матрица изменяет bindings любого слайда; overrides сохраняются в документе, шаблоне и экспортируемом JSON. |
| F22 | Versioned envelope, schemaId/id, лимиты 20 MB/10000 моделей/500 полей, защита вложенного JSON, bulk import и точная сводка ошибок. |
| F23 | Общая валидация partial import, атомарное отклонение, remap ID и внутренних ссылок, лимит результата. |
| F24 | Preview не записывает значения модели в документ и не загрязняет undo. |
| F25 | Подключены FloatingProps и операции установки/снятия clip path. |
| F26 | Обводки inside/outside используют clipping/masks в Canvas и SVG/серверном рендере; исправлены SVG-контуры звезды/стрелки и серверный круг. |
| F27 | Разбор SVG и allowlist тегов/атрибутов вместо regex-only sanitization; серверная граница очищает итоговый SVG. |
| F28 | DNS проверяется непосредственно при соединении, redirects выключены, streaming limit изображений, JSON body limit, ограничения очереди/результатов/email raster. |
| F29 | Production profile, обязательный JWT_SECRET, secure cookie, H2 console off, DB исключена из Git; runtime data сохраняются в volume. |
| F30 | History budget учитывает payload строк и изображений; отдельный тест превышения 80 MB. Это консервативная оценка, не измерение heap. |
| F31 | Убрана синхронная сериализация всего документа в localStorage на каждую правку. Черновик хранится structured clone; schema inference использует immutable reference. |
| F32 | CI запускает типы, strict lint, architecture, coverage, build, E2E; Docker больше не пропускает backend tests. |
| F33 | Добавлены unit, HTTP integration, MIME/idempotency, PDF packaging и browser tests; настроен optional Sentry adapter, Micrometer counters/timer. Ограничения приёмки ниже. |
| F34 | EML получает to/cc/bcc; SMTP возвращает per-item итог, durable reservation исключает автоматическую повторную отправку при SENT/UNKNOWN. |
| F35 | Последовательный polling без перекрытия, остановка при terminal/error, защита от устаревших ответов, bookmark job по владельцу. |
| F36 | Удаление схемы учитывает также связанные шаблоны. |

## Проверка

Запуск из frontend: `npm run check`, `npm run lint:strict`, `npm run test:coverage`, `npm run build`, `npm run e2e`. Для установленного Edge: `PLAYWRIGHT_CHANNEL=msedge` (PowerShell: `$env:PLAYWRIGHT_CHANNEL='msedge'`). В CI устанавливается Chromium.

Порог покрытия сохранён: 60% lines/statements/functions, 50% branches. Расширены проверки путей, history, очередей, восстановления, генерации, JSON, SVG, rich text, таблиц, геометрии, авторизации и переключения моделей. Отчёт покрытия — `coverage/index.html` после запуска.

Контрольный прогон: frontend — 124 unit tests, 4 browser tests; coverage ≥60% lines. Backend — 23 tests и executable JAR. Zod обновлён до 4.6.7 с адаптацией record schema; JSON round-trip и отрицательные проверки сохранены.

Backend: `mvn -B verify`; интеграционные тесты используют отдельную H2 in-memory и временное хранилище генерации. Пользовательская файловая БД не используется тестами.

## Практические ограничения

- Docker daemon в окружении не запущен: проверены отдельные сборки, но полный Docker build/runtime не проверен.
- PDFBox-тест проверяет страницы, OutputIntent и XMP PDF/A после объединения. Это не формальная сертификация veraPDF и не проверка всех печатных макетов.
- Реальный SMTP и доставка в Gmail/Outlook не проверялись; автоматические тесты используют mock sender, MIME и persistent reservation semantics.
- Sentry включается только в production с `VITE_SENTRY_DSN`; `VITE_RELEASE` задаёт release. Для отдельного Sentry endpoint требуется разрешить его origin в nginx CSP connect-src либо настроить tunnel на своём origin.
- Micrometer публикуется через аутентифицированный `/actuator/metrics`; счётчик `ticket.generation.jobs` и timer `ticket.generation.duration`. Prometheus exporter не заявляется.
- Общий runtime benchmark FPS/10k моделей и все S1–S12 из требований не заменяются четырьмя browser regression scenarios. Полнота исходных функциональных требований по-прежнему отражена в HTML-аудите.
- Zod обновлён на major 4 с проверкой контрактов. `npm audit --omit=dev` после обновления: 36 moderate, 0 high, 0 critical. Полный npm audit при установке: 57 advisories (53 moderate, 1 high, 3 critical), включая инструменты разработки. Дальнейшая миграция Vite/Vitest/TipTap и их зависимостей требует отдельной проверки совместимости; зелёные функциональные тесты не означают отсутствие этих advisories.

Автоматическая приёмка подтверждает перечисленные сценарии, но не является заявлением о полной готовности всех исторических требований к production.
