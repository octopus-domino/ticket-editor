import type { Slide } from '@/shared/types';
import {
  newSimpleText,
  newShape,
  newPath,
  newTable,
  newChart,
  newQr,
  newLine,
} from '@/lib/factories';
import { measureText } from '@/lib/richText/measure';
import { t } from '@/shared/i18n';
export const PROFESSIONAL_COPY = [
  'Business documents',
  'Supplier',
  'Customer',
  'Brand strategy',
  'Website design',
  'Content production',
  'Project delivery',
  'Acceptance',
  'Terms',
  'Payment details',
  'Delivery details',
  'Scope',
  'Prepared by',
  'Signature',
  'From',
  'To',
  'Address',
  'Phone',
  'Bank',
  'Subject',
  'Agenda',
  'Decisions',
  'Deliverables',
  'Timeline',
  'Recommendation',
  'Milestones',
  'Profile',
  'Experience',
  'Skills',
  'Education',
  'Service acceptance act',
  'Delivery note',
  'Company details',
  'Project brief',
  'Meeting notes',
];
const ink = '#163138';
const muted = '#5a7077';
const green = '#177d6e';
const soft = '#eaf4f0';
const paper = '#ffffff';
const gold = '#c4914b';
const page = (name: string, w = 794, h = 1123): Slide => ({
  id: crypto.randomUUID(),
  name: t(name),
  width: w,
  height: h,
  format: 'custom',
  orientation: w > h ? 'landscape' : 'portrait',
  background: paper,
  padding: { top: 32, right: 32, bottom: 32, left: 32 },
  elements: [],
});
function box(s: Slide, x: number, y: number, w: number, h: number, fill: string, radius = 0) {
  s.elements.push({
    ...newShape(radius ? 'roundRect' : 'rect', x, y),
    width: w,
    height: h,
    fill,
    strokeWidth: 0,
    stroke: 'none',
    radius,
  });
}
function txt(
  s: Slide,
  value: string,
  x: number,
  y: number,
  w: number,
  size = 16,
  fill = ink,
  bold = false,
  maxHeight = 140,
) {
  const content = t(value);
  const style = bold ? 'bold' : 'normal';
  let lines = 1;
  function count() {
    let count = 0;
    for (const paragraph of content.split('\n')) {
      count++;
      let current = '';
      for (const word of paragraph.split(/\s+/)) {
        const next = current ? current + ' ' + word : word;
        if (current && measureText(next, size, 'Arial', style) > w) {
          count++;
          current = word;
        } else current = next;
      }
    }
    return count;
  }
  while (
    size > 10 &&
    (count() * size * 1.25 + 2 > maxHeight ||
      content.split(/\s+/).some((word) => measureText(word, size, 'Arial', style) > w))
  )
    size--;
  lines = count();
  const height = Math.ceil(lines * size * 1.25 + 2);
  s.elements.push({
    ...newSimpleText(x, y),
    text: content,
    width: w,
    height,
    fontSize: size,
    fontStyle: style,
    fill,
    lineHeight: 1.25,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  return height;
}
function line(s: Slide, x: number, y: number, w: number, color = '#d7e3df') {
  s.elements.push({
    ...newLine(x, y),
    width: w,
    height: 1,
    points: [0, 0, w, 0],
    stroke: color,
    strokeWidth: 1,
  });
}
const icons = {
  document:
    'M4 2 L15 2 L22 9 L22 26 L4 26 Z M15 2 L15 9 L22 9 M8 14 L18 14 M8 18 L18 18 M8 22 L14 22',
  check: 'M3 15 L10 22 L25 5',
  arrow: 'M3 14 L25 14 M16 5 L25 14 L16 23',
  pin: 'M14 27 C9 20 4 15 4 10 C4 -2 24 -2 24 10 C24 15 19 20 14 27 Z M14 6 C8 6 8 14 14 14 C20 14 20 6 14 6 Z',
  clock: 'M14 1 C-3 1 -3 27 14 27 C31 27 31 1 14 1 Z M14 6 L14 15 L21 19',
  leaf: 'M3 25 C1 7 8 1 27 2 C27 20 21 28 3 25 Z M3 25 L21 8',
  star: 'M14 1 L18 10 L28 11 L20 18 L23 28 L14 23 L5 28 L8 18 L0 11 L10 10 Z',
};
function icon(s: Slide, key: keyof typeof icons, x: number, y: number, color = green) {
  s.elements.push({
    ...newPath(x, y),
    width: 28,
    height: 28,
    d: icons[key],
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
  });
}
function footer(s: Slide, n = 1) {
  line(s, 48, s.height - 72, s.width - 96);
  txt(s, 'hello@example.com', 48, s.height - 55, 300, 11, muted);
  txt(s, String(n).padStart(2, '0'), s.width - 100, s.height - 55, 52, 11, muted);
}
function header(s: Slide, title: string) {
  icon(s, 'document', 48, 42);
  txt(s, 'YOUR COMPANY', 92, 43, s.width - 160, 19, ink, true, 35);
  txt(s, 'Business documents', 92, 75, s.width - 160, 11, muted, false, 25);
  line(s, 48, 111, s.width - 96);
  txt(s, title, 48, 143, s.width - 96, 36, ink, true, 85);
}
function section(s: Slide, title: string, x: number, y: number, w: number) {
  txt(s, title, x, y, w, 12, green, true, 44);
  line(s, x, y + 40, w);
}
function grid(s: Slide, headers: string[], data: string[][], y: number, rowHeight = 40) {
  s.elements.push({
    ...newTable(48, y),
    width: s.width - 96,
    height: (data.length + 1) * rowHeight,
    rows: data.length + 1,
    cols: headers.length,
    data: [headers.map(t), ...data.map((row) => row.map(t))],
    fontSize: 13,
    headerBg: soft,
    borderColor: '#d7e3df',
  });
}
function contact(s: Slide, label: string, x: number, y: number, w: number) {
  txt(s, label, x, y, w, 11, muted, true, 35);
  txt(s, 'YOUR COMPANY', x, y + 30, w, 19, ink, true, 45);
  txt(s, 'Contact us', x, y + 85, w, 13, muted, false, 35);
  txt(s, 'hello@example.com', x, y + 113, w, 13, muted, false, 35);
}
function office(id: string, name: string): Slide[] {
  const s = page(name);
  header(s, name);
  if (['invoice', 'service-act', 'delivery-note', 'price-list'].includes(id)) {
    txt(s, '№ 2026-001 · 05.11.2026', 48, 222, 698, 13, muted);
    contact(s, id === 'price-list' ? 'Our services' : 'Supplier', 48, 272, 318);
    contact(s, id === 'price-list' ? 'Contact us' : 'Customer', 428, 272, 318);
    grid(
      s,
      ['Description', 'Quantity', 'Price', 'Total'],
      [
        ['Brand strategy', '1', '25 000', '25 000'],
        ['Website design', '1', '65 000', '65 000'],
        ['Content production', '2', '15 000', '30 000'],
        ['Project delivery', '1', '5 000', '5 000'],
      ],
      445,
      48,
    );
    box(s, 428, 740, 318, 104, soft, 8);
    txt(s, 'Total', 448, 757, 278, 14, green, true);
    txt(s, '125 000', 448, 789, 278, 32, ink, true, 50);
    section(s, id === 'service-act' ? 'Acceptance' : 'Terms', 48, 875, 318);
    txt(
      s,
      id === 'invoice' ? 'Payment details' : id === 'delivery-note' ? 'Delivery details' : 'Scope',
      48,
      934,
      318,
      16,
      ink,
      true,
      45,
    );
    txt(s, 'Prepared by', 428, 923, 318, 12, muted);
    line(s, 428, 990, 318);
    txt(s, 'Signature', 428, 1001, 318, 11, muted);
    footer(s);
    return [s];
  }
  if (id === 'letterhead' || id === 'company-details') {
    contact(s, 'From', 48, 245, 310);
    contact(s, 'To', 428, 245, 318);
    if (id === 'company-details') {
      grid(
        s,
        ['Field', 'Details'],
        [
          ['YOUR COMPANY', 'YOUR COMPANY'],
          ['Address', 'Street, building, apartment'],
          ['Contact us', 'hello@example.com'],
          ['Phone', '+00 123 456 789'],
          ['Payment details', '________________________'],
          ['Bank', '________________________'],
        ],
        470,
        55,
      );
    } else {
      section(s, 'Subject', 48, 440, 698);
      txt(s, 'Your next great idea starts here.', 48, 510, 698, 23, ink, true, 60);
      for (let i = 0; i < 9; i++) line(s, 48, 615 + i * 26, 698 - (i % 3) * 75, '#e1e8e5');
      txt(s, 'Next steps', 48, 885, 698, 19, green, true, 45);
      txt(s, 'YOUR NAME', 48, 955, 420, 19, ink, true, 45);
      txt(s, 'Your profession', 48, 987, 420, 13, muted);
    }
    footer(s);
    return [s];
  }
  if (id === 'proposal' || id === 'project-brief' || id === 'meeting-notes') {
    box(s, 48, 242, 698, 128, ink, 10);
    icon(s, 'arrow', 69, 267, '#bfdfcf');
    txt(s, 'Your next great idea starts here.', 118, 263, 592, 27, '#ffffff', true, 82);
    const blocks =
      id === 'meeting-notes'
        ? ['Agenda', 'Decisions', 'Next steps']
        : ['Scope', 'Deliverables', 'Timeline'];
    blocks.forEach((title, i) => {
      const y = 418 + i * 155;
      icon(s, i === 2 ? 'clock' : 'check', 48, y);
      section(s, title, 92, y, 654);
      txt(
        s,
        ['Brand strategy', 'Website design', 'Project delivery'][i],
        92,
        y + 66,
        654,
        20,
        ink,
        true,
        55,
      );
    });
    box(s, 48, 930, 698, 88, soft, 8);
    txt(s, 'Prepared by', 68, 947, 300, 12, green, true);
    txt(s, 'YOUR NAME', 68, 976, 300, 19, ink, true, 32);
    txt(s, 'Date __________', 450, 966, 270, 14, muted);
    footer(s);
    return [s];
  }
  if (id === 'report') {
    const labels = ['Target', 'Result', 'Next steps'];
    labels.forEach((label, i) => {
      const x = 48 + i * 238;
      box(s, x, 245, 222, 125, i === 1 ? ink : soft, 8);
      txt(s, label, x + 16, 260, 190, 12, i === 1 ? '#bfdfcf' : green, true, 35);
      txt(s, ['100', '120', '03'][i], x + 16, 305, 190, 35, i === 1 ? '#ffffff' : ink, true, 55);
    });
    section(s, 'Overview', 48, 425, 698);
    txt(s, 'The challenge and the solution', 48, 490, 698, 25, ink, true, 65);
    const chart = newChart('bar', 65, 600);
    s.elements.push({
      ...chart,
      width: 640,
      height: 250,
      values: [28, 45, 62, 83, 96, 120],
      palette: [green, '#5a9f90', '#a6c9ba'],
      dataPath: null,
    });
    section(s, 'Recommendation', 48, 899, 698);
    txt(s, 'Next steps', 48, 964, 698, 22, ink, true, 70);
    footer(s);
    const second = page('Report details');
    header(second, 'Results and next steps');
    grid(
      second,
      ['Metric', 'Target', 'Result'],
      [
        ['Your metric', '100', '120'],
        ['Your metric', '50', '60'],
        ['Your metric', '80', '96'],
      ],
      270,
      55,
    );
    section(second, 'Milestones', 48, 565, 698);
    ['Overview', 'Details', 'Next steps'].forEach((label, i) => {
      icon(second, 'check', 48, 640 + i * 100);
      txt(second, label, 94, 645 + i * 100, 650, 21, ink, true, 60);
    });
    footer(second, 2);
    return [s, second];
  }
  return [];
}
function resume(name: string) {
  const s = page(name);
  box(s, 32, 32, 220, 1059, ink);
  box(s, 64, 71, 80, 5, '#bfdfcf');
  txt(s, 'YOUR NAME', 64, 119, 155, 33, '#ffffff', true, 140);
  txt(s, 'Your profession', 64, 300, 155, 17, '#bfdfcf', false, 60);
  txt(s, 'Contact us', 64, 405, 155, 14, '#bfdfcf', true);
  txt(s, 'hello@example.com', 64, 453, 155, 11, '#ffffff', false, 40);
  txt(s, '+00 123 456 789', 64, 505, 155, 12, '#ffffff');
  txt(s, 'Skills', 64, 620, 155, 16, '#bfdfcf', true);
  ['Brand strategy', 'Website design', 'Project delivery'].forEach((value, i) => {
    txt(s, value, 64, 672 + i * 86, 155, 13, '#ffffff', false, 45);
    box(s, 64, 730 + i * 86, 145, 4, '#36565b');
    box(s, 64, 730 + i * 86, 115 - i * 15, 4, '#bfdfcf');
  });
  section(s, 'Profile', 290, 72, 454);
  txt(s, 'Your next great idea starts here.', 290, 141, 454, 25, ink, true, 90);
  section(s, 'Experience', 290, 306, 454);
  ['YOUR COMPANY', 'YOUR COMPANY'].forEach((value, i) => {
    txt(s, value, 290, 383 + i * 220, 454, 21, ink, true);
    txt(s, i ? '2021 — 2024' : '2024 — 2026', 290, 424 + i * 220, 454, 13, green);
    txt(
      s,
      ['Brand strategy', 'Website design', 'Project delivery'].map(t).join(' · '),
      290,
      469 + i * 220,
      454,
      16,
      muted,
      false,
      80,
    );
  });
  section(s, 'Education', 290, 866, 454);
  txt(s, 'YOUR COMPANY', 290, 937, 454, 20, ink, true);
  txt(s, '2021 — 2024', 290, 978, 454, 13, muted);
  return [s];
}
function menu(name: string) {
  const s = page(name);
  header(s, name);
  txt(s, 'Thoughtfully selected for you', 48, 226, 698, 18, muted);
  const labels = ['Our services', 'Discover what is possible'];
  for (let col = 0; col < 2; col++) {
    const x = 48 + col * 366;
    section(s, labels[col], x, 300, 330);
    for (let row = 0; row < 5; row++) {
      const y = 385 + row * 115;
      icon(s, 'leaf', x, y);
      txt(s, 'Your product or service', x + 42, y, 235, 16, ink, true, 45);
      txt(s, ['100', '250', '180', '320', '200'][row], x + 248, y + 53, 80, 19, green, true);
      line(s, x, y + 91, 330);
    }
  }
  footer(s);
  return [s];
}
function presentation(name: string) {
  return [
    'YOUR NEXT BIG IDEA',
    'The challenge and the solution',
    'Our services',
    'Results and next steps',
    'Contact us',
  ].map((title, index) => {
    const s = page(name + ' ' + (index + 1), 1280, 720);
    const dark = index === 0 || index === 4;
    box(s, 32, 32, 1216, 656, dark ? ink : '#f2f6f3', 16);
    txt(s, 'YOUR COMPANY', 76, 68, 1000, 17, dark ? '#bfdfcf' : green, true, 35);
    txt(s, String(index + 1).padStart(2, '0'), 1150, 68, 60, 18, dark ? '#bfdfcf' : muted, true);
    txt(s, title, 76, 153, 1080, 56, dark ? '#ffffff' : ink, true, 140);
    if (index === 0) {
      box(s, 76, 339, 12, 206, '#bfdfcf');
      txt(s, 'Your next great idea starts here.', 126, 351, 720, 34, '#ffffff', false, 110);
      icon(s, 'arrow', 1130, 573, '#bfdfcf');
      txt(s, 'hello@example.com', 76, 610, 900, 18, '#bfdfcf');
    } else if (index === 3) {
      const c = newChart('bar', 76, 338);
      s.elements.push({
        ...c,
        width: 725,
        height: 265,
        values: [24, 47, 65, 96, 120],
        palette: [green],
        dataPath: null,
      });
      txt(s, 'Result', 876, 350, 280, 18, green, true);
      txt(s, '+20%', 876, 405, 280, 65, ink, true, 100);
    } else if (index === 4) {
      txt(s, 'hello@example.com', 76, 365, 1040, 38, '#ffffff', true, 85);
      txt(s, '+00 123 456 789', 76, 468, 1040, 28, '#bfdfcf');
    } else {
      ['Brand strategy', 'Website design', 'Project delivery'].forEach((value, i) => {
        const x = 76 + i * 381;
        box(s, x, 345, 352, 245, paper, 12);
        icon(s, i === 2 ? 'check' : 'document', x + 24, 374);
        txt(s, String(i + 1).padStart(2, '0'), x + 24, 435, 305, 20, green, true);
        txt(s, value, x + 24, 486, 305, 26, ink, true, 85);
      });
    }
    return s;
  });
}
function brochure(name: string) {
  return [0, 1].map((side) => {
    const s = page(name, 1123, 794);
    for (let col = 0; col < 3; col++) {
      const x = 32 + col * 353;
      const dark = col === 2 && side === 0;
      box(s, x, 32, 353, 730, dark ? ink : col === 1 ? soft : paper);
      const fill = dark ? '#ffffff' : ink;
      icon(
        s,
        col === 0 ? 'leaf' : col === 1 ? 'document' : 'arrow',
        x + 28,
        78,
        dark ? '#bfdfcf' : green,
      );
      txt(
        s,
        ['About us', 'Our services', side ? 'Contact us' : 'Discover what is possible'][col],
        x + 28,
        155,
        290,
        34,
        fill,
        true,
        150,
      );
      line(s, x + 28, 335, 290, dark ? '#6b8b84' : '#bed4ca');
      txt(
        s,
        ['Brand strategy', 'Website design', 'Project delivery'][col],
        x + 28,
        380,
        290,
        23,
        fill,
        true,
        100,
      );
      txt(
        s,
        'Your next great idea starts here.',
        x + 28,
        520,
        290,
        18,
        dark ? '#bfdfcf' : muted,
        false,
        110,
      );
      txt(s, 'hello@example.com', x + 28, 693, 290, 13, fill);
    }
    return s;
  });
}
function poster(id: string, name: string) {
  const w = id === 'poster' ? 1123 : 559;
  const h = id === 'poster' ? 1587 : 794;
  const s = page(name, w, h);
  const k = w / 559;
  box(s, 32, 32, w - 64, h - 64, ink, 12);
  txt(s, 'YOUR COMPANY', 54, 52, w - 108, 13 * k, '#bfdfcf', true, 35 * k);
  txt(s, 'MAKE IT HAPPEN', 54, 125 * k, w - 108, 48 * k, '#ffffff', true, 180 * k);
  box(s, 54, 335 * k, w - 108, 180 * k, '#bfdfcf', 10);
  icon(s, 'leaf', 90 * k, 380 * k, green);
  icon(s, 'star', 165 * k, 390 * k, gold);
  icon(s, 'arrow', 225 * k, 380 * k, green);
  txt(s, 'A moment worth celebrating', 54, 550 * k, w - 108, 23 * k, '#ffffff', true, 85 * k);
  txt(s, 'Date · Time · Location', 54, 660 * k, w - 108, 15 * k, '#bfdfcf', false, 50 * k);
  return [s];
}
export function professionalPreset(id: string, name: string): Slide[] | null {
  if (
    [
      'invoice',
      'service-act',
      'delivery-note',
      'price-list',
      'letterhead',
      'company-details',
      'proposal',
      'project-brief',
      'meeting-notes',
      'report',
    ].includes(id)
  )
    return office(id, name);
  if (id === 'resume') return resume(name);
  if (id === 'menu') return menu(name);
  if (id === 'presentation') return presentation(name);
  if (id === 'brochure') return brochure(name);
  if (id === 'flyer' || id === 'poster') return poster(id, name);
  return null;
}
export function addPresetDetails(slides: Slide[], id: string) {
  if (['ticket', 'coupon', 'badge', 'label'].includes(id))
    for (const slide of slides) {
      const y = slide.height - 65;
      icon(slide, 'check', slide.width - 65, y);
      if (id === 'label' && slide.height > 400) {
        const qr = newQr();
        slide.elements.push({
          ...qr,
          x: 48,
          y: slide.height - 185,
          width: 100,
          height: 100,
          text: 'DOC-2026-001',
        });
      }
    }
  return slides;
}
