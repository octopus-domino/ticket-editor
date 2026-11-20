import { newSimpleText, newSlide } from '@/lib/factories';
import type { Slide } from '@/shared/types';
import type { AccountTrip } from '../api/tripDraft';
import { tripDocumentContent } from './tripDocumentContent';

function wrap(text: string, limit: number) {
  return text.split('\n').flatMap(line => {
    const rows: string[] = [];
    while (line.length > limit) {
      const space = line.lastIndexOf(' ', limit);
      const end = space > 0 ? space : limit;
      rows.push(line.slice(0, end));
      line = line.slice(end).trimStart();
    }
    return [...rows, line];
  });
}

export function tripTemplateSlides(trip: AccountTrip): Slide[] {
  const slides = [newSlide(1)];
  const margin = 48;
  let slide = slides[0];
  let y = margin;
  for (const paragraph of tripDocumentContent(trip)) {
    const fontSize = paragraph.heading === 1 ? 32 : paragraph.heading === 2 ? 24 : 17;
    const width = slide.width - 2 * margin;
    const lines = wrap(paragraph.link ? `${paragraph.text}\n${paragraph.link}` : paragraph.text,
      Math.floor(width / (fontSize * 0.64)));
    const lineHeight = Math.ceil(fontSize * 1.4);
    const gap = paragraph.heading ? 12 : 5;
    while (lines.length) {
      const capacity = Math.floor((slide.height - margin - y - gap - 8) / lineHeight);
      if (capacity < (paragraph.heading && lines.length > 1 ? 2 : 1)) {
        slide = newSlide(slides.length + 1);
        slides.push(slide);
        y = margin;
        continue;
      }
      const pageLines = lines.splice(0, capacity);
      const height = pageLines.length * lineHeight + 8;
      slide.elements.push({
        ...newSimpleText(margin, y), width, height, text: pageLines.join('\n'), fontSize,
        fontStyle: paragraph.heading ? 'bold' : 'normal', fill: paragraph.heading ? '#23483b' : '#24302c',
      });
      y += height + gap;
    }
  }
  return slides;
}
