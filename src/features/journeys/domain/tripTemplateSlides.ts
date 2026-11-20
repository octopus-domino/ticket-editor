import { newPath, newSimpleText, newSlide } from '@/lib/factories';
import type { Slide } from '@/shared/types';
import type { AccountTrip } from '../api/tripDraft';
import { getLocale, t } from '@/shared/i18n';
import { travelDuration, tripDocumentContent } from './tripDocumentContent';

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
  function add(paragraph: ReturnType<typeof tripDocumentContent>[number]) {
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
  for (const paragraph of tripDocumentContent(trip)) add(paragraph);
  const names = new Map(trip.cities.map(city => [city.id, city.name]));
  for (const day of trip.days) {
    const walks: (typeof day.walkingSections)[] = [];
    for (const section of day.walkingSections) {
      const previous = walks[walks.length - 1];
      if (previous?.[previous.length - 1].toSegmentId === section.fromSegmentId) previous.push(section);
      else walks.push([section]);
    }
    walks.forEach((sections, index) => {
      slide = newSlide(slides.length + 1);
      slides.push(slide);
      y = margin;
      const first = day.segments.findIndex(segment => segment.id === sections[0].fromSegmentId);
      const location = day.segments.slice(0, first).reverse().find(segment => segment.id.startsWith('visit-'));
      const title = location?.note || (index === 0 ? day.note : undefined) || t('Private itineraries');
      slide.name = title;
      add({ text: title, heading: 1 });
      add({ text: [day.date, location?.title ?? names.get(day.cityId)].filter(Boolean).join(' · '), heading: 2 });
      const km = sections.reduce((sum, section) => sum + section.distanceMeters, 0) / 1000;
      const seconds = sections.reduce((sum, section) => sum + section.durationSeconds, 0);
      add({ text: `${new Intl.NumberFormat(getLocale(), { style: 'unit', unit: 'kilometer', maximumFractionDigits: 1 }).format(km)} · ${travelDuration(seconds)}` });
      const width = slide.width - margin * 2;
      const height = 190;
      const tracks = sections.map(({ geometry }) => {
        const step = Math.ceil(geometry.length / 250);
        return geometry.filter((_, point) => point % Math.max(1, step) === 0 || point === geometry.length - 1);
      });
      const points = tracks.flat();
      if (points.length > 1) {
        const west = Math.min(...points.map(point => point.longitude));
        const north = Math.max(...points.map(point => point.latitude));
        const longitudeSpan = Math.max(...points.map(point => point.longitude)) - west;
        const latitudeSpan = north - Math.min(...points.map(point => point.latitude));
        const longitudeScale = Math.max(0.08, Math.cos(north * Math.PI / 180));
        const scale = Math.min(width / Math.max(longitudeSpan * longitudeScale, 1e-6),
          height / Math.max(latitudeSpan, 1e-6));
        const d = tracks.map(track => track.map((point, i) => {
          const x = (point.longitude - west) * longitudeScale * scale;
          const y = (north - point.latitude) * scale;
          return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ')).join(' ');
        slide.elements.push({ ...newPath(margin, y + 12), d, width, height,
          fill: 'none', stroke: '#317559', strokeWidth: 4 });
        y += height + 26;
      }
      const ids = [sections[0].fromSegmentId, ...sections.map(section => section.toSegmentId)];
      const stops = new Map(day.segments.map(segment => [segment.id, segment]));
      ids.forEach((id, stopIndex) => {
        const stop = stops.get(id);
        if (stop) add({ text: `${stopIndex + 1}. ${stop.title}${stop.note ? `
${stop.note}` : ''}` });
      });
    });
  }
  return slides;
}
