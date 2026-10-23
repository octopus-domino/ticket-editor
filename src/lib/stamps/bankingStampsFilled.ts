/* ============================================================
   lib/stamps/bankingStampsFilled.ts

   Банковские штампы с заливкой областей.

   Каждый штамп использует anchor-заливку:
   - есть контейнерная фигура (обводка);
   - есть fill-элемент, привязанный к контейнеру через
     fillTargetShapeId;
   - fillAnchorLocal — доля (0..1) внутри bbox контейнера,
     указывающая точку сида flood fill.

   В редакторе такую заливку можно поменять цвет или скрыть,
   не разрушая штамп.
   ============================================================ */

import type { StampShapeItem, StampTextItem } from '@/shared/types';
import { uid } from '../uid';
import type { StampTemplate } from './types';

const INK = '#0a2540';
const SOFT = '#374151';
const WHITE = '#ffffff';
const GREEN = '#15803d';
const GREEN_LIGHT = '#dcfce7';
const RED = '#b91c1c';
const RED_LIGHT = '#fecaca';
const BLUE = '#1e40af';
const BLUE_LIGHT = '#dbeafe';
const YELLOW = '#ca8a04';
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

/**
 * Anchor-заливка: полностью повторяет геометрию целевого контейнера.
 * bbox = весь штамп, seed задаётся в долях от bbox контейнера.
 */
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
   1. КРУГЛАЯ ПЕЧАТЬ С ЗАЛИТЫМ КОЛЬЦОМ
   ============================================================ */

function filledRingSeal(): StampTemplate {
  const W = 200, H = 200;
  const CX = 100, CY = 100;
  const R_OUTER = 96;
  const R_INNER = 74;

  const outer = shape({
    kind: 'ellipse',
    x: CX - R_OUTER, y: CY - R_OUTER,
    width: R_OUTER * 2, height: R_OUTER * 2,
    strokeWidth: 2, stroke: WHITE,
  });
  const inner = shape({
    kind: 'ellipse',
    x: CX - R_INNER, y: CY - R_INNER,
    width: R_INNER * 2, height: R_INNER * 2,
    strokeWidth: 1, stroke: WHITE,
  });

  /* Anchor в кольце: между R_INNER и R_OUTER → например y = 15 */
  const ringFill = anchorFill(
    outer, INK,
    { x: 0.5, y: 0.075 },  /* (100, 15) внутри кольца */
    W, H, 'Кольцо печати',
  );

  return {
    id: 'bank-filled-ring',
    name: 'Печать с кольцом',
    description: 'Круглая печать с залитым кольцом',
    icon: '🔵',
    width: W, height: H,
    shapes: [ringFill, outer, inner],
    texts: [
      text({
        text: 'БАНК РОССИИ', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 85,
        arcStartDeg: -160, arcEndDeg: -20, arcSpanDeg: 140,
        fontSize: 11, fontStyle: 'bold', fill: WHITE,
      }),
      text({
        text: 'ОГРН 1027700132195', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 85,
        arcStartDeg: 160, arcEndDeg: 20, arcFlip: true, arcSpanDeg: 140,
        fontSize: 8, fill: WHITE,
      }),
      text({
        text: 'МОСКВА', mode: 'straight',
        x: CX - 60, y: CY - 18, width: 120,
        fontSize: 14, fontStyle: 'bold', fill: INK,
      }),
      text({
        text: 'ИНН 7707083893', mode: 'straight',
        x: CX - 60, y: CY + 4, width: 120,
        fontSize: 9, fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   2. УГЛОВОЙ ШТАМП С ЗАЛИТОЙ ШАПКОЙ
   ============================================================ */

function cornerWithHeader(): StampTemplate {
  const W = 340, H = 140;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 1.5,
  });
  /* Шапка — отдельный прямоугольник, который будет залит */
  const header = shape({
    kind: 'rect', x: 4, y: 4, width: W - 8, height: 38,
    cornerRadius: 2, strokeWidth: 0, stroke: undefined,
  });
  const headerFill = anchorFill(
    header, BLUE,
    { x: 0.5, y: 0.5 },
    W, H, 'Шапка штампа',
  );
  const separator = shape({
    kind: 'line', x: 8, y: 42, width: W - 16, height: 1,
    points: [0, 0, W - 16, 0], strokeWidth: 1,
  });
  const divider = shape({
    kind: 'line', x: W / 2, y: 48, width: 1, height: H - 56,
    points: [0, 0, 0, H - 56], strokeWidth: 1, dash: 'dotted',
  });

  return {
    id: 'bank-corner-filled',
    name: 'Угловой (с плашкой)',
    description: 'Реквизиты банка с цветной шапкой',
    icon: '🏦',
    width: W, height: H,
    shapes: [headerFill, frame, header, separator, divider],
    texts: [
      text({
        text: 'ПАО СБЕРБАНК РОССИИ', mode: 'straight',
        x: 16, y: 12, width: W - 32,
        fontSize: 14, fontStyle: 'bold', fill: WHITE, align: 'left',
      }),

      text({
        text: 'БИК', mode: 'straight',
        x: 20, y: 52, width: 80,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: '044525225', mode: 'straight',
        x: 20, y: 66, width: 140,
        fontSize: 12, fontStyle: 'bold', align: 'left',
      }),
      text({
        text: 'К/с', mode: 'straight',
        x: 20, y: 90, width: 80,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: '30101810400000000225', mode: 'straight',
        x: 20, y: 104, width: 150,
        fontSize: 10, align: 'left',
      }),

      text({
        text: 'Р/с', mode: 'straight',
        x: W / 2 + 12, y: 52, width: 80,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: '40702810438170000001', mode: 'straight',
        x: W / 2 + 12, y: 66, width: 160,
        fontSize: 10, align: 'left',
      }),
      text({
        text: 'ИНН', mode: 'straight',
        x: W / 2 + 12, y: 90, width: 80,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: '7707083893', mode: 'straight',
        x: W / 2 + 12, y: 104, width: 140,
        fontSize: 10, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   3. ШТАМП «ОПЛАЧЕНО» С ЗАЛИВКОЙ (зелёный)
   ============================================================ */

function paidFilled(): StampTemplate {
  const W = 240, H = 80;

  const outer = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2.5,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 3, strokeWidth: 0, stroke: undefined,
  });
  const innerFill = anchorFill(
    inner, GREEN,
    { x: 0.5, y: 0.5 },
    W, H, 'Зелёная плашка',
  );

  return {
    id: 'bank-paid-filled',
    name: 'ОПЛАЧЕНО (зелёный)',
    description: 'Штамп об оплате с зелёной плашкой',
    icon: '✅',
    width: W, height: H,
    shapes: [innerFill, outer, inner],
    texts: [
      text({
        text: 'ОПЛАЧЕНО', mode: 'straight',
        x: 20, y: 14, width: W - 40,
        fontSize: 26, fontStyle: 'bold', fill: WHITE,
      }),
      text({
        text: '«____» ____________ 20___ г.', mode: 'straight',
        x: 20, y: 55, width: W - 40,
        fontSize: 9, fill: GREEN_LIGHT,
      }),
    ],
  };
}

/* ============================================================
   4. ШТАМП «АННУЛИРОВАНО» (красный)
   ============================================================ */

function cancelled(): StampTemplate {
  const W = 280, H = 100;

  const outer = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2.5, stroke: RED,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 2, strokeWidth: 0, stroke: undefined,
  });
  const innerFill = anchorFill(
    inner, RED,
    { x: 0.5, y: 0.5 },
    W, H, 'Красная плашка',
  );

  return {
    id: 'bank-cancelled',
    name: 'АННУЛИРОВАНО',
    description: 'Красный штамп отмены',
    icon: '🚫',
    width: W, height: H,
    shapes: [innerFill, outer, inner],
    texts: [
      text({
        text: 'АННУЛИРОВАНО', mode: 'straight',
        x: 16, y: 20, width: W - 32,
        fontSize: 26, fontStyle: 'bold', fill: WHITE,
      }),
      text({
        text: 'Причина: ____________________', mode: 'straight',
        x: 16, y: 62, width: W - 32,
        fontSize: 10, fill: RED_LIGHT, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   5. ШТАМП «ДЕПОЗИТ ПРИНЯТ»
   ============================================================ */

function depositAccepted(): StampTemplate {
  const W = 260, H = 100;

  const outer = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2, stroke: GREEN,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 4, strokeWidth: 0, stroke: undefined,
  });
  const innerFill = anchorFill(
    inner, GREEN_LIGHT,
    { x: 0.5, y: 0.5 },
    W, H, 'Светло-зелёный фон',
  );

  return {
    id: 'bank-deposit-accepted',
    name: 'ДЕПОЗИТ ПРИНЯТ',
    description: 'Штамп приёма депозита',
    icon: '💵',
    width: W, height: H,
    shapes: [innerFill, outer, inner],
    texts: [
      text({
        text: 'ДЕПОЗИТ ПРИНЯТ', mode: 'straight',
        x: 16, y: 12, width: W - 32,
        fontSize: 18, fontStyle: 'bold', fill: GREEN,
      }),
      text({
        text: 'Сумма: _______________ руб.', mode: 'straight',
        x: 16, y: 42, width: W - 32,
        fontSize: 10, align: 'left', fill: INK,
      }),
      text({
        text: 'Счёт №: ____________________', mode: 'straight',
        x: 16, y: 58, width: W - 32,
        fontSize: 10, align: 'left', fill: INK,
      }),
      text({
        text: 'Кассир: ______________  /подпись/', mode: 'straight',
        x: 16, y: 76, width: W - 32,
        fontSize: 9, align: 'left', fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   6. ПЕЧАТЬ С ЦЕНТРАЛЬНОЙ ЭМБЛЕМОЙ
   ============================================================ */

function sealWithEmblem(): StampTemplate {
  const W = 200, H = 200;
  const CX = 100, CY = 100;
  const R_OUTER = 96;
  const R_INNER = 76;
  const R_EMBLEM = 38;

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
  const emblem = shape({
    kind: 'ellipse',
    x: CX - R_EMBLEM, y: CY - R_EMBLEM,
    width: R_EMBLEM * 2, height: R_EMBLEM * 2,
    strokeWidth: 0, stroke: undefined,
  });
  const emblemFill = anchorFill(
    emblem, BLUE,
    { x: 0.5, y: 0.5 },
    W, H, 'Эмблема банка',
  );

  return {
    id: 'bank-emblem-seal',
    name: 'Печать с эмблемой',
    description: 'Круглая печать с цветной эмблемой в центре',
    icon: '🎖',
    width: W, height: H,
    shapes: [emblemFill, outer, inner, emblem],
    texts: [
      text({
        text: 'БАНК РОССИИ', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 85,
        arcStartDeg: -160, arcEndDeg: -20, arcSpanDeg: 140,
        fontSize: 11, fontStyle: 'bold',
      }),
      text({
        text: 'МОСКВА · ОГРН 1027700132195', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 85,
        arcStartDeg: 160, arcEndDeg: 20, arcFlip: true, arcSpanDeg: 140,
        fontSize: 8, fill: SOFT,
      }),
      text({
        text: '₽', mode: 'straight',
        x: CX - 30, y: CY - 26, width: 60,
        fontSize: 36, fontStyle: 'bold', fill: WHITE,
      }),
      text({
        text: 'БИК 044525225', mode: 'straight',
        x: CX - 60, y: CY + 48, width: 120,
        fontSize: 8, fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   7. ПОЛОСАТЫЙ ШТАМП (диагональные полосы)
   ============================================================ */

function stripedStamp(): StampTemplate {
  const W = 260, H = 90;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2,
  });
  /* Жёлтая подложка */
  const inner = shape({
    kind: 'rect', x: 6, y: 6, width: W - 12, height: H - 12,
    cornerRadius: 3, strokeWidth: 0, stroke: undefined,
  });
  const innerFill = anchorFill(
    inner, YELLOW_LIGHT,
    { x: 0.5, y: 0.5 },
    W, H, 'Жёлтый фон',
  );

  /* 3 тонкие диагонали в правой трети */
  const angle = 55;
  const makeDiagonal = (x0: number): StampShapeItem => {
    const dx = Math.tan((angle * Math.PI) / 180) * H;
    return shape({
      kind: 'line',
      x: x0, y: 6,
      width: Math.abs(dx), height: H - 12,
      points: [0, H - 12, dx, 0],
      stroke: YELLOW, strokeWidth: 1.5, dash: 'solid',
    });
  };

  const d1 = makeDiagonal(W - 100);
  const d2 = makeDiagonal(W - 70);
  const d3 = makeDiagonal(W - 40);

  return {
    id: 'bank-striped',
    name: 'Полосатый клиш-штамп',
    description: 'Оформительский штамп с диагональными полосами',
    icon: '🎗',
    width: W, height: H,
    shapes: [innerFill, frame, inner, d1, d2, d3],
    texts: [
      text({
        text: 'ПРИНЯТО К ИСПОЛНЕНИЮ', mode: 'straight',
        x: 14, y: 30, width: W - 130,
        fontSize: 15, fontStyle: 'bold', fill: INK, align: 'left',
      }),
      text({
        text: 'Дата и подпись операциониста', mode: 'straight',
        x: 14, y: 58, width: W - 130,
        fontSize: 8, fill: SOFT, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   8. ШТАМП КАССИРА С ЗОНОЙ ПОДПИСИ
   ============================================================ */

function cashierSignature(): StampTemplate {
  const W = 240, H = 110;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2,
  });
  /* Зона подписи — светлая плашка */
  const sigZone = shape({
    kind: 'rect', x: 12, y: 62, width: W - 24, height: 38,
    cornerRadius: 3, strokeWidth: 1, stroke: SOFT, dash: 'dotted',
  });
  const sigFill = anchorFill(
    sigZone, BLUE_LIGHT,
    { x: 0.5, y: 0.5 },
    W, H, 'Зона подписи',
  );

  return {
    id: 'bank-cashier-signature',
    name: 'Штамп кассира (с зоной)',
    description: 'Кассовый штамп с плашкой для подписи',
    icon: '🖋',
    width: W, height: H,
    shapes: [sigFill, frame, sigZone],
    texts: [
      text({
        text: 'ОПЕРАЦИОННАЯ КАССА', mode: 'straight',
        x: 12, y: 10, width: W - 24,
        fontSize: 12, fontStyle: 'bold', fill: INK,
      }),
      text({
        text: 'Операция №: ____________', mode: 'straight',
        x: 12, y: 34, width: W - 24,
        fontSize: 10, align: 'left', fill: INK,
      }),
      text({
        text: 'Дата: «___» ________ 20___', mode: 'straight',
        x: 12, y: 48, width: W - 24,
        fontSize: 9, align: 'left', fill: SOFT,
      }),
      text({
        text: 'Подпись кассира', mode: 'straight',
        x: 12, y: 70, width: W - 24,
        fontSize: 8, fill: SOFT,
      }),
      text({
        text: '__________________________', mode: 'straight',
        x: 12, y: 88, width: W - 24,
        fontSize: 9, fill: INK,
      }),
    ],
  };
}

/* ============================================================
   Экспорт
   ============================================================ */

export const BANKING_STAMPS_FILLED: StampTemplate[] = [
  filledRingSeal(),
  cornerWithHeader(),
  paidFilled(),
  cancelled(),
  depositAccepted(),
  sealWithEmblem(),
  stripedStamp(),
  cashierSignature(),
];