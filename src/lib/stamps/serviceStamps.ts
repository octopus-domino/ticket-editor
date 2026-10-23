/* ============================================================
   lib/stamps/serviceStamps.ts

   Библиотека штампов для сферы услуг: кредиты, страховки,
   справки, программы лояльности и сервисные центры.

   Построена на той же технологии, что и bankingStamps.ts:
   StampShapeItem (обводки) + StampTextItem (прямой и дуговой
   текст) + anchor-заливка через fillTargetShapeId.
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
const YELLOW_LIGHT = '#fef9c3';
const PURPLE = '#6b21a8';
const PURPLE_LIGHT = '#f3e8ff';

/* ============================================================
   Фабрики (локальные)
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
   1. ШТАМП «КРЕДИТ»
   ============================================================ */

function creditStamp(): StampTemplate {
  const W = 240, H = 90;

  const outer = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2.5, stroke: BLUE,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 3, strokeWidth: 0, stroke: undefined,
  });
  const innerFill = anchorFill(
    inner, BLUE_LIGHT,
    { x: 0.5, y: 0.5 },
    W, H, 'Светло-синий фон',
  );

  return {
    id: 'service-credit',
    name: 'КРЕДИТ',
    description: 'Штамп для маркировки кредитных документов',
    icon: '💳',
    width: W, height: H,
    shapes: [innerFill, outer, inner],
    texts: [
      text({
        text: 'КРЕДИТ', mode: 'straight',
        x: 16, y: 16, width: W - 32,
        fontSize: 32, fontStyle: 'bold', fill: BLUE,
      }),
      text({
        text: 'Договор №: ________________', mode: 'straight',
        x: 16, y: 60, width: W - 32,
        fontSize: 10, align: 'left', fill: INK,
      }),
    ],
  };
}

/* ============================================================
   2. ШТАМП СТРАХОВОЙ КОМПАНИИ (С РЕКВИЗИТАМИ)
   ============================================================ */

function insuranceStamp(): StampTemplate {
  const W = 300, H = 120;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 1.5,
  });
  const header = shape({
    kind: 'rect', x: 4, y: 4, width: W - 8, height: 32,
    cornerRadius: 2, strokeWidth: 0, stroke: undefined,
  });
  const headerFill = anchorFill(
    header, PURPLE,
    { x: 0.5, y: 0.5 },
    W, H, 'Шапка штампа',
  );
  const separator = shape({
    kind: 'line', x: 8, y: 38, width: W - 16, height: 1,
    points: [0, 0, W - 16, 0], strokeWidth: 1,
  });

  return {
    id: 'service-insurance',
    name: 'Страховая компания',
    description: 'Штамп страховой компании с реквизитами и контактами',
    icon: '🛡',
    width: W, height: H,
    shapes: [headerFill, frame, header, separator],
    texts: [
      text({
        text: 'ООО «СТРАХОВАЯ КОМПАНИЯ»', mode: 'straight',
        x: 16, y: 10, width: W - 32,
        fontSize: 13, fontStyle: 'bold', fill: WHITE, align: 'left',
      }),

      text({
        text: 'ИНН', mode: 'straight',
        x: 16, y: 48, width: 60,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: '7701234567', mode: 'straight',
        x: 16, y: 62, width: 120,
        fontSize: 11, fontStyle: 'bold', align: 'left',
      }),

      text({
        text: 'ОГРН', mode: 'straight',
        x: 16, y: 82, width: 60,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
      text({
        text: '1234567890123', mode: 'straight',
        x: 16, y: 96, width: 140,
        fontSize: 10, align: 'left',
      }),

      text({
        text: 'При ДТП звонить: +7 (495) 123-45-67', mode: 'straight',
        x: 170, y: 48, width: 120,
        fontSize: 10, align: 'left', fill: INK,
      }),
      text({
        text: 'Аварийный комиссар: +7 (999) 765-43-21', mode: 'straight',
        x: 170, y: 64, width: 120,
        fontSize: 10, align: 'left', fill: INK,
      }),
      text({
        text: 'www.insurance.ru', mode: 'straight',
        x: 170, y: 96, width: 120,
        fontSize: 9, fill: SOFT, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   3. ШТАМП «СПРАВКА» / «ВЫПИСКА»
   ============================================================ */

function certificateStamp(): StampTemplate {
  const W = 260, H = 100;

  const outer = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2, stroke: GREEN,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 2, strokeWidth: 0, stroke: undefined,
  });
  const innerFill = anchorFill(
    inner, GREEN_LIGHT,
    { x: 0.5, y: 0.5 },
    W, H, 'Светло-зелёный фон',
  );

  return {
    id: 'service-certificate',
    name: 'СПРАВКА / ВЫПИСКА',
    description: 'Штамп для справок и выписок из документов',
    icon: '📄',
    width: W, height: H,
    shapes: [innerFill, outer, inner],
    texts: [
      text({
        text: 'СПРАВКА ВЫДАНА', mode: 'straight',
        x: 16, y: 14, width: W - 32,
        fontSize: 16, fontStyle: 'bold', fill: GREEN,
      }),
      text({
        text: '_____________________________', mode: 'straight',
        x: 16, y: 42, width: W - 32,
        fontSize: 9, align: 'left', fill: INK,
      }),
      text({
        text: 'Дата: «___» ________ 20___ г.', mode: 'straight',
        x: 16, y: 62, width: W - 32,
        fontSize: 9, align: 'left', fill: SOFT,
      }),
      text({
        text: 'Подпись: ______________ / М.П. /', mode: 'straight',
        x: 16, y: 80, width: W - 32,
        fontSize: 9, align: 'left', fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   4. ШТАМП ПРОГРАММЫ ЛОЯЛЬНОСТИ
   ============================================================ */

function loyaltyStamp(): StampTemplate {
  const W = 200, H = 200;
  const CX = 100, CY = 100;
  const R_OUTER = 96;
  const R_INNER = 70;

  const outer = shape({
    kind: 'ellipse',
    x: CX - R_OUTER, y: CY - R_OUTER,
    width: R_OUTER * 2, height: R_OUTER * 2,
    strokeWidth: 3, stroke: PURPLE,
  });
  const inner = shape({
    kind: 'ellipse',
    x: CX - R_INNER, y: CY - R_INNER,
    width: R_INNER * 2, height: R_INNER * 2,
    strokeWidth: 1, stroke: PURPLE,
  });
  const innerFill = anchorFill(
    inner, PURPLE_LIGHT,
    { x: 0.5, y: 0.5 },
    W, H, 'Светло-фиолетовый фон',
  );

  return {
    id: 'service-loyalty',
    name: 'Программа лояльности',
    description: 'Круглый штамп для карт лояльности и бонусных программ',
    icon: '🎁',
    width: W, height: H,
    shapes: [innerFill, outer, inner],
    texts: [
      text({
        text: 'ПРОГРАММА ЛОЯЛЬНОСТИ', mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 82,
        arcStartDeg: -160, arcEndDeg: -20, arcSpanDeg: 140,
        fontSize: 11, fontStyle: 'bold', fill: PURPLE,
      }),
      text({
        text: 'БОНУСНАЯ КАРТА', mode: 'straight',
        x: CX - 70, y: CY - 20, width: 140,
        fontSize: 14, fontStyle: 'bold', fill: PURPLE,
      }),
      text({
        text: '№: ________________', mode: 'straight',
        x: CX - 60, y: CY + 6, width: 120,
        fontSize: 10, fill: INK,
      }),
      text({
        text: 'Ваш статус: ________', mode: 'straight',
        x: CX - 60, y: CY + 26, width: 120,
        fontSize: 10, fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   5. ШТАМП СЕРВИСНОГО ЦЕНТРА
   ============================================================ */

function serviceCenterStamp(): StampTemplate {
  const W = 280, H = 110;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2,
  });
  const sigZone = shape({
    kind: 'rect', x: 12, y: 70, width: W - 24, height: 30,
    cornerRadius: 3, strokeWidth: 1, stroke: SOFT, dash: 'dotted',
  });
  const sigFill = anchorFill(
    sigZone, YELLOW_LIGHT,
    { x: 0.5, y: 0.5 },
    W, H, 'Зона подписи',
  );

  return {
    id: 'service-center',
    name: 'Сервисный центр',
    description: 'Штамп сервисного центра для квитанций и гарантийных талонов',
    icon: '🔧',
    width: W, height: H,
    shapes: [sigFill, frame, sigZone],
    texts: [
      text({
        text: 'СЕРВИСНЫЙ ЦЕНТР', mode: 'straight',
        x: 12, y: 10, width: W - 24,
        fontSize: 14, fontStyle: 'bold', fill: INK,
      }),
      text({
        text: 'Ремонт: ______________', mode: 'straight',
        x: 12, y: 34, width: W - 24,
        fontSize: 10, align: 'left', fill: INK,
      }),
      text({
        text: 'Дата приёма: «___» ________ 20___', mode: 'straight',
        x: 12, y: 50, width: W - 24,
        fontSize: 9, align: 'left', fill: SOFT,
      }),
      text({
        text: 'Гарантия: ______________', mode: 'straight',
        x: 12, y: 78, width: W - 24,
        fontSize: 9, align: 'left', fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   6. ШТАМП «ОТКАЗАНО» (для кредитов/страховок)
   ============================================================ */

function rejectedStamp(): StampTemplate {
  const W = 260, H = 100;

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
    id: 'service-rejected',
    name: 'ОТКАЗАНО',
    description: 'Штамп отказа по заявке на кредит или страховку',
    icon: '❌',
    width: W, height: H,
    shapes: [innerFill, outer, inner],
    texts: [
      text({
        text: 'ОТКАЗАНО', mode: 'straight',
        x: 16, y: 20, width: W - 32,
        fontSize: 28, fontStyle: 'bold', fill: WHITE,
      }),
      text({
        text: 'Причина: ____________________', mode: 'straight',
        x: 16, y: 64, width: W - 32,
        fontSize: 10, fill: RED_LIGHT, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   7. ШТАМП «ПРОВЕРЕНО» (для справок/документов)
   ============================================================ */

function verifiedStamp(): StampTemplate {
  const W = 220, H = 80;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2, stroke: BLUE,
  });
  const header = shape({
    kind: 'rect', x: 4, y: 4, width: W - 8, height: 26,
    cornerRadius: 3, strokeWidth: 0, stroke: undefined,
  });
  const headerFill = anchorFill(
    header, BLUE,
    { x: 0.5, y: 0.5 },
    W, H, 'Синяя шапка',
  );

  return {
    id: 'service-verified',
    name: 'ПРОВЕРЕНО',
    description: 'Штамп проверки справок и документов',
    icon: '✅',
    width: W, height: H,
    shapes: [headerFill, frame, header],
    texts: [
      text({
        text: 'ПРОВЕРЕНО', mode: 'straight',
        x: 12, y: 8, width: W - 24,
        fontSize: 16, fontStyle: 'bold', fill: WHITE,
      }),
      text({
        text: 'Дата: «___» ________ 20___', mode: 'straight',
        x: 12, y: 40, width: W - 24,
        fontSize: 10, align: 'left', fill: INK,
      }),
      text({
        text: 'Подпись: ______________', mode: 'straight',
        x: 12, y: 58, width: W - 24,
        fontSize: 10, align: 'left', fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   8. ШТАМП «БОНУС НАЧИСЛЕН»
   ============================================================ */

function bonusAccruedStamp(): StampTemplate {
  const W = 240, H = 90;

  const outer = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2.5, stroke: GREEN,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 3, strokeWidth: 0, stroke: undefined,
  });
  const innerFill = anchorFill(
    inner, GREEN_LIGHT,
    { x: 0.5, y: 0.5 },
    W, H, 'Зелёная плашка',
  );

  return {
    id: 'service-bonus-accrued',
    name: 'БОНУС НАЧИСЛЕН',
    description: 'Штамп о начислении бонусов по программе лояльности',
    icon: '💰',
    width: W, height: H,
    shapes: [innerFill, outer, inner],
    texts: [
      text({
        text: 'БОНУС НАЧИСЛЕН', mode: 'straight',
        x: 16, y: 16, width: W - 32,
        fontSize: 20, fontStyle: 'bold', fill: GREEN,
      }),
      text({
        text: 'Сумма: ______________ бонусов', mode: 'straight',
        x: 16, y: 50, width: W - 32,
        fontSize: 10, align: 'left', fill: INK,
      }),
      text({
        text: 'Дата: «___» ________ 20___', mode: 'straight',
        x: 16, y: 68, width: W - 32,
        fontSize: 9, align: 'left', fill: SOFT,
      }),
    ],
  };
}

/* ============================================================
   Экспорт
   ============================================================ */

export const SERVICE_STAMPS: StampTemplate[] = [
  creditStamp(),
  insuranceStamp(),
  certificateStamp(),
  loyaltyStamp(),
  serviceCenterStamp(),
  rejectedStamp(),
  verifiedStamp(),
  bonusAccruedStamp(),
];