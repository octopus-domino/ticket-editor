/* ============================================================
   lib/stamps/bankingStampsWithImages.ts

   Банковские штампы, использующие StampImageItem.

   Все SVG-иконки вшиты в код как data URL — не требуют
   внешних файлов. Каждое изображение — это обычный элемент
   shapes/texts/images, который можно подвинуть, заменить или
   удалить в редакторе штампа.

   Технически StampImageItem содержит:
     - src: data URL или http(s)
     - x, y, width, height
     - fit: 'contain' | 'cover' | 'fill'
     - rotation, name, locked, hidden
   ============================================================ */

import type {
  StampShapeItem, StampTextItem, StampImageItem,
} from '@/shared/types';
import { uid } from '../uid';
import type { StampTemplate } from './types';

const INK = '#0a2540';
const SOFT = '#374151';
const WHITE = '#ffffff';
const GOLD = '#c8a951';
const BLUE = '#1e40af';

/* ============================================================
   Встроенные SVG-иконки
   ============================================================ */

/* ------------------------------------------------------------
   Рубль — символ банковской системы
   ------------------------------------------------------------ */

const RUBLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="${BLUE}" stroke="${WHITE}" stroke-width="2"/>
  <text x="50" y="72" font-family="Arial, sans-serif" font-size="64"
        font-weight="bold" fill="${WHITE}" text-anchor="middle">₽</text>
</svg>`;

/* ------------------------------------------------------------
   Герб РФ — двуглавый орёл (стилизованный)
   ------------------------------------------------------------ */

const EMBLEM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="${GOLD}" stroke="${WHITE}" stroke-width="2"/>
  <path d="M50 20 L58 38 L78 38 L62 50 L68 70 L50 58 L32 70 L38 50 L22 38 L42 38 Z"
        fill="${WHITE}"/>
  <circle cx="50" cy="50" r="6" fill="${GOLD}"/>
</svg>`;

/* ------------------------------------------------------------
   Звезда — эмблема банка
   ------------------------------------------------------------ */

const STAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="${BLUE}" stroke="${WHITE}" stroke-width="2"/>
  <path d="M50 18 L60 42 L86 42 L66 58 L74 82 L50 66 L26 82 L34 58 L14 42 L40 42 Z"
        fill="${GOLD}" stroke="${WHITE}" stroke-width="1"/>
</svg>`;

/* ------------------------------------------------------------
   QR-заглушка — квадрат с паттерном
   ------------------------------------------------------------ */

function qrSvg(seed = 1): string {
  /* Простой псевдо-QR: 8x8 сетка, детерминированный по seed */
  const cells: string[] = [];
  const size = 100;
  const n = 8;
  const cellSize = size / n;

  /* Псевдослучайный детерминированный генератор */
  let state = seed * 9301 + 49297;
  const rnd = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      /* Угловые маркеры (как в настоящем QR) */
      const isCorner =
        (x < 3 && y < 3) ||
        (x >= n - 3 && y < 3) ||
        (x < 3 && y >= n - 3);
      /* Внутри угловых маркеров — точный рисунок */
      const inCornerFrame =
        (x === 0 || x === 2 || y === 0 || y === 2) && x < 3 && y < 3;
      const innerCorner = x === 1 && y === 1 && false;

      if (isCorner) {
        if (inCornerFrame || innerCorner) {
          cells.push(
            `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${INK}"/>`,
          );
        } else if (x === 1 && y === 1) {
          cells.push(
            `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${INK}"/>`,
          );
        }
      } else if (rnd() > 0.5) {
        cells.push(
          `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${INK}"/>`,
        );
      }
    }
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${WHITE}"/>
  ${cells.join('')}
</svg>`;
}

/* ------------------------------------------------------------
   Подпись (факсимиле) — стилизованная «закорючка»
   ------------------------------------------------------------ */

const SIGNATURE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <path d="M10 40 Q 30 10, 50 35 T 90 30 Q 110 5, 130 32 T 180 28"
        fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

/* ------------------------------------------------------------
   Логотип банка — три полосы (стилизованный)
   ------------------------------------------------------------ */

const BANK_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="10" y="30" width="80" height="8" fill="${BLUE}"/>
  <rect x="10" y="46" width="80" height="8" fill="${BLUE}"/>
  <rect x="10" y="62" width="80" height="8" fill="${BLUE}"/>
  <circle cx="50" cy="20" r="12" fill="${GOLD}" stroke="${BLUE}" stroke-width="2"/>
</svg>`;

/* ------------------------------------------------------------
   Конверт — для входящей корреспонденции
   ------------------------------------------------------------ */

const ENVELOPE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="10" y="25" width="80" height="50" fill="${WHITE}" stroke="${INK}" stroke-width="2"/>
  <path d="M10 25 L50 55 L90 25" fill="none" stroke="${INK}" stroke-width="2"/>
</svg>`;

/* ============================================================
   Кодирование SVG в data URL
   ============================================================ */

function svgToDataUrl(svg: string): string {
  const cleaned = svg.replace(/\s+/g, ' ').trim();
  /* encodeURIComponent — надёжнее base64 для инлайн SVG */
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`;
}

/* ============================================================
   Фабрики
   ============================================================ */

const shape = (
  o: Partial<StampShapeItem> & { kind: StampShapeItem['kind'] },
): StampShapeItem => ({
  id: uid(),
  x: 0, y: 0, width: 100, height: 100,
  rotation: 0, cornerRadius: 0,
  stroke: INK, strokeWidth: 1, dash: 'solid',
  fill: undefined,
  ...o,
});

const text = (
  o: Partial<StampTextItem> & { text: string; mode: 'straight' | 'arc' },
): StampTextItem => ({
  id: uid(),
  x: 0, y: 0, width: 200, align: 'center',
  arcCx: 100, arcCy: 100, arcRadius: 60,
  arcStartDeg: -90, arcEndDeg: 90, arcFlip: false,
  arcOffset: 6, arcSpanDeg: 140,
  fontSize: 12, fontFamily: 'Arial', fontStyle: 'normal',
  textDecoration: '', fill: INK,
  ...o,
});

const image = (
  src: string,
  x: number, y: number, w: number, h: number,
  name = 'Изображение',
): StampImageItem => ({
  id: uid(),
  src,
  x, y, width: w, height: h,
  rotation: 0,
  fit: 'contain',
  name,
});

/* ============================================================
   1. ПЕЧАТЬ С РУБЛЁМ В ЦЕНТРЕ (банковская)
   ============================================================ */

function rubleSeal(): StampTemplate {
  const W = 220, H = 220;
  const CX = 110, CY = 110;
  const R_OUTER = 106;
  const R_INNER = 78;
  const LOGO_SIZE = 60;

  const outer = shape({
    kind: 'ellipse',
    x: CX - R_OUTER, y: CY - R_OUTER,
    width: R_OUTER * 2, height: R_OUTER * 2,
    strokeWidth: 2.5,
  });
  const inner = shape({
    kind: 'ellipse',
    x: CX - R_INNER, y: CY - R_INNER,
    width: R_INNER * 2, height: R_INNER * 2,
    strokeWidth: 1,
  });

  return {
    id: 'bank-img-ruble-seal',
    name: 'Печать с рублём',
    description: 'Круглая печать с символом рубля в центре',
    icon: '₽',
    width: W, height: H,
    shapes: [outer, inner],
    texts: [
      text({
        text: 'БАНК РОССИИ', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 92,
        arcStartDeg: -160, arcEndDeg: -20, arcSpanDeg: 140,
        fontSize: 12, fontStyle: 'bold',
      }),
      text({
        text: 'БИК 044525225', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 92,
        arcStartDeg: 160, arcEndDeg: 20, arcFlip: true, arcSpanDeg: 140,
        fontSize: 8, fill: SOFT,
      }),
      text({
        text: 'МОСКВА',
        mode: 'straight',
        x: CX - 60, y: CY + 44, width: 120,
        fontSize: 11, fontStyle: 'bold',
      }),
    ],
    images: [
      image(
        svgToDataUrl(RUBLE_SVG),
        CX - LOGO_SIZE / 2, CY - LOGO_SIZE / 2 - 10,
        LOGO_SIZE, LOGO_SIZE,
        'Символ ₽',
      ),
    ],
  };
}

/* ============================================================
   2. ПЕЧАТЬ С ГЕРБОМ РФ (нотариальная / государственная)
   ============================================================ */

function emblemSeal(): StampTemplate {
  const W = 240, H = 240;
  const CX = 120, CY = 120;
  const R_OUTER = 116;
  const R_INNER = 86;
  const LOGO_SIZE = 70;

  const outer = shape({
    kind: 'ellipse',
    x: CX - R_OUTER, y: CY - R_OUTER,
    width: R_OUTER * 2, height: R_OUTER * 2,
    strokeWidth: 3,
  });
  const inner = shape({
    kind: 'ellipse',
    x: CX - R_INNER, y: CY - R_INNER,
    width: R_INNER * 2, height: R_INNER * 2,
    strokeWidth: 1.5,
  });

  return {
    id: 'bank-img-emblem-seal',
    name: 'Печать с гербом',
    description: 'Круглая печать с гербом РФ',
    icon: '🦅',
    width: W, height: H,
    shapes: [outer, inner],
    texts: [
      text({
        text: 'ГОСУДАРСТВЕННЫЙ БАНК', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 100,
        arcStartDeg: -160, arcEndDeg: -20, arcSpanDeg: 140,
        fontSize: 12, fontStyle: 'bold',
      }),
      text({
        text: 'СЕРИЯ 1234 № 567890', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 100,
        arcStartDeg: 160, arcEndDeg: 20, arcFlip: true, arcSpanDeg: 140,
        fontSize: 8, fill: SOFT,
      }),
      text({
        text: 'ОТДЕЛЕНИЕ МОСКВА',
        mode: 'straight',
        x: CX - 90, y: CY + 55, width: 180,
        fontSize: 9, fontStyle: 'bold', fill: SOFT,
      }),
    ],
    images: [
      image(
        svgToDataUrl(EMBLEM_SVG),
        CX - LOGO_SIZE / 2, CY - LOGO_SIZE / 2 - 8,
        LOGO_SIZE, LOGO_SIZE,
        'Герб',
      ),
    ],
  };
}

/* ============================================================
   3. ПЕЧАТЬ С ЛОГОТИПОМ БАНКА
   ============================================================ */

function logoBankSeal(): StampTemplate {
  const W = 220, H = 220;
  const CX = 110, CY = 110;
  const R_OUTER = 106;
  const R_INNER = 78;
  const LOGO_SIZE = 70;

  const outer = shape({
    kind: 'ellipse',
    x: CX - R_OUTER, y: CY - R_OUTER,
    width: R_OUTER * 2, height: R_OUTER * 2,
    strokeWidth: 2.5,
  });
  const inner = shape({
    kind: 'ellipse',
    x: CX - R_INNER, y: CY - R_INNER,
    width: R_INNER * 2, height: R_INNER * 2,
    strokeWidth: 1,
  });

  return {
    id: 'bank-img-logo-seal',
    name: 'Печать с логотипом банка',
    description: 'Круглая печать с цветным логотипом в центре',
    icon: '🏦',
    width: W, height: H,
    shapes: [outer, inner],
    texts: [
      text({
        text: 'ПАО «МОЙ БАНК»', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 92,
        arcStartDeg: -160, arcEndDeg: -20, arcSpanDeg: 140,
        fontSize: 13, fontStyle: 'bold',
      }),
      text({
        text: 'ОГРН 1027700132195', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 92,
        arcStartDeg: 160, arcEndDeg: 20, arcFlip: true, arcSpanDeg: 140,
        fontSize: 8, fill: SOFT,
      }),
      text({
        text: 'ОСНОВНАЯ ПЕЧАТЬ',
        mode: 'straight',
        x: CX - 70, y: CY + 48, width: 140,
        fontSize: 9, fontStyle: 'bold', fill: SOFT,
      }),
    ],
    images: [
      image(
        svgToDataUrl(BANK_LOGO_SVG),
        CX - LOGO_SIZE / 2, CY - LOGO_SIZE / 2 - 6,
        LOGO_SIZE, LOGO_SIZE,
        'Логотип банка',
      ),
    ],
  };
}

/* ============================================================
   4. ШТАМП С QR-КОДОМ (для быстрой идентификации)
   ============================================================ */

function qrStamp(): StampTemplate {
  const W = 260, H = 140;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2, stroke: BLUE,
  });
  const divider = shape({
    kind: 'line', x: 130, y: 16, width: 1, height: H - 32,
    points: [0, 0, 0, H - 32],
    strokeWidth: 1, dash: 'dotted',
  });

  return {
    id: 'bank-img-qr-stamp',
    name: 'Штамп с QR-кодом',
    description: 'Штамп с QR для быстрой идентификации документа',
    icon: '🔳',
    width: W, height: H,
    shapes: [frame, divider],
    texts: [
      text({
        text: 'ООО «КОМПАНИЯ»',
        mode: 'straight',
        x: 130, y: 20, width: W - 140,
        fontSize: 11, fontStyle: 'bold', align: 'left', fill: INK,
      }),
      text({
        text: 'Документ №',
        mode: 'straight',
        x: 130, y: 42, width: W - 140,
        fontSize: 8, fill: SOFT, align: 'left',
      }),
      text({
        text: 'TKT-2026-0042',
        mode: 'straight',
        x: 130, y: 56, width: W - 140,
        fontSize: 11, fontStyle: 'bold', align: 'left', fill: BLUE,
      }),
      text({
        text: 'Отсканируйте QR для проверки',
        mode: 'straight',
        x: 130, y: 92, width: W - 140,
        fontSize: 7, fill: SOFT, align: 'left',
      }),
      text({
        text: 'Дата: 15.10.2026',
        mode: 'straight',
        x: 130, y: 110, width: W - 140,
        fontSize: 8, fill: INK, align: 'left',
      }),
    ],
    images: [
      image(
        svgToDataUrl(qrSvg(42)),
        16, 20, 100, 100,
        'QR-код',
      ),
    ],
  };
}

/* ============================================================
   5. УГЛОВОЙ ШТАМП С ЛОГОТИПОМ
   ============================================================ */

function cornerWithLogo(): StampTemplate {
  const W = 340, H = 140;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 1.5,
  });
  const separator = shape({
    kind: 'line', x: 8, y: 42, width: W - 16, height: 1,
    points: [0, 0, W - 16, 0], strokeWidth: 1,
  });
  const logoBg = shape({
    kind: 'rect', x: 12, y: 12, width: 44, height: 44,
    cornerRadius: 4, strokeWidth: 0, stroke: undefined,
    fill: BLUE,
  });

  return {
    id: 'bank-img-corner-logo',
    name: 'Угловой с логотипом',
    description: 'Угловой штамп с логотипом банка',
    icon: '🏛',
    width: W, height: H,
    shapes: [logoBg, frame, separator],
    texts: [
      text({
        text: 'ПАО «МОЙ БАНК»',
        mode: 'straight',
        x: 66, y: 14, width: W - 80,
        fontSize: 15, fontStyle: 'bold', fill: INK, align: 'left',
      }),
      text({
        text: 'Головное отделение по г. Москве',
        mode: 'straight',
        x: 66, y: 32, width: W - 80,
        fontSize: 9, fill: SOFT, align: 'left',
      }),

      text({
        text: 'БИК',
        mode: 'straight',
        x: 16, y: 52, width: 60,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: '044525225',
        mode: 'straight',
        x: 16, y: 66, width: 140,
        fontSize: 11, fontStyle: 'bold', align: 'left',
      }),
      text({
        text: 'К/с 30101810400000000225',
        mode: 'straight',
        x: 16, y: 92, width: 200,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: 'ИНН 7707083893',
        mode: 'straight',
        x: 16, y: 110, width: 200,
        fontSize: 9, fill: SOFT, align: 'left',
      }),

      text({
        text: 'Р/с 40702810438170000001',
        mode: 'straight',
        x: W / 2 + 20, y: 52, width: W / 2 - 32,
        fontSize: 9, fill: INK, align: 'left',
      }),
      text({
        text: '+7 (495) 000-00-00',
        mode: 'straight',
        x: W / 2 + 20, y: 72, width: W / 2 - 32,
        fontSize: 10, fontStyle: 'bold', fill: INK, align: 'left',
      }),
      text({
        text: 'www.mybank.ru',
        mode: 'straight',
        x: W / 2 + 20, y: 92, width: W / 2 - 32,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: 'Москва, ул. Банковская, 1',
        mode: 'straight',
        x: W / 2 + 20, y: 110, width: W / 2 - 32,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
    ],
    images: [
      image(
        svgToDataUrl(BANK_LOGO_SVG),
        18, 18, 32, 32,
        'Логотип',
      ),
    ],
  };
}

/* ============================================================
   6. ШТАМП С ФАКСИМИЛЕ ПОДПИСИ
   ============================================================ */

function signatureStamp(): StampTemplate {
  const W = 260, H = 100;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 1.5, stroke: INK,
  });
  const sigLine = shape({
    kind: 'line', x: 30, y: 70, width: W - 60, height: 1,
    points: [0, 0, W - 60, 0],
    strokeWidth: 1, dash: 'solid', stroke: SOFT,
  });

  return {
    id: 'bank-img-signature',
    name: 'Штамп с факсимиле',
    description: 'Штамп с факсимиле подписи руководителя',
    icon: '✍',
    width: W, height: H,
    shapes: [frame, sigLine],
    texts: [
      text({
        text: 'Генеральный директор',
        mode: 'straight',
        x: 16, y: 12, width: W - 32,
        fontSize: 10, fill: SOFT, align: 'left',
      }),
      text({
        text: 'И.И. Иванов',
        mode: 'straight',
        x: 16, y: 30, width: W - 32,
        fontSize: 11, fontStyle: 'bold', align: 'left', fill: INK,
      }),
      text({
        text: '/ подпись /',
        mode: 'straight',
        x: 16, y: 78, width: W - 32,
        fontSize: 8, fill: SOFT, align: 'left', fontStyle: 'italic',
      }),
      text({
        text: 'М.П.',
        mode: 'straight',
        x: W - 60, y: 78, width: 50,
        fontSize: 10, fill: SOFT, align: 'right', fontStyle: 'italic',
      }),
    ],
    images: [
      image(
        svgToDataUrl(SIGNATURE_SVG),
        30, 40, W - 60, 30,
        'Факсимиле',
      ),
    ],
  };
}

/* ============================================================
   7. ШТАМП «ВХОДЯЩИЙ» С КОНВЕРТОМ
   ============================================================ */

function envelopeStamp(): StampTemplate {
  const W = 240, H = 100;
  const ICON_SIZE = 60;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2, stroke: BLUE,
  });

  return {
    id: 'bank-img-envelope',
    name: 'ВХОДЯЩИЙ (конверт)',
    description: 'Штамп входящей корреспонденции с иконкой конверта',
    icon: '📨',
    width: W, height: H,
    shapes: [frame],
    texts: [
      text({
        text: 'ВХОДЯЩИЙ',
        mode: 'straight',
        x: 80, y: 14, width: W - 96,
        fontSize: 18, fontStyle: 'bold', fill: BLUE, align: 'left',
      }),
      text({
        text: '№ ____________',
        mode: 'straight',
        x: 80, y: 42, width: W - 96,
        fontSize: 11, align: 'left', fill: INK,
      }),
      text({
        text: '«___» ________ 20___',
        mode: 'straight',
        x: 80, y: 62, width: W - 96,
        fontSize: 9, align: 'left', fill: SOFT,
      }),
      text({
        text: 'ПАО «МОЙ БАНК»',
        mode: 'straight',
        x: 80, y: 80, width: W - 96,
        fontSize: 8, fill: SOFT, align: 'left',
      }),
    ],
    images: [
      image(
        svgToDataUrl(ENVELOPE_SVG),
        12, 20, ICON_SIZE, ICON_SIZE,
        'Конверт',
      ),
    ],
  };
}

/* ============================================================
   8. ПЕЧАТЬ С QR И ЗВЕЗДОЙ (комбинированный)
   ============================================================ */

function qrStarSeal(): StampTemplate {
  const W = 260, H = 260;
  const CX = 130, CY = 130;
  const R_OUTER = 126;
  const R_INNER = 96;
  const STAR_SIZE = 60;
  const QR_SIZE = 40;

  const outer = shape({
    kind: 'ellipse',
    x: CX - R_OUTER, y: CY - R_OUTER,
    width: R_OUTER * 2, height: R_OUTER * 2,
    strokeWidth: 3,
  });
  const inner = shape({
    kind: 'ellipse',
    x: CX - R_INNER, y: CY - R_INNER,
    width: R_INNER * 2, height: R_INNER * 2,
    strokeWidth: 1,
  });

  return {
    id: 'bank-img-qr-star-seal',
    name: 'Печать с QR и звездой',
    description: 'Круглая печать с эмблемой-звездой и QR в нижней части',
    icon: '⭐',
    width: W, height: H,
    shapes: [outer, inner],
    texts: [
      text({
        text: 'ЦЕНТРАЛЬНЫЙ БАНК', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 112,
        arcStartDeg: -160, arcEndDeg: -20, arcSpanDeg: 140,
        fontSize: 12, fontStyle: 'bold',
      }),
      text({
        text: 'СЕРИЯ 0001 № 000001', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 112,
        arcStartDeg: 160, arcEndDeg: 20, arcFlip: true, arcSpanDeg: 140,
        fontSize: 8, fill: SOFT,
      }),
      text({
        text: 'МОСКВА · 2026',
        mode: 'straight',
        x: CX - 70, y: CY + 44, width: 140,
        fontSize: 9, fontStyle: 'bold', fill: INK,
      }),
    ],
    images: [
      image(
        svgToDataUrl(STAR_SVG),
        CX - STAR_SIZE / 2, CY - STAR_SIZE / 2 - 12,
        STAR_SIZE, STAR_SIZE,
        'Звезда',
      ),
      image(
        svgToDataUrl(qrSvg(7)),
        CX - QR_SIZE / 2, CY + 62,
        QR_SIZE, QR_SIZE,
        'QR-код',
      ),
    ],
  };
}

/* ============================================================
   Экспорт
   ============================================================ */

export const BANKING_STAMPS_WITH_IMAGES: StampTemplate[] = [
  rubleSeal(),
  emblemSeal(),
  logoBankSeal(),
  qrStamp(),
  cornerWithLogo(),
  signatureStamp(),
  envelopeStamp(),
  qrStarSeal(),
];