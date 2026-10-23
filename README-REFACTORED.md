# Ticket Editor - Refactored Architecture

## Обзор

Проект переработан с использованием **Clean Architecture** и **SOLID** принципов.

## Архитектура

```
src/
├── domain/           # Domain Layer - бизнес-логика
│   ├── entities/     # Сущности (Slide, Element)
│   ├── repositories/ # Интерфейсы репозиториев
│   └── events/       # Event Bus для коммуникации
│
├── application/      # Application Layer - use cases
│   ├── ports/        # Интерфейсы для инфраструктуры
│   └── use-cases/    # Сценарии использования
│
├── infrastructure/   # Infrastructure Layer
│   └── store/        # Реализация state management
│
├── presentation/     # Presentation Layer
│   ├── components/   # React компоненты
│   ├── hooks/        # React hooks
│   └── providers/    # Context providers
│
└── shared/           # Shared Layer
    ├── types/        # TypeScript типы
    ├── constants/    # Константы
    └── utils/        # Утилиты
```

## Принципы

### 1. SOLID

- **S**ingle Responsibility - каждый класс/компонент имеет одну ответственность
- **O**pen/Closed - расширяемость через наследование/композицию
- **L**iskov Substitution - подтипы заменяют базовые типы
- **I**nterface Segregation - узкие интерфейсы
- **D**ependency Inversion - зависимости от абстракций

### 2. Clean Architecture

- **Domain** - не зависит от других слоёв
- **Application** - зависит только от Domain
- **Infrastructure** - реализует интерфейсы Application
- **Presentation** - зависит от Application и Infrastructure

### 3. TypeScript Best Practices

- Строгая типизация (no `any`)
- Discriminated unions для типов элементов
- Type guards для runtime проверок
- Readonly для иммутабельности

## Ключевые изменения

### До рефакторинга:
- God object `useEditorFacade.ts` (488 строк)
- Context hell с 8 контекстами
- Перегруженные хуки
- Много `any` типов

### После рефакторинга:
- Разделение на слои
- Чистые компоненты с единственной ответственностью
- Строгая типизация
- Dependency Injection
- Event-driven architecture

## Запуск

```bash
npm install
npm run dev
```

## Тестирование

```bash
npm run test
```

## Линтинг

```bash
npm run lint
```
