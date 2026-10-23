/* ============================================================
   lib/stamps/specialStamps.ts

   Специальные штампы:
   - треугольные (медицина, командировки, корреспонденция);
   - со сложной заливкой (пересечения, двойные плашки);
   - круговые с двумя кольцами и эмблемой;
   - овальные с дуговым текстом.

   Технология та же: StampShapeItem + StampTextItem +
   anchor-заливка через fillTargetShapeId / fillAnchorLocal.

   Про заливку перекрытий:
   Маска заливки строится по ОДНОЙ фигуре-контейнеру.
   Если нужно залить пересечение двух фигур — привязываем fill
   к одной из них, а сид ставим в точке, достижимой только
   внутри пересечения. Вторая фигура играет роль «стены»,
   потому что её штрих попадает в offscreen-рендер и
   останавливает flood fill.

   Про дуговой текст:
   Дуга используется только там, где контейнер криволинейный:
   круглые и овальные печати. Верхняя надпись идёт по верхней
   дуге (arcFlip: false), нижняя — по нижней (arcFlip: true).
   В прямоугольных и треугольных штампах дуга не применяется —
   там работают прямые строки.
   ============================================================ */

import type { StampShapeItem, StampTextItem } from '@/shared/types';
import { uid } from '../uid';
import type { StampTemplate } from './types';

const INK = '#0a2540';
const SOFT = '#374151';
const WHITE = '#ffffff';
const GREEN = '#15803d';
const GREEN_LIGHT = '#dcfce7';
const BLUE = '#1e40af';
const BLUE_LIGHT = '#dbeafe';
const YELLOW_LIGHT = '#fef9c3';

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

function anchorFill(
  container: StampShapeItem,
  color: string,
  anchorLocal: { x: number; y: number },
  stampW: number,
  stampH: number,
  name = 'Заливка',
): StampShapeItem {
  return {
    id: uid(),
    kind: 'fill',
    x: 0, y: 0,
    width: stampW, height: stampH,
    rotation: 0,
    cornerRadius: 0,
    stroke: '', strokeWidth: 0, dash: 'solid',
    fill: color,
    name,
    fillTargetShapeId: container.id,
    fillAnchorLocal: anchorLocal,
  };
}

/* ============================================================
   ТРЕУГОЛЬНЫЕ ШТАМПЫ
   ============================================================ */

/* ------------------------------------------------------------
   1. Медицинский треугольный штамп (для справок)
   ------------------------------------------------------------ */

function triangularMedical(): StampTemplate {
  const SIDE = 220;
  const H = Math.round((SIDE * Math.sqrt(3)) / 2); /* ≈ 190 */

  const outer = shape({
    kind: 'triangle',
    x: 0, y: 0, width: SIDE, height: H,
    strokeWidth: 2,
  });
  /* Внутренний треугольник — тонкая декоративная линия,
     уменьшен, чтобы не пересекаться с текстом. */
  const inner = shape({
    kind: 'triangle',
    x: 18, y: 18, width: SIDE - 36, height: H - 36,
    strokeWidth: 1,
  });

  return {
    id: 'special-triangular-medical',
    name: 'Треугольный (справки)',
    description: 'Медицинский треугольный штамп для справок',
    icon: '🔺',
    width: SIDE, height: H,
    shapes: [outer, inner],
    texts: [
      /* Все тексты собраны в широкой нижней трети треугольника. */
      text({
        text: 'ГОРОДСКАЯ ПОЛИКЛИНИКА № 1',
        mode: 'straight',
        x: 30, y: 116, width: SIDE - 60,
        fontSize: 8, fontStyle: 'bold', align: 'center',
      }),
      text({
        text: 'ДЛЯ СПРАВОК',
        mode: 'straight',
        x: 24, y: 134, width: SIDE - 48,
        fontSize: 14, fontStyle: 'bold', align: 'center',
      }),
      text({
        text: 'Дата: «___» ________ 20___',
        mode: 'straight',
        x: 34, y: 158, width: SIDE - 68,
        fontSize: 8, align: 'center',
      }),
      text({
        text: 'Подпись: ______________',
        mode: 'straight',
        x: 34, y: 174, width: SIDE - 68,
        fontSize: 8, align: 'center',
      }),
    ],
  };
}

/* ------------------------------------------------------------
   2. Командировочный треугольный штамп
   ------------------------------------------------------------ */

function triangularBusinessTrip(): StampTemplate {
  const SIDE = 200;
  const H = Math.round((SIDE * Math.sqrt(3)) / 2); /* ≈ 173 */

  const outer = shape({
    kind: 'triangle',
    x: 0, y: 0, width: SIDE, height: H,
    strokeWidth: 2.5,
  });

  return {
    id: 'special-triangular-trip',
    name: 'Треугольный (командировки)',
    description: 'Штамп для отметок в командировочных удостоверениях',
    icon: '🧳',
    width: SIDE, height: H,
    shapes: [outer],
    texts: [
      text({
        text: 'ООО «КОМПАНИЯ»',
        mode: 'straight',
        x: 24, y: 96, width: SIDE - 48,
        fontSize: 9, fontStyle: 'bold', align: 'center',
      }),
      text({
        text: 'ПРИБЫЛ',
        mode: 'straight',
        x: 20, y: 116, width: SIDE - 40,
        fontSize: 18, fontStyle: 'bold', align: 'center',
      }),
      text({
        text: '«___» ________ 20___',
        mode: 'straight',
        x: 30, y: 142, width: SIDE - 60,
        fontSize: 9, align: 'center',
      }),
      text({
        text: 'Подпись: ________',
        mode: 'straight',
        x: 30, y: 160, width: SIDE - 60,
        fontSize: 8, align: 'center',
      }),
    ],
  };
}

/* ------------------------------------------------------------
   3. Треугольный штамп для пакетов / входящей корреспонденции
   ------------------------------------------------------------ */

function triangularPackage(): StampTemplate {
  const SIDE = 180;
  const H = Math.round((SIDE * Math.sqrt(3)) / 2); /* ≈ 156 */

  const outer = shape({
    kind: 'triangle',
    x: 0, y: 0, width: SIDE, height: H,
    strokeWidth: 2,
  });

  return {
    id: 'special-triangular-package',
    name: 'Треугольный (пакеты)',
    description: 'Штамп для входящей корреспонденции и пакетов',
    icon: '📦',
    width: SIDE, height: H,
    shapes: [outer],
    texts: [
      text({
        text: 'ВХОДЯЩИЙ',
        mode: 'straight',
        x: 24, y: 84, width: SIDE - 48,
        fontSize: 13, fontStyle: 'bold', align: 'center',
      }),
      text({
        text: '№ ____________',
        mode: 'straight',
        x: 20, y: 106, width: SIDE - 40,
        fontSize: 11, align: 'center',
      }),
      text({
        text: '«___» ________ 20___',
        mode: 'straight',
        x: 24, y: 126, width: SIDE - 48,
        fontSize: 8, align: 'center',
      }),
      text({
        text: 'БАНК',
        mode: 'straight',
        x: 24, y: 144, width: SIDE - 48,
        fontSize: 10, fontStyle: 'bold', align: 'center',
      }),
    ],
  };
}

/* ============================================================
   ШТАМПЫ С ПЕРЕКРЫТИЕМ ЗАЛИВОК
   ============================================================ */

/* ------------------------------------------------------------
   4. Печать Венна (два круга, три зоны заливки)
   ------------------------------------------------------------ */

function vennSeal(): StampTemplate {
  const W = 260, H = 200;
  const R = 72;
  const CY = 100;
  const CX_L = 72;
  const CX_R = W - 72;

  const leftCircle = shape({
    kind: 'ellipse',
    x: CX_L - R, y: CY - R,
    width: R * 2, height: R * 2,
    strokeWidth: 2,
  });
  const rightCircle = shape({
    kind: 'ellipse',
    x: CX_R - R, y: CY - R,
    width: R * 2, height: R * 2,
    strokeWidth: 2,
  });

  /* Левая заливка — крайняя левая точка левого круга */
  const leftFill = anchorFill(
    leftCircle, BLUE_LIGHT,
    { x: 0.1, y: 0.5 },
    W, H, 'Левый круг',
  );

  /* Правая заливка — крайняя правая точка правого круга */
  const rightFill = anchorFill(
    rightCircle, GREEN_LIGHT,
    { x: 0.9, y: 0.5 },
    W, H, 'Правый круг',
  );

  /* Пересечение — сид внутри обоих кругов,
     привязка к левому, штрих правого отсекает лишнее. */
  const overlapFill = anchorFill(
    leftCircle, YELLOW_LIGHT,
    { x: 0.75, y: 0.5 },
    W, H, 'Пересечение',
  );

  return {
    id: 'special-venn-seal',
    name: 'Печать с пересечением',
    description: 'Два перекрывающихся круга с заливкой трёх зон',
    icon: '⚭',
    width: W, height: H,
    shapes: [leftFill, rightFill, overlapFill, leftCircle, rightCircle],
    texts: [
      text({
        text: 'ПАО БАНК',
        mode: 'straight',
        x: 20, y: 16, width: W - 40,
        fontSize: 14, fontStyle: 'bold', align: 'center',
      }),
      text({
        text: 'Москва · ОГРН 1027700132195',
        mode: 'straight',
        x: 20, y: H - 30, width: W - 40,
        fontSize: 9, fill: SOFT, align: 'center',
      }),
    ],
  };
}

/* ------------------------------------------------------------
   5. Рамка с полностью залитой серединой и белым текстом
   ------------------------------------------------------------ */

function highlightedFrame(): StampTemplate {
  const W = 280, H = 100;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 3, strokeWidth: 0, stroke: undefined,
  });
  const innerFill = anchorFill(
    inner, BLUE,
    { x: 0.5, y: 0.5 },
    W, H, 'Синяя плашка',
  );

  return {
    id: 'special-highlighted-frame',
    name: 'Рамка с заливкой',
    description: 'Штамп с залитой рамкой и белым текстом',
    icon: '🖼',
    width: W, height: H,
    shapes: [innerFill, frame, inner],
    texts: [
      text({
        text: 'ПРИНЯТО',
        mode: 'straight',
        x: 16, y: 20, width: W - 32,
        fontSize: 30, fontStyle: 'bold', fill: WHITE,
      }),
      text({
        text: 'Дата: «___» ________ 20___',
        mode: 'straight',
        x: 16, y: 64, width: W - 32,
        fontSize: 10, fill: BLUE_LIGHT, align: 'left',
      }),
    ],
  };
}

/* ------------------------------------------------------------
   6. Двойная заливка: фоновая + акцентная полоса
   ------------------------------------------------------------ */

function dualFillStamp(): StampTemplate {
  const W = 260, H = 110;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2,
  });

  const bg = shape({
    kind: 'rect', x: 6, y: 6, width: W - 12, height: H - 12,
    cornerRadius: 3, strokeWidth: 0, stroke: undefined,
  });

  const accent = shape({
    kind: 'rect', x: 6, y: 66, width: W - 12, height: 38,
    cornerRadius: 2, strokeWidth: 0, stroke: undefined,
  });

  const bgFill = anchorFill(bg, GREEN_LIGHT, { x: 0.5, y: 0.25 }, W, H, 'Фон');
  const accentFill = anchorFill(accent, GREEN, { x: 0.5, y: 0.78 }, W, H, 'Акцентная полоса');

  return {
    id: 'special-dual-fill',
    name: 'Двойная заливка',
    description: 'Штамп с фоновой и акцентной заливкой',
    icon: '🎨',
    width: W, height: H,
    shapes: [bgFill, accentFill, frame, bg, accent],
    texts: [
      text({
        text: 'ПРОВЕРЕНО',
        mode: 'straight',
        x: 16, y: 20, width: W - 32,
        fontSize: 22, fontStyle: 'bold', fill: GREEN,
      }),
      text({
        text: 'Подпись ответственного лица',
        mode: 'straight',
        x: 16, y: 78, width: W - 32,
        fontSize: 9, fill: WHITE,
      }),
    ],
  };
}

/* ------------------------------------------------------------
   7. Треугольник + круг с пересечением
   ------------------------------------------------------------ */

function triangleCircleOverlap(): StampTemplate {
  const W = 240, H = 240;
  const CX = 120, CY = 120;
  const R = 105;

  const circle = shape({
    kind: 'ellipse',
    x: CX - R, y: CY - R,
    width: R * 2, height: R * 2,
    strokeWidth: 2,
  });

  /* Треугольник подобран так, чтобы полностью уместиться в круге.
     Ширина 130, высота 110. Вершина внутри круга. */
  const triW = 130;
  const triH = 110;
  const triX = CX - triW / 2;
  const triY = CY - 60;

  const triangle = shape({
    kind: 'triangle',
    x: triX, y: triY,
    width: triW, height: triH,
    strokeWidth: 2,
  });

  /* Заливка — только пересечение: якорь в центре треугольника,
     круг привязки — сам круг, стены — штрих треугольника. */
  const overlapFill = anchorFill(
    circle, YELLOW_LIGHT,
    { x: 0.5, y: 0.7 },
    W, H, 'Пересечение',
  );

  return {
    id: 'special-triangle-circle',
    name: 'Треугольник + круг',
    description: 'Пересечение треугольника и круга с заливкой',
    icon: '◬',
    width: W, height: H,
    shapes: [overlapFill, circle, triangle],
    texts: [
      /* Название — внутри пересечения, надписью по центру треугольника. */
      text({
        text: 'ЗОНА КОНТРОЛЯ', mode: 'straight',
        x: CX - 55, y: CY - 30, width: 110,
        fontSize: 10, fontStyle: 'bold', align: 'center', fill: INK,
      }),
      text({
        text: 'Сектор А', mode: 'straight',
        x: CX - 55, y: CY - 14, width: 110,
        fontSize: 9, align: 'center', fill: SOFT,
      }),
      /* Подпись в нижней части круга, вне треугольника. */
      text({
        text: 'Участок № 5', mode: 'straight',
        x: CX - 55, y: CY + 65, width: 110,
        fontSize: 10, align: 'center', fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   КРУГЛЫЕ ПЕЧАТИ С ДУГОВЫМ ТЕКСТОМ
   ============================================================ */

/* ------------------------------------------------------------
   8. Круглая печать с двумя концентрическими кольцами текста
   ------------------------------------------------------------ */

function doubleRingSeal(): StampTemplate {
  const W = 220, H = 220;
  const CX = 110, CY = 110;
  const R_OUTER = 106;
  const R_INNER = 82;
  const R_CENTER = 58;

  const outer = shape({
    kind: 'ellipse',
    x: CX - R_OUTER, y: CY - R_OUTER,
    width: R_OUTER * 2, height: R_OUTER * 2,
    strokeWidth: 2,
  });
  const inner = shape({
    kind: 'ellipse',
    x: CX - R_INNER, y: CY - R_INNER,
    width: R_INNER * 2, height: R_INNER * 2,
    strokeWidth: 1,
  });
  const center = shape({
    kind: 'ellipse',
    x: CX - R_CENTER, y: CY - R_CENTER,
    width: R_CENTER * 2, height: R_CENTER * 2,
    strokeWidth: 1,
    dash: 'dotted',
  });

  return {
    id: 'special-double-ring-seal',
    name: 'Печать с двумя кольцами',
    description: 'Круглая печать с двумя концентрическими кольцами текста',
    icon: '🌀',
    width: W, height: H,
    shapes: [outer, inner, center],
    texts: [
      /* Внешнее кольцо — название организации */
      text({
        text: 'ООО «РОМАШКА»', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 95,
        arcStartDeg: -160, arcEndDeg: -20, arcSpanDeg: 140,
        fontSize: 11, fontStyle: 'bold',
      }),
      text({
        text: 'ОГРН 1234567890123', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 95,
        arcStartDeg: 160, arcEndDeg: 20, arcFlip: true, arcSpanDeg: 140,
        fontSize: 8, fill: SOFT,
      }),

      /* Внутреннее кольцо — вид деятельности */
      text({
        text: 'ОПТОВАЯ ТОРГОВЛЯ', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 72,
        arcStartDeg: -150, arcEndDeg: -30, arcSpanDeg: 120,
        fontSize: 8, fontStyle: 'bold', fill: BLUE,
      }),
      text({
        text: 'ИНН 7701234567', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 72,
        arcStartDeg: 150, arcEndDeg: 30, arcFlip: true, arcSpanDeg: 120,
        fontSize: 7, fill: SOFT,
      }),

      /* Центральная зона — прямой текст */
      text({
        text: 'МОСКВА', mode: 'straight',
        x: CX - 50, y: CY - 14, width: 100,
        fontSize: 14, fontStyle: 'bold',
      }),
      text({
        text: '2026', mode: 'straight',
        x: CX - 50, y: CY + 8, width: 100,
        fontSize: 11, fill: SOFT,
      }),
    ],
  };
}

/* ------------------------------------------------------------
   9. Круглая печать с цветным логотипом в центре
   ------------------------------------------------------------ */

function logoSeal(): StampTemplate {
  const W = 220, H = 220;
  const CX = 110, CY = 110;
  const R_OUTER = 106;
  const R_INNER = 78;
  const R_LOGO = 44;

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
  const logo = shape({
    kind: 'ellipse',
    x: CX - R_LOGO, y: CY - R_LOGO,
    width: R_LOGO * 2, height: R_LOGO * 2,
    strokeWidth: 0, stroke: undefined,
  });
  const logoFill = anchorFill(
    logo, BLUE,
    { x: 0.5, y: 0.5 },
    W, H, 'Логотип',
  );

  return {
    id: 'special-logo-seal',
    name: 'Печать с логотипом',
    description: 'Круглая печать с цветным логотипом в центре',
    icon: '🎯',
    width: W, height: H,
    shapes: [logoFill, outer, inner, logo],
    texts: [
      text({
        text: 'ПАО «КОМПАНИЯ»', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 92,
        arcStartDeg: -155, arcEndDeg: -25, arcSpanDeg: 130,
        fontSize: 12, fontStyle: 'bold',
      }),
      text({
        text: 'ГОРОД · УЛИЦА · ДОМ 1', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 92,
        arcStartDeg: 155, arcEndDeg: 25, arcFlip: true, arcSpanDeg: 130,
        fontSize: 8, fill: SOFT,
      }),
      /* Логотип */
      text({
        text: '★', mode: 'straight',
        x: CX - 30, y: CY - 28, width: 60,
        fontSize: 44, fill: WHITE,
      }),
      /* Подпись под логотипом */
      text({
        text: 'С 1995 ГОДА', mode: 'straight',
        x: CX - 60, y: CY + 56, width: 120,
        fontSize: 8, fill: SOFT,
      }),
    ],
  };
}

/* ------------------------------------------------------------
   10. Овальная горизонтальная печать (кадры, медицина)
   ------------------------------------------------------------ */

function ovalStamp(): StampTemplate {
  const W = 280, H = 180;
  const CX = 140, CY = 90;
  const RX = 132;
  const RY = 82;

  const outer = shape({
    kind: 'ellipse',
    x: CX - RX, y: CY - RY,
    width: RX * 2, height: RY * 2,
    strokeWidth: 2.5,
  });
  const inner = shape({
    kind: 'ellipse',
    x: CX - RX + 8, y: CY - RY + 8,
    width: (RX - 8) * 2, height: (RY - 8) * 2,
    strokeWidth: 1,
  });

  return {
    id: 'special-oval-stamp',
    name: 'Овальная (кадры/медицина)',
    description: 'Овальный штамп для отделов кадров и медицинских учреждений',
    icon: '⬭',
    width: W, height: H,
    shapes: [outer, inner],
    texts: [
      /* Верхняя дуга: узкий диапазон вокруг -90°,
         текст держится в верхней части овала. */
      text({
        text: 'ОТДЕЛ КАДРОВ', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 72,
        arcStartDeg: -140, arcEndDeg: -40, arcSpanDeg: 100,
        fontSize: 12, fontStyle: 'bold',
      }),
      /* Нижняя дуга: симметрично, «РОМАШКА» без ООО — влезает чисто. */
      text({
        text: '«РОМАШКА»', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 72,
        arcStartDeg: 140, arcEndDeg: 40, arcFlip: true, arcSpanDeg: 100,
        fontSize: 10, fill: SOFT,
      }),
      /* Центр — прямые строки, компактный блок. */
      text({
        text: 'Для документов', mode: 'straight',
        x: CX - 90, y: CY - 26, width: 180,
        fontSize: 12, fontStyle: 'italic',
      }),
      text({
        text: 'Дата: «___» ________ 20___', mode: 'straight',
        x: CX - 90, y: CY + 2, width: 180,
        fontSize: 9, fill: SOFT,
      }),
      text({
        text: 'Подпись: ______________', mode: 'straight',
        x: CX - 90, y: CY + 24, width: 180,
        fontSize: 9, fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   Экспорт
   ============================================================ */

export const SPECIAL_STAMPS: StampTemplate[] = [
  /* Треугольные */
  triangularMedical(),
  triangularBusinessTrip(),
  triangularPackage(),

  /* Со сложной заливкой */
  vennSeal(),
  highlightedFrame(),
  dualFillStamp(),
  triangleCircleOverlap(),

  /* Круглые с дуговым текстом */
  doubleRingSeal(),
  logoSeal(),
  ovalStamp(),
];