/* ============================================================
   lib/stamps/bankingStamps.ts

   Библиотека штампов для банковского документооборота.
   Построена на той же технологии, что и BUILTIN_STAMPS:
   StampShapeItem (обводки) + StampTextItem (прямой и дуговой
   текст) + anchor-заливка через fillTargetShapeId.

   Все штампы используют монохромный синий #0a2540 (стандартный
   банковский оттенок) и тонкие обводки 1-1.5 px, чтобы
   соответствовать визуалу реальных печатей.

   Подключение: см. инструкцию в конце файла.
   ============================================================ */

import type { StampShapeItem, StampTextItem } from '@/shared/types';
import { uid } from '../uid';
import type { StampTemplate } from './types';

/* ============================================================
   Локальные фабрики
   ============================================================ */

const INK = '#0a2540';       /* банковский тёмно-синий */
const INK_SOFT = '#374151';  /* для вспомогательного текста */

const shape = (
  o: Partial<StampShapeItem> & { kind: StampShapeItem['kind'] },
): StampShapeItem => ({
  id: uid(),
  x: 0, y: 0, width: 100, height: 100,
  rotation: 0,
  cornerRadius: 0,
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

/* ============================================================
   1. КРУГЛАЯ ПЕЧАТЬ ОРГАНИЗАЦИИ
   ============================================================ */

function orgSeal(): StampTemplate {
  const CX = 100, CY = 100;
  const R_OUTER = 96;
  const R_INNER = 76;

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

  return {
    id: 'bank-org-seal',
    name: 'Печать организации',
    description: 'Круглая печать юрлица с наименованием, ОГРН, ИНН/КПП',
    icon: '🏛',
    width: 200,
    height: 200,
    shapes: [outer, inner],
    texts: [
      text({
        text: 'ООО «РОМАШКА»',
        mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 86,
        arcStartDeg: -160, arcEndDeg: -20,
        arcSpanDeg: 140,
        fontSize: 11, fontStyle: 'bold',
      }),
      text({
        text: 'ОГРН 1234567890123',
        mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 86,
        arcStartDeg: 160, arcEndDeg: 20, arcFlip: true,
        arcSpanDeg: 140,
        fontSize: 9,
      }),
      text({
        text: 'МОСКВА',
        mode: 'straight',
        x: CX - 60, y: CY - 20, width: 120,
        fontSize: 11, fontStyle: 'bold',
      }),
      text({
        text: 'ИНН 7701234567',
        mode: 'straight',
        x: CX - 60, y: CY + 2, width: 120,
        fontSize: 9, fill: INK_SOFT,
      }),
      text({
        text: 'КПП 770101001',
        mode: 'straight',
        x: CX - 60, y: CY + 18, width: 120,
        fontSize: 9, fill: INK_SOFT,
      }),
    ],
  };
}

/* ============================================================
   2. «ДЛЯ ПЛАТЕЖНЫХ ДОКУМЕНТОВ» — штамп операциониста
   ============================================================ */

function paymentDocsStamp(): StampTemplate {
  const CX = 90, CY = 90;
  const R_OUTER = 86;
  const R_INNER = 68;

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
    dash: 'dotted',
  });

  return {
    id: 'bank-payment-docs',
    name: 'Для платежных документов',
    description: 'Круглый штамп операциониста банка',
    icon: '💳',
    width: 180,
    height: 180,
    shapes: [outer, inner],
    texts: [
      text({
        text: 'ПАО СБЕРБАНК',
        mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 78,
        arcStartDeg: -155, arcEndDeg: -25,
        arcSpanDeg: 130,
        fontSize: 11, fontStyle: 'bold',
      }),
      text({
        text: 'ДЛЯ ПЛАТЕЖНЫХ ДОКУМЕНТОВ',
        mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 78,
        arcStartDeg: 155, arcEndDeg: 25, arcFlip: true,
        arcSpanDeg: 130,
        fontSize: 8,
      }),
      text({
        text: 'ОПЕР. ОКНО № 4',
        mode: 'straight',
        x: CX - 55, y: CY - 24, width: 110,
        fontSize: 9,
      }),
      text({
        text: '20.10.2026',
        mode: 'straight',
        x: CX - 55, y: CY - 8, width: 110,
        fontSize: 11, fontStyle: 'bold',
      }),
      text({
        text: 'подпись',
        mode: 'straight',
        x: CX - 55, y: CY + 22, width: 110,
        fontSize: 8, fill: INK_SOFT, fontStyle: 'italic',
      }),
    ],
  };
}

/* ============================================================
   3. УГЛОВОЙ ШТАМП БАНКА (реквизиты)
   ============================================================ */

function bankCornerStamp(): StampTemplate {
  const W = 340, H = 140;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 1.5,
  });
  const separator = shape({
    kind: 'line', x: 8, y: 40, width: W - 16, height: 1,
    points: [0, 0, W - 16, 0],
    strokeWidth: 1,
  });
  const divider = shape({
    kind: 'line', x: W / 2, y: 44, width: 1, height: H - 52,
    points: [0, 0, 0, H - 52],
    strokeWidth: 1,
    dash: 'dotted',
  });

  return {
    id: 'bank-corner',
    name: 'Угловой штамп банка',
    description: 'Реквизиты банка для договоров и счетов',
    icon: '🏦',
    width: W,
    height: H,
    shapes: [frame, separator, divider],
    texts: [
      text({
        text: 'ПАО СБЕРБАНК РОССИИ',
        mode: 'straight',
        x: 16, y: 8, width: W - 32,
        fontSize: 14, fontStyle: 'bold', align: 'left',
      }),
      text({
        text: 'Головное отделение по г. Москве',
        mode: 'straight',
        x: 16, y: 26, width: W - 32,
        fontSize: 9, fill: INK_SOFT, align: 'left',
      }),

      text({
        text: 'БИК',
        mode: 'straight',
        x: 20, y: 50, width: 80,
        fontSize: 9, fill: INK_SOFT, align: 'left',
      }),
      text({
        text: '044525225',
        mode: 'straight',
        x: 20, y: 64, width: 140,
        fontSize: 12, fontStyle: 'bold', align: 'left',
      }),
      text({
        text: 'К/с',
        mode: 'straight',
        x: 20, y: 86, width: 80,
        fontSize: 9, fill: INK_SOFT, align: 'left',
      }),
      text({
        text: '30101810400000000225',
        mode: 'straight',
        x: 20, y: 100, width: 150,
        fontSize: 10, align: 'left',
      }),

      text({
        text: 'Р/с',
        mode: 'straight',
        x: W / 2 + 12, y: 50, width: 80,
        fontSize: 9, fill: INK_SOFT, align: 'left',
      }),
      text({
        text: '40702810438170000001',
        mode: 'straight',
        x: W / 2 + 12, y: 64, width: 160,
        fontSize: 10, align: 'left',
      }),
      text({
        text: 'ИНН',
        mode: 'straight',
        x: W / 2 + 12, y: 86, width: 80,
        fontSize: 9, fill: INK_SOFT, align: 'left',
      }),
      text({
        text: '7707083893',
        mode: 'straight',
        x: W / 2 + 12, y: 100, width: 140,
        fontSize: 10, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   4. ШТАМП «ОПЛАЧЕНО»
   ============================================================ */

function paidStamp(): StampTemplate {
  const W = 240, H = 80;

  const outer = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2.5,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 3, strokeWidth: 1,
  });

  return {
    id: 'bank-paid',
    name: 'ОПЛАЧЕНО',
    description: 'Штамп об оплате с датой',
    icon: '✅',
    width: W,
    height: H,
    shapes: [outer, inner],
    texts: [
      text({
        text: 'ОПЛАЧЕНО',
        mode: 'straight',
        x: 20, y: 14, width: W - 40,
        fontSize: 26, fontStyle: 'bold',
      }),
      text({
        text: '«____» ____________ 20___ г.',
        mode: 'straight',
        x: 20, y: 55, width: W - 40,
        fontSize: 9, fill: INK_SOFT,
      }),
    ],
  };
}

/* ============================================================
   5. ШТАМП «ПРИНЯТО»
   ============================================================ */

function receivedStamp(): StampTemplate {
  const W = 240, H = 90;

  const outer = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2,
  });
  const divider = shape({
    kind: 'line', x: 12, y: 42, width: W - 24, height: 1,
    points: [0, 0, W - 24, 0],
    strokeWidth: 1.5,
    dash: 'dashed',
  });

  return {
    id: 'bank-received',
    name: 'ПРИНЯТО',
    description: 'Штамп о приёме документов',
    icon: '📥',
    width: W,
    height: H,
    shapes: [outer, divider],
    texts: [
      text({
        text: 'ПРИНЯТО',
        mode: 'straight',
        x: 12, y: 8, width: W - 24,
        fontSize: 22, fontStyle: 'bold',
      }),
      text({
        text: 'Дата: «___» ________ 20___ г.',
        mode: 'straight',
        x: 16, y: 48, width: W - 32,
        fontSize: 10, align: 'left',
      }),
      text({
        text: 'Подпись: ______________',
        mode: 'straight',
        x: 16, y: 64, width: W - 32,
        fontSize: 10, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   6. ШТАМП «КОПИЯ ВЕРНА»
   ============================================================ */

function certifiedCopyStamp(): StampTemplate {
  const W = 280, H = 120;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 6, strokeWidth: 2,
  });
  const inner = shape({
    kind: 'rect', x: 8, y: 8, width: W - 16, height: H - 16,
    cornerRadius: 4, strokeWidth: 1, dash: 'dashed',
  });

  return {
    id: 'bank-certified-copy',
    name: 'КОПИЯ ВЕРНА',
    description: 'Штамп заверения копии документа',
    icon: '📋',
    width: W,
    height: H,
    shapes: [frame, inner],
    texts: [
      text({
        text: 'КОПИЯ ВЕРНА',
        mode: 'straight',
        x: 16, y: 14, width: W - 32,
        fontSize: 20, fontStyle: 'bold',
      }),
      text({
        text: 'Генеральный директор',
        mode: 'straight',
        x: 16, y: 46, width: 160,
        fontSize: 9, fill: INK_SOFT, align: 'left',
      }),
      text({
        text: '_______________ / И.И. Иванов',
        mode: 'straight',
        x: 16, y: 60, width: W - 32,
        fontSize: 10, align: 'left',
      }),
      text({
        text: '«____» ____________ 20___ г.',
        mode: 'straight',
        x: 16, y: 90, width: W - 32,
        fontSize: 10, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   7. ПЕЧАТЬ ГЛАВНОГО БУХГАЛТЕРА (малая круглая)
   ============================================================ */

function chiefAccountantSeal(): StampTemplate {
  const CX = 75, CY = 75;
  const R_OUTER = 71;
  const R_INNER = 54;

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

  return {
    id: 'bank-chief-accountant',
    name: 'Главный бухгалтер',
    description: 'Малая круглая печать главного бухгалтера',
    icon: '🧾',
    width: 150,
    height: 150,
    shapes: [outer, inner],
    texts: [
      text({
        text: 'ООО «РОМАШКА»',
        mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 62,
        arcStartDeg: -155, arcEndDeg: -25,
        arcSpanDeg: 130,
        fontSize: 9, fontStyle: 'bold',
      }),
      text({
        text: 'ГЛАВНЫЙ БУХГАЛТЕР',
        mode: 'straight',
        x: CX - 50, y: CY - 14, width: 100,
        fontSize: 8, fontStyle: 'bold',
      }),
      text({
        text: 'И.И. Иванова',
        mode: 'straight',
        x: CX - 50, y: CY + 2, width: 100,
        fontSize: 9, fontStyle: 'italic',
      }),
      text({
        text: 'ИНН 7701234567',
        mode: 'arc',
        arcCx: CX, arcCy: CY, arcRadius: 62,
        arcStartDeg: 155, arcEndDeg: 25, arcFlip: true,
        arcSpanDeg: 130,
        fontSize: 7, fill: INK_SOFT,
      }),
    ],
  };
}

/* ============================================================
   8. ШТАМП КАССИРА
   ============================================================ */

function cashierStamp(): StampTemplate {
  const W = 220, H = 100;

  const frame = shape({
    kind: 'rect', x: 2, y: 2, width: W - 4, height: H - 4,
    cornerRadius: 4, strokeWidth: 2,
  });
  const headerBg = shape({
    kind: 'rect', x: 4, y: 4, width: W - 8, height: 26,
    cornerRadius: 2, strokeWidth: 0,
    fill: '#e5edff',
  });

  return {
    id: 'bank-cashier',
    name: 'Штамп кассира',
    description: 'Операционный штамп кассы',
    icon: '💰',
    width: W,
    height: H,
    shapes: [frame, headerBg],
    texts: [
      text({
        text: 'ОПЕРАЦИОННАЯ КАССА',
        mode: 'straight',
        x: 8, y: 8, width: W - 16,
        fontSize: 11, fontStyle: 'bold',
      }),
      text({
        text: 'Кассир: _______________',
        mode: 'straight',
        x: 12, y: 40, width: W - 24,
        fontSize: 10, align: 'left',
      }),
      text({
        text: 'Операция №: ____________',
        mode: 'straight',
        x: 12, y: 58, width: W - 24,
        fontSize: 10, align: 'left',
      }),
      text({
        text: 'Дата: «___» ________ 20___',
        mode: 'straight',
        x: 12, y: 76, width: W - 24,
        fontSize: 10, align: 'left',
      }),
    ],
  };
}

/* ============================================================
   Экспорт
   ============================================================ */

export const BANKING_STAMPS: StampTemplate[] = [
  orgSeal(),
  paymentDocsStamp(),
  bankCornerStamp(),
  paidStamp(),
  receivedStamp(),
  certifiedCopyStamp(),
  chiefAccountantSeal(),
  cashierStamp(),
];