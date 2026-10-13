import type {
  Slide, TextElement, ShapeElement, LineElement, FooterElement,
} from '../types';
import { uid } from '../lib/uid';

/* ---------- Локальные helper-фабрики ---------- */

function text(o: Partial<TextElement>): TextElement {
  return {
    id: uid(), type: 'text', x: 0, y: 0, width: 300, height: 40, rotation: 0,
    text: '', fontSize: 16, fontFamily: 'Arial', fill: '#111',
    fontStyle: 'normal', textDecoration: '',
    align: 'left', verticalAlign: 'top', lineHeight: 1.2,
    padding: { top: 4, right: 4, bottom: 4, left: 4 },
    background: 'transparent',
    ...o,
  };
}

function shape(o: Partial<ShapeElement>): ShapeElement {
  return {
    id: uid(), type: 'shape', shape: 'rect',
    x: 0, y: 0, width: 100, height: 100, rotation: 0,
    fill: 'transparent', stroke: 'transparent', strokeWidth: 0,
    text: '', fontSize: 16, textFill: '#111', radius: 0,
    ...o,
  };
}

function line(o: Partial<LineElement>): LineElement {
  return {
    id: uid(), type: 'line',
    x: 0, y: 0, width: 300, height: 20, rotation: 0,
    points: [0, 10, 300, 10],
    stroke: '#111', strokeWidth: 1, dash: 'solid', isArrow: false,
    ...o,
  };
}

function footer(o: Partial<FooterElement>): FooterElement {
  return {
    id: uid(), type: 'footer',
    x: 0, y: 1070, width: 794, height: 40, rotation: 0,
    text: 'ООО «Компания» · www.example.com',
    fill: '#ffffff', bgColor: '#1e293b', fontSize: 12,
    ...o,
  };
}

/* ---------- Размеры ---------- */

const A4P = { width: 794, height: 1123 };   // A4 портрет
const A4L = { width: 1123, height: 794 };   // A4 ландшафт

/* ---------- Интерфейс ---------- */

export interface TypicalLayout {
  id: string;
  name: string;
  icon: string;
  description: string;
  build: () => Slide;
}

/* =====================================================
   ТИПОВЫЕ МАКЕТЫ
   ===================================================== */

export const TYPICAL_LAYOUTS: TypicalLayout[] = [

  /* ---------- 1. Титульный лист документа ---------- */
  {
    id: 'doc-title',
    name: 'Титульный лист документа',
    icon: '📄',
    description: 'A4, организация, заголовок, автор, дата, город',
    build: () => ({
      id: uid(), name: 'Титульный лист',
      format: 'custom', orientation: 'portrait',
      width: A4P.width, height: A4P.height,
      background: '#ffffff',
      padding: { top: 60, right: 60, bottom: 60, left: 60 },
      elements: [
        text({ x: 60, y: 80, width: 674, height: 30, text: 'НАЗВАНИЕ ОРГАНИЗАЦИИ',
          fontSize: 16, fontStyle: 'bold', align: 'center' }),
        text({ x: 60, y: 115, width: 674, height: 20,
          text: 'Отрасль · Подразделение · Документ',
          fontSize: 11, align: 'center', fill: '#666' }),
        line({ x: 60, y: 150, width: 674, height: 1, points: [0, 0, 674, 0], stroke: '#111', strokeWidth: 1 }),

        text({ x: 60, y: 480, width: 674, height: 80,
          text: 'НАЗВАНИЕ ДОКУМЕНТА',
          fontSize: 40, fontStyle: 'bold', align: 'center', lineHeight: 1.1 }),
        text({ x: 60, y: 590, width: 674, height: 30,
          text: 'Подзаголовок или краткое описание документа',
          fontSize: 16, align: 'center', fill: '#666' }),

        text({ x: 60, y: 940, width: 320, height: 24, text: 'Автор: Иванов И.И.', fontSize: 13 }),
        text({ x: 60, y: 965, width: 320, height: 24,
          text: 'Должность: руководитель отдела', fontSize: 13, fill: '#666' }),
        text({ x: 414, y: 940, width: 320, height: 24,
          text: 'Дата: 15.03.2026', fontSize: 13, align: 'right' }),
        text({ x: 414, y: 965, width: 320, height: 24,
          text: 'г. Москва', fontSize: 13, align: 'right', fill: '#666' }),
      ],
    }),
  },

  /* ---------- 2. Бланк с шапкой и подвалом ---------- */
  {
    id: 'doc-header',
    name: 'Бланк с шапкой и подвалом',
    icon: '📋',
    description: 'A4, цветная шапка, пустое поле, футер с контактами',
    build: () => ({
      id: uid(), name: 'Бланк',
      format: 'custom', orientation: 'portrait',
      width: A4P.width, height: A4P.height,
      background: '#ffffff',
      padding: { top: 20, right: 40, bottom: 60, left: 40 },
      elements: [
        shape({ x: 0, y: 0, width: A4P.width, height: 100, fill: '#1e3a8a', radius: 0 }),
        text({ x: 40, y: 26, width: 500, height: 30, text: 'ООО «Пример»',
          fontSize: 22, fontStyle: 'bold', fill: '#ffffff' }),
        text({ x: 40, y: 60, width: 500, height: 20,
          text: 'Официальный документ · 2026 год',
          fontSize: 12, fill: '#c7d2fe' }),
        text({ x: 540, y: 36, width: 214, height: 20,
          text: '+7 (495) 000-00-00', fontSize: 12, fill: '#c7d2fe', align: 'right' }),
        text({ x: 540, y: 56, width: 214, height: 20,
          text: 'www.example.com', fontSize: 12, fill: '#c7d2fe', align: 'right' }),

        text({ x: 40, y: 520, width: 714, height: 40,
          text: 'ИСХОДЯЩИЙ ДОКУМЕНТ',
          fontSize: 22, align: 'center', fill: '#e5e7eb', fontStyle: 'bold' }),

        footer({ y: 1050, height: 40,
          text: 'ООО «Пример» · г. Москва, ул. Ленина, 5 · +7 (495) 000-00-00' }),
      ],
    }),
  },

  /* ---------- 3. Обложка отчёта ---------- */
  {
    id: 'doc-cover',
    name: 'Обложка отчёта',
    icon: '📕',
    description: 'A4, тёмный фон, крупный заголовок, логотип, год',
    build: () => ({
      id: uid(), name: 'Обложка отчёта',
      format: 'custom', orientation: 'portrait',
      width: A4P.width, height: A4P.height,
      background: '#0f172a',
      padding: { top: 60, right: 60, bottom: 60, left: 60 },
      elements: [
        shape({ x: 60, y: 60, width: 60, height: 60, fill: '#38bdf8', radius: 12 }),
        text({ x: 132, y: 78, width: 200, height: 24, text: 'LOGO',
          fontSize: 18, fontStyle: 'bold', fill: '#38bdf8' }),

        text({ x: 60, y: 420, width: 674, height: 100,
          text: 'ГОДОВОЙ ОТЧЁТ',
          fontSize: 52, fontStyle: 'bold', fill: '#ffffff', lineHeight: 1.05 }),
        text({ x: 60, y: 530, width: 674, height: 30,
          text: 'За 2026 год',
          fontSize: 20, fill: '#94a3b8' }),

        line({ x: 60, y: 590, width: 200, height: 1,
          points: [0, 0, 200, 0], stroke: '#38bdf8', strokeWidth: 2 }),

        text({ x: 60, y: 620, width: 500, height: 80,
          text: 'Ключевые результаты, достижения и планы на будущее.',
          fontSize: 16, fill: '#94a3b8', lineHeight: 1.5 }),

        text({ x: 60, y: 990, width: 674, height: 40,
          text: '2026', fontSize: 24, fill: '#38bdf8', fontStyle: 'bold' }),
      ],
    }),
  },

  /* ---------- 4. Титульный слайд презентации ---------- */
  {
    id: 'pres-title',
    name: 'Титульный слайд',
    icon: '🎬',
    description: 'Ландшафт, крупный заголовок, автор, дата',
    build: () => ({
      id: uid(), name: 'Титульный слайд',
      format: 'custom', orientation: 'landscape',
      width: A4L.width, height: A4L.height,
      background: '#ffffff',
      padding: { top: 60, right: 80, bottom: 60, left: 80 },
      elements: [
        shape({ x: 0, y: 0, width: 12, height: A4L.height, fill: '#3b82f6', radius: 0 }),

        text({ x: 80, y: 220, width: 963, height: 100,
          text: 'Название презентации',
          fontSize: 54, fontStyle: 'bold', fill: '#111', lineHeight: 1.1 }),
        text({ x: 80, y: 340, width: 963, height: 30,
          text: 'Подзаголовок с уточнением',
          fontSize: 20, fill: '#666' }),

        line({ x: 80, y: 400, width: 400, height: 1,
          points: [0, 0, 400, 0], stroke: '#3b82f6', strokeWidth: 3 }),

        text({ x: 80, y: 640, width: 400, height: 24,
          text: 'Автор: Иванов И.И.', fontSize: 14 }),
        text({ x: 80, y: 665, width: 400, height: 24,
          text: 'Компания · Отдел', fontSize: 13, fill: '#666' }),

        text({ x: 663, y: 640, width: 380, height: 24,
          text: '15 марта 2026', fontSize: 14, align: 'right' }),
      ],
    }),
  },

  /* ---------- 5. Слайд «Содержание» ---------- */
  {
    id: 'pres-toc',
    name: 'Слайд «Содержание»',
    icon: '📑',
    description: 'Ландшафт, заголовок и нумерованный список пунктов',
    build: () => ({
      id: uid(), name: 'Содержание',
      format: 'custom', orientation: 'landscape',
      width: A4L.width, height: A4L.height,
      background: '#ffffff',
      padding: { top: 60, right: 80, bottom: 60, left: 80 },
      elements: [
        text({ x: 80, y: 60, width: 963, height: 50,
          text: 'Содержание', fontSize: 36, fontStyle: 'bold' }),
        line({ x: 80, y: 120, width: 963, height: 1,
          points: [0, 0, 963, 0], stroke: '#e5e7eb', strokeWidth: 2 }),

        text({ x: 80, y: 180, width: 60, height: 40, text: '01',
          fontSize: 28, fontStyle: 'bold', fill: '#3b82f6' }),
        text({ x: 160, y: 190, width: 883, height: 30,
          text: 'Введение и постановка задачи', fontSize: 20, fill: '#111' }),

        text({ x: 80, y: 280, width: 60, height: 40, text: '02',
          fontSize: 28, fontStyle: 'bold', fill: '#3b82f6' }),
        text({ x: 160, y: 290, width: 883, height: 30,
          text: 'Анализ текущей ситуации', fontSize: 20, fill: '#111' }),

        text({ x: 80, y: 380, width: 60, height: 40, text: '03',
          fontSize: 28, fontStyle: 'bold', fill: '#3b82f6' }),
        text({ x: 160, y: 390, width: 883, height: 30,
          text: 'Предлагаемое решение', fontSize: 20, fill: '#111' }),

        text({ x: 80, y: 480, width: 60, height: 40, text: '04',
          fontSize: 28, fontStyle: 'bold', fill: '#3b82f6' }),
        text({ x: 160, y: 490, width: 883, height: 30,
          text: 'Результаты и выводы', fontSize: 20, fill: '#111' }),

        text({ x: 80, y: 580, width: 60, height: 40, text: '05',
          fontSize: 28, fontStyle: 'bold', fill: '#3b82f6' }),
        text({ x: 160, y: 590, width: 883, height: 30,
          text: 'Следующие шаги', fontSize: 20, fill: '#111' }),
      ],
    }),
  },

  /* ---------- 6. Слайд «Раздел» ---------- */
  {
    id: 'pres-section',
    name: 'Слайд «Раздел»',
    icon: '🔢',
    description: 'Ландшафт, огромный номер раздела и название',
    build: () => ({
      id: uid(), name: 'Раздел',
      format: 'custom', orientation: 'landscape',
      width: A4L.width, height: A4L.height,
      background: '#0f172a',
      padding: { top: 60, right: 80, bottom: 60, left: 80 },
      elements: [
        text({ x: 80, y: 200, width: 300, height: 250, text: '01',
          fontSize: 180, fontStyle: 'bold', fill: '#38bdf8', lineHeight: 1 }),
        text({ x: 480, y: 300, width: 563, height: 60,
          text: 'Введение', fontSize: 44, fontStyle: 'bold', fill: '#ffffff' }),
        text({ x: 480, y: 380, width: 563, height: 30,
          text: 'Что мы рассмотрим в этом разделе',
          fontSize: 18, fill: '#94a3b8' }),
        line({ x: 480, y: 430, width: 200, height: 1,
          points: [0, 0, 200, 0], stroke: '#38bdf8', strokeWidth: 3 }),
      ],
    }),
  },

  /* ---------- 7. Слайд в две колонки ---------- */
  {
    id: 'pres-two-columns',
    name: 'Слайд в две колонки',
    icon: '📊',
    description: 'Ландшафт, заголовок и две текстовые колонки',
    build: () => ({
      id: uid(), name: 'Две колонки',
      format: 'custom', orientation: 'landscape',
      width: A4L.width, height: A4L.height,
      background: '#ffffff',
      padding: { top: 60, right: 80, bottom: 60, left: 80 },
      elements: [
        text({ x: 80, y: 60, width: 963, height: 50,
          text: 'Заголовок слайда', fontSize: 36, fontStyle: 'bold' }),
        line({ x: 80, y: 120, width: 963, height: 1,
          points: [0, 0, 963, 0], stroke: '#e5e7eb', strokeWidth: 2 }),

        shape({ x: 80, y: 180, width: 60, height: 6, fill: '#3b82f6', radius: 3 }),
        text({ x: 80, y: 200, width: 440, height: 30,
          text: 'Первый аспект', fontSize: 22, fontStyle: 'bold' }),
        text({ x: 80, y: 240, width: 440, height: 200,
          text: 'Описание первого аспекта. Здесь можно разместить несколько предложений текста, который раскроет суть.',
          fontSize: 16, fill: '#555', lineHeight: 1.6 }),

        shape({ x: 603, y: 180, width: 60, height: 6, fill: '#3b82f6', radius: 3 }),
        text({ x: 603, y: 200, width: 440, height: 30,
          text: 'Второй аспект', fontSize: 22, fontStyle: 'bold' }),
        text({ x: 603, y: 240, width: 440, height: 200,
          text: 'Описание второго аспекта. Симметрично первому блоку, для сравнения или дополнения.',
          fontSize: 16, fill: '#555', lineHeight: 1.6 }),
      ],
    }),
  },

  /* ---------- 8. Слайд с тремя карточками ---------- */
  {
    id: 'pres-three-cards',
    name: 'Слайд с тремя карточками',
    icon: '🃏',
    description: 'Ландшафт, три блока с иконками и описанием',
    build: () => ({
      id: uid(), name: 'Три карточки',
      format: 'custom', orientation: 'landscape',
      width: A4L.width, height: A4L.height,
      background: '#f8fafc',
      padding: { top: 60, right: 80, bottom: 60, left: 80 },
      elements: [
        text({ x: 80, y: 60, width: 963, height: 50,
          text: 'Ключевые направления', fontSize: 36, fontStyle: 'bold' }),

        shape({ x: 80, y: 200, width: 290, height: 380, fill: '#ffffff',
          stroke: '#e5e7eb', strokeWidth: 1, radius: 12 }),
        shape({ x: 110, y: 230, width: 60, height: 60, fill: '#dbeafe', radius: 30 }),
        text({ x: 110, y: 244, width: 60, height: 30, text: '⚡',
          fontSize: 28, align: 'center' }),
        text({ x: 110, y: 320, width: 230, height: 30,
          text: 'Скорость', fontSize: 20, fontStyle: 'bold' }),
        text({ x: 110, y: 360, width: 230, height: 180,
          text: 'Описание первой карточки. Что она даёт клиенту?',
          fontSize: 14, fill: '#555', lineHeight: 1.6 }),

        shape({ x: 396, y: 200, width: 290, height: 380, fill: '#ffffff',
          stroke: '#e5e7eb', strokeWidth: 1, radius: 12 }),
        shape({ x: 426, y: 230, width: 60, height: 60, fill: '#dcfce7', radius: 30 }),
        text({ x: 426, y: 244, width: 60, height: 30, text: '🛡',
          fontSize: 28, align: 'center' }),
        text({ x: 426, y: 320, width: 230, height: 30,
          text: 'Надёжность', fontSize: 20, fontStyle: 'bold' }),
        text({ x: 426, y: 360, width: 230, height: 180,
          text: 'Описание второй карточки. Какие гарантии даём?',
          fontSize: 14, fill: '#555', lineHeight: 1.6 }),

        shape({ x: 712, y: 200, width: 290, height: 380, fill: '#ffffff',
          stroke: '#e5e7eb', strokeWidth: 1, radius: 12 }),
        shape({ x: 742, y: 230, width: 60, height: 60, fill: '#fef3c7', radius: 30 }),
        text({ x: 742, y: 244, width: 60, height: 30, text: '💰',
          fontSize: 28, align: 'center' }),
        text({ x: 742, y: 320, width: 230, height: 30,
          text: 'Выгода', fontSize: 20, fontStyle: 'bold' }),
        text({ x: 742, y: 360, width: 230, height: 180,
          text: 'Описание третьей карточки. Почему это выгодно?',
          fontSize: 14, fill: '#555', lineHeight: 1.6 }),
      ],
    }),
  },

  /* ---------- 9. Слайд «Спасибо за внимание» ---------- */
  {
    id: 'pres-thanks',
    name: 'Слайд «Спасибо за внимание»',
    icon: '🙏',
    description: 'Ландшафт, крупная благодарность и контакты',
    build: () => ({
      id: uid(), name: 'Спасибо за внимание',
      format: 'custom', orientation: 'landscape',
      width: A4L.width, height: A4L.height,
      background: '#0f172a',
      padding: { top: 60, right: 80, bottom: 60, left: 80 },
      elements: [
        text({ x: 80, y: 260, width: 963, height: 80,
          text: 'Спасибо за внимание', fontSize: 56, fontStyle: 'bold',
          fill: '#ffffff', align: 'center' }),
        line({ x: 461, y: 380, width: 200, height: 1,
          points: [0, 0, 200, 0], stroke: '#38bdf8', strokeWidth: 3 }),
        text({ x: 80, y: 440, width: 963, height: 30,
          text: 'Есть вопросы? Свяжитесь со мной',
          fontSize: 18, fill: '#94a3b8', align: 'center' }),
        text({ x: 80, y: 520, width: 963, height: 24,
          text: 'ivanov@example.com  ·  +7 (999) 123-45-67',
          fontSize: 16, fill: '#38bdf8', align: 'center' }),
      ],
    }),
  },

  /* ---------- 10. Карточка: слева текст, справа картинка ---------- */
  {
    id: 'card-side-by-side',
    name: 'Карточка: текст + картинка',
    icon: '🗂',
    description: 'Портрет, две колонки, место для картинки',
    build: () => ({
      id: uid(), name: 'Карточка',
      format: 'custom', orientation: 'portrait',
      width: A4P.width, height: A4P.height,
      background: '#ffffff',
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      elements: [
        shape({ x: 40, y: 40, width: 714, height: 120, fill: '#1e293b', radius: 12 }),
        text({ x: 60, y: 70, width: 674, height: 40,
          text: 'Заголовок документа', fontSize: 26, fontStyle: 'bold', fill: '#ffffff' }),
        text({ x: 60, y: 115, width: 674, height: 24,
          text: 'Описание или номер', fontSize: 14, fill: '#cbd5e1' }),

        text({ x: 40, y: 200, width: 360, height: 30,
          text: 'Информация', fontSize: 20, fontStyle: 'bold' }),
        text({ x: 40, y: 240, width: 360, height: 300,
          text: 'Подробное описание содержимого. Здесь может быть текст, условия, характеристики, примечания и другая информация, которую нужно разместить слева.',
          fontSize: 14, fill: '#555', lineHeight: 1.7 }),

        shape({ x: 420, y: 200, width: 334, height: 340, fill: '#f1f5f9',
          stroke: '#cbd5e1', strokeWidth: 1, radius: 8 }),
        text({ x: 420, y: 360, width: 334, height: 30,
          text: 'Место для картинки', fontSize: 14, fill: '#94a3b8', align: 'center' }),

        footer({ y: 1050, height: 40, text: 'document · 15.03.2026' }),
      ],
    }),
  },

  /* ---------- 11. Пустой лист A4 ---------- */
  {
    id: 'blank-a4',
    name: 'Пустой лист A4',
    icon: '⬜',
    description: 'A4 в портретной ориентации с отступами 40 мм',
    build: () => ({
      id: uid(), name: 'Пустой лист',
      format: 'a4', orientation: 'portrait',
      width: A4P.width, height: A4P.height,
      background: '#ffffff',
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      elements: [],
    }),
  },

  /* ---------- 12. Пустой слайд ---------- */
  {
    id: 'blank-slide',
    name: 'Пустой слайд',
    icon: '⬛',
    description: 'Ландшафт A4 без элементов',
    build: () => ({
      id: uid(), name: 'Пустой слайд',
      format: 'custom', orientation: 'landscape',
      width: A4L.width, height: A4L.height,
      background: '#ffffff',
      padding: { top: 40, right: 60, bottom: 40, left: 60 },
      elements: [],
    }),
  },
];