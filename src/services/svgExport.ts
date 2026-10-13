import type {
  Slide, StampElement, TextElement, PlaceholderElement, LineElement,
  FillElement, DataFieldType, DashType,
} from '../types';

const escape = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));

const dashSvg = (d: DashType): string =>
  d === 'solid' ? '' : ` stroke-dasharray="${
    d === 'dashed' ? '10,6' : d === 'dotted' ? '2,5' : d === 'dashdot' ? '10,5,2,5' : '20,8'}"`;

const fontFamilyAttr = (f?: string): string => {
  const name = f || 'Arial';
  return name.includes(' ') ? `'${name}'` : name;
};

function stampToSvg(el: StampElement): string {
  const sw = el.strokeWidth, isw = el.innerStrokeWidth, c = el.stampColor;
  const cx = el.width / 2, cy = el.height / 2;
  const t = `transform="translate(${el.x},${el.y}) rotate(${el.rotation},${cx},${cy})"`;
  let body = '';
  if (el.shape === 'circle') {
    const r = Math.min(el.width, el.height) / 2;
    body = `<circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="${c}" stroke-width="${sw}"${dashSvg(el.strokeDash)}/>`;
    if (el.showInner) body += `<circle cx="${cx}" cy="${cy}" r="${r - 20}" fill="none" stroke="${c}" stroke-width="${isw}"${dashSvg(el.innerStrokeDash)}/>`;
  } else if (el.shape === 'oval') {
    body = `<ellipse cx="${cx}" cy="${cy}" rx="${el.width / 2 - 4}" ry="${el.height / 2 - 4}" fill="none" stroke="${c}" stroke-width="${sw}"${dashSvg(el.strokeDash)}/>`;
    if (el.showInner) body += `<ellipse cx="${cx}" cy="${cy}" rx="${el.width / 2 - 20}" ry="${el.height / 2 - 20}" fill="none" stroke="${c}" stroke-width="${isw}"${dashSvg(el.innerStrokeDash)}/>`;
  } else if (el.shape === 'rect') {
    body = `<rect x="4" y="4" width="${el.width - 8}" height="${el.height - 8}" rx="6" fill="none" stroke="${c}" stroke-width="${sw}"${dashSvg(el.strokeDash)}/>`;
    if (el.showInner) body += `<rect x="16" y="16" width="${el.width - 32}" height="${el.height - 32}" rx="4" fill="none" stroke="${c}" stroke-width="${isw}"${dashSvg(el.innerStrokeDash)}/>`;
  } else {
    body = `<polygon points="${cx},4 ${el.width - 4},${el.height - 4} 4,${el.height - 4}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"${dashSvg(el.strokeDash)}/>`;
    if (el.showInner) body += `<polygon points="${cx},20 ${el.width - 20},${el.height - 20} 20,${el.height - 20}" fill="none" stroke="${c}" stroke-width="${isw}" stroke-linejoin="round"${dashSvg(el.innerStrokeDash)}/>`;
  }

  const topSize = el.topFontSize || 14;
  const centerSize = el.centerFontSize || 20;
  const bottomSize = el.bottomFontSize || 12;
  const topBold = (el.topFontStyle || '').includes('bold') ? 'bold' : 'normal';
  const topItalic = (el.topFontStyle || '').includes('italic') ? 'italic' : 'normal';
  const centerBold = (el.centerFontStyle || '').includes('bold') ? 'bold' : 'normal';
  const centerItalic = (el.centerFontStyle || '').includes('italic') ? 'italic' : 'normal';
  const botBold = (el.bottomFontStyle || '').includes('bold') ? 'bold' : 'normal';
  const botItalic = (el.bottomFontStyle || '').includes('italic') ? 'italic' : 'normal';

  const idSafe = `s${el.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  let topText = '';
  let botText = '';
  let defs = '';

  if (el.shape === 'circle' || el.shape === 'oval') {
    const r = Math.min(el.width, el.height) / 2 - 32;
    const aT1 = 1.15 * Math.PI, aT2 = 1.85 * Math.PI;
    const t1x = cx + r * Math.cos(aT1), t1y = cy + r * Math.sin(aT1);
    const t2x = cx + r * Math.cos(aT2), t2y = cy + r * Math.sin(aT2);
    const topPath = `M ${t1x} ${t1y} A ${r} ${r} 0 0 1 ${t2x} ${t2y}`;
    const aB1 = 0.85 * Math.PI, aB2 = 0.15 * Math.PI;
    const b1x = cx + r * Math.cos(aB1), b1y = cy + r * Math.sin(aB1);
    const b2x = cx + r * Math.cos(aB2), b2y = cy + r * Math.sin(aB2);
    const botPath = `M ${b1x} ${b1y} A ${r} ${r} 0 0 0 ${b2x} ${b2y}`;
    const topId = `${idSafe}-top`;
    const botId = `${idSafe}-bot`;
    defs = `<defs><path id="${topId}" d="${topPath}" fill="none"/><path id="${botId}" d="${botPath}" fill="none"/></defs>`;
    topText = `<text font-size="${topSize}" fill="${el.topColor || c}" font-family="${fontFamilyAttr(el.topFontFamily)}" font-weight="${topBold}" font-style="${topItalic}"><textPath href="#${topId}" xlink:href="#${topId}" startOffset="50%" text-anchor="middle">${escape(el.topText)}</textPath></text>`;
    botText = `<text font-size="${bottomSize}" fill="${el.bottomColor || c}" font-family="${fontFamilyAttr(el.bottomFontFamily)}" font-weight="${botBold}" font-style="${botItalic}"><textPath href="#${botId}" xlink:href="#${botId}" startOffset="50%" text-anchor="middle">${escape(el.bottomText)}</textPath></text>`;
  } else {
    const topY = el.shape === 'rect' ? 32 : 42;
    const botY = el.shape === 'rect' ? el.height - 20 : el.height - 24;
    topText = `<text x="${cx}" y="${topY}" text-anchor="middle" font-size="${topSize}" fill="${el.topColor || c}" font-family="${fontFamilyAttr(el.topFontFamily)}" font-weight="${topBold}" font-style="${topItalic}">${escape(el.topText)}</text>`;
    botText = `<text x="${cx}" y="${botY}" text-anchor="middle" font-size="${bottomSize}" fill="${el.bottomColor || c}" font-family="${fontFamilyAttr(el.bottomFontFamily)}" font-weight="${botBold}" font-style="${botItalic}">${escape(el.bottomText)}</text>`;
  }

  const centerText = `<text x="${cx}" y="${cy + 6}" text-anchor="middle" dominant-baseline="middle" font-size="${centerSize}" fill="${el.centerColor || c}" font-family="${fontFamilyAttr(el.centerFontFamily)}" font-weight="${centerBold}" font-style="${centerItalic}">${escape(el.centerText)}</text>`;

  return `<g ${t}>${defs}${body}${topText}${centerText}${botText}</g>`;
}

function textToSvg(el: TextElement): string {
  const pad = el.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerW = Math.max(10, el.width - pad.left - pad.right);
  const fs = el.fontStyle.includes('bold') ? 'bold' : 'normal';
  const fst = el.fontStyle.includes('italic') ? 'italic' : 'normal';
  const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start';
  const tx = el.x + pad.left + (el.align === 'center' ? innerW / 2 : el.align === 'right' ? innerW : 0);
  const firstLineY = el.y + pad.top + el.fontSize;
  const bg = el.background && el.background !== 'transparent'
    ? `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${el.background}"/>`
    : '';
  const tr = `transform="rotate(${el.rotation},${el.x + el.width / 2},${el.y + el.height / 2})"`;
  const lines = el.text.split('\n');
  const lineHeight = el.fontSize * (el.lineHeight || 1.2);
  let textSvg = '';
  if (lines.length === 1) {
    textSvg = `<text x="${tx}" y="${firstLineY}" font-size="${el.fontSize}" font-family="${fontFamilyAttr(el.fontFamily)}" font-weight="${fs}" font-style="${fst}" text-decoration="${el.textDecoration}" fill="${el.fill}" text-anchor="${anchor}">${escape(el.text)}</text>`;
  } else {
    textSvg = lines.map((ln, i) =>
      `<text x="${tx}" y="${firstLineY + i * lineHeight}" font-size="${el.fontSize}" font-family="${fontFamilyAttr(el.fontFamily)}" font-weight="${fs}" font-style="${fst}" text-decoration="${el.textDecoration}" fill="${el.fill}" text-anchor="${anchor}">${escape(ln)}</text>`
    ).join('');
  }
  return `<g ${tr}>${bg}${textSvg}</g>`;
}

function placeholderToSvg(el: PlaceholderElement): string {
  const pad = el.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerW = Math.max(10, el.width - pad.left - pad.right);
  const fs = el.fontStyle.includes('bold') ? 'bold' : 'normal';
  const fst = el.fontStyle.includes('italic') ? 'italic' : 'normal';
  const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start';
  const tx = el.x + pad.left + (el.align === 'center' ? innerW / 2 : el.align === 'right' ? innerW : 0);
  const tr = `transform="rotate(${el.rotation},${el.x + el.width / 2},${el.y + el.height / 2})"`;
  const displayText = el.sample || `{{${el.fieldPath}}}`;
  const bg = el.background && el.background !== 'transparent'
    ? `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${el.background}"/>`
    : '';

  if (el.fieldType === 'image') {
    const src = el.sample || `{{${el.fieldPath}}}`;
    return `<g ${tr}>${bg}<image href="${escape(src)}" x="${el.x + pad.left}" y="${el.y + pad.top}" width="${innerW}" height="${Math.max(10, el.height - pad.top - pad.bottom)}" preserveAspectRatio="xMidYMid meet"/></g>`;
  }

  const lines = displayText.split('\n');
  const lineHeight = el.fontSize * (el.lineHeight || 1.2);
  const startY = el.y + pad.top + el.fontSize;
  const linesSvg = lines.length === 1
    ? `<text x="${tx}" y="${startY}" font-size="${el.fontSize}" font-family="${fontFamilyAttr(el.fontFamily)}" font-weight="${fs}" font-style="${fst}" fill="${el.fill}" text-anchor="${anchor}">${escape(displayText)}</text>`
    : lines.map((ln, i) =>
        `<text x="${tx}" y="${startY + i * lineHeight}" font-size="${el.fontSize}" font-family="${fontFamilyAttr(el.fontFamily)}" font-weight="${fs}" font-style="${fst}" fill="${el.fill}" text-anchor="${anchor}">${escape(ln)}</text>`
      ).join('');
  return `<g ${tr}>${bg}${linesSvg}</g>`;
}

function lineToSvg(el: LineElement): string {
  const points = el.points && el.points.length >= 4 ? el.points : [0, el.height / 2, el.width, el.height / 2];
  const tr = `transform="translate(${el.x},${el.y}) rotate(${el.rotation},${el.width / 2},${el.height / 2})"`;
  const pts = points.join(',');
  let arrow = '';
  if (el.isArrow && points.length >= 4) {
    const n = points.length;
    const x1 = points[n - 4], y1 = points[n - 3], x2 = points[n - 2], y2 = points[n - 1];
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 14;
    const a1 = angle + Math.PI - 0.35;
    const a2 = angle + Math.PI + 0.35;
    arrow = `<polyline points="${x2 + len * Math.cos(a1)},${y2 + len * Math.sin(a1)} ${x2},${y2} ${x2 + len * Math.cos(a2)},${y2 + len * Math.sin(a2)}" fill="none" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<g ${tr}><polyline points="${pts}" fill="none" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${dashSvg(el.dash)} stroke-linecap="round" stroke-linejoin="round"/>${arrow}</g>`;
}

function fillToSvg(el: FillElement): string {
  if (!el.points || el.points.length < 6) return '';
  const tr = `transform="translate(${el.x},${el.y}) rotate(${el.rotation})"`;
  return `<polygon ${tr} points="${el.points.join(',')}" fill="${el.fill}"${el.stroke ? ` stroke="${el.stroke}" stroke-width="${el.strokeWidth}"` : ''}/>`;
}

export function buildSvg(slide: Slide): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${slide.width}" height="${slide.height}" viewBox="0 0 ${slide.width} ${slide.height}">`
  );

  if (slide.backgroundImage) {
    parts.push(
      `<image href="${slide.backgroundImage}" x="0" y="0" width="${slide.width}" height="${slide.height}" preserveAspectRatio="xMidYMid slice"/>`
    );
  } else {
    parts.push(`<rect width="100%" height="100%" fill="${slide.background}"/>`);
  }

  const fills = slide.elements.filter((el) => el.type === 'fill');
  if (fills.length) {
    parts.push('<g opacity="0.6">');
    for (const el of fills) parts.push(fillToSvg(el as FillElement));
    parts.push('</g>');
  }

  for (const el of slide.elements) {
    if (el.type === 'fill') continue;
    if (el.type === 'text') parts.push(textToSvg(el));
    else if (el.type === 'placeholder') parts.push(placeholderToSvg(el));
    else if (el.type === 'stamp') parts.push(stampToSvg(el));
    else if (el.type === 'line') parts.push(lineToSvg(el));
    else if (el.type === 'image') {
      parts.push(
        `<image href="${el.src}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" transform="rotate(${el.rotation},${el.x + el.width / 2},${el.y + el.height / 2})"/>`
      );
    } else if (el.type === 'shape') {
      const fillAttr = el.fill === 'transparent' ? 'none' : el.fill;
      const tr = `transform="rotate(${el.rotation},${el.x + el.width / 2},${el.y + el.height / 2})"`;
      const r = el.radius || 0;
      if (el.shape === 'rect' || el.shape === 'roundRect') {
        parts.push(
          `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${r}" ry="${r}" fill="${fillAttr}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" ${tr}/>`
        );
      } else if (el.shape === 'circle') {
        parts.push(
          `<circle cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" r="${Math.min(el.width, el.height) / 2}" fill="${fillAttr}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" ${tr}/>`
        );
      } else if (el.shape === 'triangle') {
        parts.push(
          `<polygon points="${el.x + el.width / 2},${el.y} ${el.x + el.width},${el.y + el.height} ${el.x},${el.y + el.height}" fill="${fillAttr}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" ${tr}/>`
        );
      }
      if (el.text) {
        parts.push(
          `<text x="${el.x + el.width / 2}" y="${el.y + el.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${el.fontSize}" fill="${el.textFill}" ${tr}>${escape(el.text)}</text>`
        );
      }
    } else if (el.type === 'table') {
      const cw = el.width / el.cols;
      const ch = el.height / el.rows;
      const tr = `transform="rotate(${el.rotation},${el.x + el.width / 2},${el.y + el.height / 2})"`;
      parts.push(`<g ${tr}>`);
      for (let r = 0; r < el.rows; r++) {
        for (let c = 0; c < el.cols; c++) {
          const bg = r === 0 ? el.headerBg : '#fff';
          parts.push(
            `<rect x="${el.x + c * cw}" y="${el.y + r * ch}" width="${cw}" height="${ch}" fill="${bg}" stroke="${el.borderColor}" stroke-width="1"/>`
          );
          const txt = el.data[r]?.[c] ?? '';
          if (txt) {
            parts.push(
              `<text x="${el.x + c * cw + 6}" y="${el.y + r * ch + el.fontSize}" font-size="${el.fontSize}" fill="#111">${escape(txt)}</text>`
            );
          }
        }
      }
      parts.push('</g>');
    } else if (el.type === 'footer') {
      const tr = `transform="rotate(${el.rotation},${el.x + el.width / 2},${el.y + el.height / 2})"`;
      parts.push(
        `<g ${tr}><rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${el.bgColor}"/><text x="${el.x + el.width / 2}" y="${el.y + el.height / 2 + el.fontSize / 3}" text-anchor="middle" font-size="${el.fontSize}" fill="${el.fill}">${escape(el.text)}</text></g>`
      );
    }
  }
  parts.push('</svg>');
  return parts.join('\n');
}

export type { DataFieldType };