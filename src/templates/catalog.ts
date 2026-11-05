import type { Slide, CanvasElement } from '@/shared/types';
import { makeText, makeShape, makeTable, uid } from './helpers';
import { t } from '@/shared/i18n';
import { measureText } from '@/lib/richText/measure';
import { professionalPreset,addPresetDetails } from './professional';

export interface DocumentPreset {
  id: string;
  name: string;
  category: 'business' | 'marketing' | 'events' | 'personal';
  size: string;
  build(): Slide[];
}
const mm = (value: number) => Math.round((value * 96) / 25.4);
function page(name: string, width: number, height: number): Slide {
  return {
    id: uid(),
    name: t(name),
    width,
    height,
    format: 'custom',
    orientation: width > height ? 'landscape' : 'portrait',
    background: '#ffffff',
    padding: { top: 24, right: 24, bottom: 24, left: 24 },
    elements: [],
  };
}
function box(slide: Slide, x: number, y: number, width: number, height: number, fill: string) {
  const left = Math.max(x, slide.padding.left), top = Math.max(y, slide.padding.top);
  const right = Math.min(x + width, slide.width - slide.padding.right);
  const bottom = Math.min(y + height, slide.height - slide.padding.bottom);
  slide.elements.push(
    makeShape({ x: left, y: top, width: right - left, height: bottom - top, fill, stroke: 'transparent', strokeWidth: 0 }),
  );
}
function text(
  slide: Slide,
  value: string,
  x: number,
  y: number,
  width: number,
  size = 20,
  color = '#20283e',
  bold = false,
) {
  const content = t(value);
  const fontStyle = bold ? 'bold' : 'normal';
  const linesAt = (fontSize: number) => content.split('\n').reduce((count, paragraph) => {
    let line = '', lines = 1;
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measureText(next, fontSize, 'Arial', fontStyle) > width) { lines++; line = word; }
      else line = next;
    }
    return count + lines;
  }, 0);
  const maxLines = Math.max(2, content.split('\n').length);
  while (size > 12 && (linesAt(size) > maxLines || content.split(/\s+/).some((word) => measureText(word, size, 'Arial', fontStyle) > width))) size--;
  const height = Math.ceil(linesAt(size) * size * 1.3 + 2);
  slide.elements.push(
    makeText({
      x,
      y,
      width,
      height,
      text: content,
      richText: false,
      lineHeight: 1.3,
      fontSize: size,
      fill: color,
      fontStyle,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
  );
}
function heading(slide: Slide, title: string, accent = '#6554c0') {
  box(slide, 24, 24, 8, slide.height - 48, accent);
  text(slide, 'YOUR COMPANY', 48, 36, slide.width - 96, 16, accent, true);
  text(slide, title, 48, 100, slide.width - 96, 38, '#20283e', true);
}
function table(slide: Slide, labels: string[], rows: string[][], y: number) {
  slide.elements.push(
    makeTable({
      x: 48,
      y,
      width: slide.width - 96,
      height: (rows.length + 1) * 44,
      rows: rows.length + 1,
      cols: labels.length,
      data: [labels.map(t), ...rows.map((row) => row.map(t))],
      fontSize: 15,
      headerBg: '#eceaf7',
      borderColor: '#d9deea',
    }),
  );
}

const definitions: [string, string, DocumentPreset['category'], string][] = [
  ['business-card', 'Business card', 'business', '90 × 50 mm · 2'],
  ['brochure', 'Tri-fold brochure', 'marketing', 'A4 · 2'],
  ['presentation', 'Presentation', 'business', '16:9 · 3'],
  ['letterhead', 'Business letter', 'business', 'A4'],
  ['invoice', 'Invoice', 'business', 'A4'],
  ['proposal', 'Business proposal', 'business', 'A4'],
  ['report', 'Project report', 'business', 'A4 · 2'],
  ['resume', 'Resume', 'personal', 'A4'],
  ['certificate', 'Certificate', 'events', 'A4 landscape'],
  ['ticket', 'Event ticket', 'events', '180 × 70 mm'],
  ['badge', 'Name badge', 'events', '90 × 120 mm'],
  ['flyer', 'Promotional flyer', 'marketing', 'A5'],
  ['poster', 'Event poster', 'events', 'A3'],
  ['invitation', 'Invitation', 'events', 'A6'],
  ['menu', 'Menu', 'business', 'A4'],
  ['price-list', 'Price list', 'business', 'A4'],
  ['schedule', 'Weekly planner', 'personal', 'A4 landscape'],
  ['calendar', 'Monthly calendar', 'personal', 'A4 landscape'],
  ['coupon', 'Gift voucher', 'marketing', '180 × 80 mm'],
  ['label', 'Shipping label', 'business', '100 × 150 mm'],
  ['service-act','Service acceptance act','business','A4'],
  ['delivery-note','Delivery note','business','A4'],
  ['company-details','Company details','business','A4'],
  ['project-brief','Project brief','business','A4'],
  ['meeting-notes','Meeting notes','business','A4'],
];

function build(id: string, name: string): Slide[] {
  const professional=professionalPreset(id,name);if(professional)return professional;
  if (id === 'business-card') {
    const front = page(name, mm(90), mm(50)),
      back = page('Back side', mm(90), mm(50));
    box(front, 0, 0, front.width, front.height, '#20283e');
    box(front, 28, 28, 4, 128, '#bbf0d4');
    text(front, 'YOUR NAME', 44, 34, front.width - 72, 24, '#ffffff', true);
    text(front, 'Your profession', 44, 76, front.width - 72, 13, '#bbf0d4');
    text(front, 'hello@example.com\n+00 123 456 789', 44, 120, front.width - 72, 12, '#ffffff');
    text(back, 'YOUR COMPANY', 28, 52, 280, 25, '#20283e', true);
    text(back, 'Your next great idea starts here.', 28, 100, 280, 12);
    return [front, back];
  }
  if (id === 'presentation') {
    return ['YOUR NEXT BIG IDEA', 'The challenge and the solution', 'Next steps'].map(
      (title, index) => {
        const slide = page(`${name} ${index + 1}`, 1280, 720);
        box(slide, 0, 0, 1280, 720, index === 0 ? '#20283e' : '#f5f4fa');
        box(slide, 850, 0, 430, 720, '#bbf0d4');
        text(slide, 'YOUR COMPANY', 70, 60, 690, 23, index === 0 ? '#bbf0d4' : '#6554c0', true);
        text(slide, title, 70, 200, 710, 60, index === 0 ? '#ffffff' : '#20283e', true);
        text(
          slide,
          'Add your key message and supporting details.',
          70,
          430,
          690,
          28,
          index === 0 ? '#ffffff' : '#20283e',
        );
        text(slide, String(index + 1).padStart(2, '0'), 970, 280, 250, 120, '#20283e', true);
        return slide;
      },
    );
  }
  if (id === 'brochure') {
    return ['Front', 'Back side'].map((side, index) => {
      const slide = page(`${name} · ${t(side)}`, 1123, 794);
      for (let col = 0; col < 3; col++) {
        const x = col * (1123 / 3);
        box(
          slide,
          x,
          0,
          1123 / 3,
          794,
          col === 2 && !index ? '#20283e' : col % 2 ? '#eeedf8' : '#ffffff',
        );
        const color = col === 2 && !index ? '#ffffff' : '#20283e';
        text(
          slide,
          col === 2 && !index
            ? 'Discover what is possible'
            : ['About us', 'Our services', 'Contact us'][col],
          x + 30,
          85,
          310,
          33,
          color,
          true,
        );
        text(slide, 'Add your key message and supporting details.', x + 30, 260, 310, 20, color);
        text(slide, 'hello@example.com', x + 30, 660, 310, 15, color);
      }
      return slide;
    });
  }
  if (id === 'certificate') {
    const slide = page(name, 1123, 794);
    box(slide, 28, 28, 1067, 738, '#eeedf8');
    box(slide, 44, 44, 1035, 706, '#ffffff');
    text(slide, 'CERTIFICATE', 100, 110, 923, 64, '#6554c0', true);
    text(slide, 'This certificate is awarded to', 100, 270, 923, 25);
    text(slide, 'PARTICIPANT NAME', 100, 340, 923, 44, '#20283e', true);
    text(slide, 'For successful participation and achievement.', 100, 440, 923, 22);
    text(slide, 'Date __________    Signature __________', 100, 620, 923, 18);
    return [slide];
  }
  if (['ticket', 'coupon', 'badge', 'invitation', 'label'].includes(id)) {
    const dims: Record<string, [number, number]> = {
      ticket: [mm(180), mm(70)],
      coupon: [mm(180), mm(80)],
      badge: [mm(90), mm(120)],
      invitation: [mm(105), mm(148)],
      label: [mm(100), mm(150)],
    };
    const [w, h] = dims[id],
      slide = page(name, w, h);
    box(slide, 0, 0, w, Math.min(90, h / 3), '#20283e');
    text(slide, name, 30, 32, w - 60, Math.min(24, w / 17), '#ffffff', true);
    text(
      slide,
      id === 'label'
        ? 'RECIPIENT NAME'
        : id === 'badge'
          ? 'YOUR NAME'
          : 'A moment worth celebrating',
      30,
      120,
      w - 60,
      Math.min(29, w / 14),
      '#20283e',
      true,
    );
    text(
      slide,
      id === 'label'
        ? 'Street, building, apartment\nCity, postal code\nCountry'
        : 'Date · Time · Location',
      30,
      Math.min(210, h - 78),
      w - 60,
      16,
    );
    return [slide];
  }
  if (['schedule', 'calendar'].includes(id)) {
    const slide = page(name, 1123, 794);
    heading(slide, name);
    const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    table(
      slide,
      labels,
      Array.from({ length: id === 'calendar' ? 5 : 8 }, (_, row) =>
        labels.map((_, col) =>
          id === 'calendar' ? String(row * 7 + col + 1 <= 31 ? row * 7 + col + 1 : '') : '',
        ),
      ),
      220,
    );
    return [slide];
  }
  const size = id === 'poster' ? [1123, 1587] : id === 'flyer' ? [559, 794] : [794, 1123];
  const slide = page(name, size[0], size[1]);
  heading(slide, name);
  if (['invoice', 'price-list', 'menu'].includes(id)) {
    text(
      slide,
      id === 'invoice' ? 'Invoice number · Date · Customer' : 'Thoughtfully selected for you',
      48,
      185,
      slide.width - 96,
      18,
    );
    table(
      slide,
      ['Description', 'Quantity', 'Price', 'Total'],
      [
        ['Your product or service', '1', '100.00', '100.00'],
        ['Your product or service', '2', '50.00', '100.00'],
        ['', '', '', ''],
      ],
      260,
    );
    text(slide, 'Total: 200.00', 48, 540, slide.width - 96, 25, '#6554c0', true);
    text(slide, 'hello@example.com · example.com', 48, 1010, slide.width - 96, 14);
  } else if (id === 'resume') {
    text(slide, 'YOUR NAME', 48, 190, 680, 35, '#6554c0', true);
    ['Profile', 'Experience', 'Education', 'Skills'].forEach((label, index) => {
      text(slide, label, 48, 290 + index * 165, 680, 23, '#20283e', true);
      text(slide, 'Add your key message and supporting details.', 48, 335 + index * 165, 680, 17);
    });
  } else if (['flyer', 'poster'].includes(id)) {
    box(slide, 36, 210, slide.width - 72, slide.height * 0.32, '#bbf0d4');
    text(
      slide,
      'MAKE IT HAPPEN',
      58,
      250,
      slide.width - 116,
      id === 'poster' ? 72 : 39,
      '#20283e',
      true,
    );
    text(slide, 'Date · Time · Location', 48, slide.height * 0.67, slide.width - 96, 24);
    text(slide, 'Join us', 48, slide.height * 0.83, slide.width - 96, 32, '#6554c0', true);
  } else {
    ['Overview', 'Details', 'Next steps'].forEach((label, index) => {
      text(slide, label, 48, 240 + index * 220, slide.width - 96, 25, '#6554c0', true);
      text(
        slide,
        'Add your key message and supporting details.',
        48,
        295 + index * 220,
        slide.width - 96,
        20,
      );
    });
  }
  if (id === 'report') {
    const details = page('Report details', 794, 1123);
    heading(details, 'Results and next steps');
    table(
      details,
      ['Metric', 'Target', 'Result'],
      [
        ['Your metric', '100', '120'],
        ['Your metric', '50', '60'],
      ],
      250,
    );
    return [slide, details];
  }
  return [slide];
}
export const DOCUMENT_PRESETS: readonly DocumentPreset[] = definitions.map(
  ([id, name, category, size]) => ({ id, name, category, size, build: () => addPresetDetails(build(id, name),id) }),
);
export function presetText(elements: readonly CanvasElement[]) {
  return elements
    .filter((element) => element.type === 'text')
    .map((element) => (element.type === 'text' ? element.text : ''))
    .join(' ');
}
