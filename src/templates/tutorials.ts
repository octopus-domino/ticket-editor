import type { Slide, CanvasElement } from '@/shared/types';
import {
  newSimpleText,
  newText,
  newShape,
  newTable,
  newQr,
  newChart,
  newPath,
  newFooter,
  newDiagram,
} from '@/lib/factories';
import { newStampFromTemplate } from '@/lib/stamps/factories';
import { essentialStamps } from '@/lib/stamps/essential';
import type { StampTemplate } from '@/lib/stamps/types';
import { t } from '@/shared/i18n';
import { measureText } from '@/lib/richText/measure';

const navy = '#183c39';
const orange = '#e76837';
export const TUTORIAL_PAGE = { width: 1123, height: 794, margin: 28 } as const;
export function tutorialFocusBounds(
  focus: [number, number, number, number],
): [number, number, number, number] {
  // Include the focus outline itself inside the printable area.
  const inset = TUTORIAL_PAGE.margin + 3;
  const x = Math.max(inset, Math.min(TUTORIAL_PAGE.width - inset, focus[0]));
  const y = Math.max(inset, Math.min(TUTORIAL_PAGE.height - inset, focus[1]));
  return [
    x,
    y,
    Math.max(0, Math.min(TUTORIAL_PAGE.width - inset, focus[0] + focus[2]) - x),
    Math.max(0, Math.min(TUTORIAL_PAGE.height - inset, focus[1] + focus[3]) - y),
  ];
}
export const TUTORIAL_LOGO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><path d="M80 135V65M80 95C24 96 20 44 28 27c38 2 59 27 52 68ZM80 115c56-1 60-53 52-70-38 2-59 27-52 70Z" fill="none" stroke="#244f91" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>')}`;
export function buildTutorialStamp(stage = 12): StampTemplate {
  const stamp = essentialStamps()[0];
  stamp.id = 'tutorial-botanical';
  stamp.name = t('Botanical studio');
  stamp.shapes = stamp.shapes.slice(0, stage >= 2 ? 2 : stage >= 1 ? 1 : 0);
  stamp.texts =
    stage >= 3
      ? [
          {
            ...stamp.texts[0],
            text: t('BOTANICAL STUDIO'),
            arcStartDeg: -160,
            arcEndDeg: -20,
            fontSize: 14,
          },
        ]
      : [];
  if (stage >= 5)
    stamp.texts.push({
      ...essentialStamps()[0].texts[0],
      text: t('HANDMADE WITH CARE'),
      arcStartDeg: 155,
      arcEndDeg: 25,
      arcDirection: 'ccw',
      arcFlip: true,
      fontSize: 12,
    });
  stamp.images =
    stage >= 6
      ? [
          {
            id: crypto.randomUUID(),
            src: TUTORIAL_LOGO,
            x: 74,
            y: 68,
            width: 92,
            height: 102,
            fit: 'contain',
            name: t('Center image'),
          },
        ]
      : [];
  return stamp;
}

/** A two-sided handout; every item remains a native editable editor object. */
export function buildTutorialBrochure(stage = 24): Slide[] {
  const makePage = (name: string): Slide => ({
    id: crypto.randomUUID(),
    name,
    width: TUTORIAL_PAGE.width,
    height: TUTORIAL_PAGE.height,
    format: 'a4',
    orientation: 'landscape',
    background: '#fffdf8',
    padding: {
      top: TUTORIAL_PAGE.margin,
      right: TUTORIAL_PAGE.margin,
      bottom: TUTORIAL_PAGE.margin,
      left: TUTORIAL_PAGE.margin,
    },
    elements: [],
  });
  const front = makePage(t('Front'));
  const back = makePage(t('Back side'));
  const add = (slide: Slide, el: CanvasElement) => slide.elements.push(el);
  const text = (
    slide: Slide,
    value: string,
    x: number,
    y: number,
    width: number,
    fontSize: number,
    fill = navy,
    bold = false,
  ) => {
    const content = t(value);
    // Keep a long translated word intact rather than splitting it at the panel edge.
    while (
      fontSize > 12 &&
      content
        .split(/\s+/)
        .some((word) => measureText(word, fontSize, 'Arial', bold ? 'bold' : 'normal') > width)
    )
      fontSize--;
    let lines = 0;
    for (const paragraph of content.split('\n')) {
      let line = '';
      lines++;
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && measureText(next, fontSize, 'Arial', bold ? 'bold' : 'normal') > width) {
          lines++;
          line = word;
        } else line = next;
      }
    }
    add(slide, {
      ...newSimpleText(x, y),
      text: content,
      width,
      height: Math.ceil(fontSize * 1.3 * lines + 2),
      lineHeight: 1.3,
      fontSize,
      fill,
      fontStyle: bold ? 'bold' : 'normal',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  };
  const box = (slide: Slide, x: number, y: number, width: number, height: number, fill: string) =>
    add(slide, { ...newShape('rect', x, y), width, height, fill, stroke: 'none', strokeWidth: 0 });
  if (stage >= 1) {
    box(front, 748, 28, 347, 738, navy);
    box(front, 374, 28, 374, 738, '#f2eadc');
  }
  if (stage >= 2) {
    text(front, 'BOTANICAL\nWORKSHOP', 785, 210, 310, 42, '#fffdf8', true);
    text(front, 'A little time to grow.', 785, 370, 290, 22, '#f6c59a');
    text(front, 'YOUR COMPANY', 785, 60, 280, 16, '#f6c59a');
  }
  if (stage >= 3) {
    text(front, 'Welcome', 408, 60, 300, 32, navy, true);
    const rich = {
      ...newText(408, 175),
      width: 292,
      height: 255,
      fontSize: 20,
      fill: navy,
      text: t('Create something with your hands. Take a little inspiration home.'),
      html: `<p><strong>${t('Create something with your hands.')}</strong></p><p>${t('Take a little inspiration home.')}</p>`,
    };
    add(front, rich);
    text(front, 'Bring your curiosity. We provide the rest.', 408, 465, 290, 20);
  }
  if (stage >= 4)
    add(front, {
      id: crypto.randomUUID(),
      type: 'image',
      x: 80,
      y: 80,
      width: 200,
      height: 200,
      rotation: 0,
      src: TUTORIAL_LOGO,
    });
  if (stage >= 5) {
    for (let i = 0; i < 3; i++)
      add(front, {
        ...newShape((['circle', 'triangle', 'star'] as const)[i], 45 + i * 104, 360),
        width: 64,
        height: 64,
        fill: i === 1 ? '#f6c59a' : orange,
        stroke: 'none',
        strokeWidth: 0,
      });
  }
  if (stage >= 6) {
    text(front, 'Small group. Big ideas.', 40, 475, 300, 28, navy, true);
    text(front, 'hello@example.com\nexample.com/workshop', 40, 590, 300, 17);
  }
  if (stage >= 7)
    add(front, {
      ...newPath(785, 465),
      width: 280,
      height: 130,
      d: 'M 0 120 Q 70 0 140 70 T 280 10',
      fill: 'none',
      stroke: '#f6c59a',
      strokeWidth: 5,
    });
  if (stage >= 8)
    add(front, {
      ...newStampFromTemplate(buildTutorialStamp(), 830, 590),
      width: 135,
      height: 135,
    });
  if (stage >= 9) add(front, { ...newFooter(front, 28), text: t('YOUR COMPANY'), fontSize: 12 });
  if (stage >= 10) {
    text(back, 'Your workshop guide', 36, 38, 1000, 38, navy, true);
    for (let col = 0; col < 3; col++)
      box(back, 36 + col * 374, 110, 310, 4, col === 1 ? orange : navy);
  }
  if (stage >= 11) {
    const table = {
      ...newTable(36, 180),
      width: 320,
      height: 235,
      rows: 4,
      cols: 2,
      fontSize: 16,
      headerBg: '#f2eadc',
      data: [
        [t('Time'), t('Activity')],
        ['10:00', t('Welcome')],
        ['10:30', t('Practice')],
        ['12:00', t('Next steps')],
      ],
    };
    text(back, 'Schedule', 36, 128, 320, 24, navy, true);
    add(back, table);
  }
  if (stage >= 12) {
    text(back, 'Your creative time', 410, 128, 320, 24, navy, true);
    add(back, {
      ...newChart('donut', 432, 185),
      width: 260,
      height: 235,
      values: [25, 50, 25],
      palette: [navy, orange, '#f6c59a'],
      donutInnerRatio: 0.65,
    });
  }
  if (stage >= 13) {
    text(back, 'Find the next workshop', 785, 128, 300, 24, navy, true);
    add(back, { ...newQr(825, 200, 170), text: 'https://codoc.site/learn' });
    text(back, 'Scan to explore', 800, 400, 280, 16);
  }
  if (stage >= 14) {
    const diagramSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="330" height="100"><rect x="2" y="25" width="88" height="50" rx="10" fill="#183c39"/><path d="M95 50h45m-10-8 10 8-10 8M190 50h45m-10-8 10 8-10 8" fill="none" stroke="#e76837" stroke-width="3"/><circle cx="165" cy="50" r="24" fill="#f6c59a"/><rect x="240" y="25" width="88" height="50" rx="10" fill="#183c39"/></svg>';
    add(back, { ...newDiagram(410, 475), width: 320, height: 110, svg: diagramSvg });
    text(back, 'Your next steps', 410, 440, 320, 23, navy, true);
  }
  if (stage >= 15) {
    text(back, 'Made for you', 36, 485, 320, 24, navy, true);
    text(back, '{{name}}', 36, 540, 320, 30);
    text(back, '{{date}}', 36, 590, 320, 20);
  }
  if (stage >= 16) {
    text(back, 'Keep creating', 785, 500, 300, 24, navy, true);
    text(back, 'Use your new skills. Share what you make.', 785, 550, 300, 20);
  }
  if (stage >= 17) add(back, { ...newFooter(back, 28), text: t('YOUR COMPANY'), fontSize: 12 });
  return [front, back];
}
