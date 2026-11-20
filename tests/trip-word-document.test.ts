import { wordDocument } from '../src/shared/files/wordDocument';
import { strFromU8, unzipSync } from 'fflate';
import { expect, test } from 'vitest';
import { tripPayload } from '../src/features/journeys/api/tripDraft';
import { tripDocumentContent } from '../src/features/journeys/domain/tripDocumentContent';

test('builds a Word package with editable Cyrillic, route data and an escaped document link', async () => {
  const trip = tripPayload({ id: 'docx', version: 2, startDate: '2027-01-01', endDate: '2027-01-02',
    days: { 1: { city: 'Москва', stops: [] }, 2: { city: 'Тверь', stops: [] } },
    documents: [{ id: '1', title: 'Билет & багаж', url: 'https://example.org/?a=1&b=2' }] }, 'Поездка',
    [{ from: { id: '1' }, to: { id: '2' }, mode: 'CAR', result: { seconds: 3600 } }]);
  const blob = wordDocument(tripDocumentContent(trip));
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const xml = strFromU8(files['word/document.xml']);
  expect(xml).toContain('Поездка');
  expect(xml).toContain('Москва → Тверь');
  expect(xml).toContain('Билет &amp; багаж');
  expect(strFromU8(files['word/_rels/document.xml.rels'])).toContain('?a=1&amp;b=2');
  expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
});

test('embeds each editor slide as its own Word page', async () => {
  const pixels = new Uint8Array([137, 80, 78, 71]);
  const file = wordDocument([], [
    { bytes: pixels, width: 800, height: 600, title: 'First' },
    { bytes: pixels, width: 600, height: 800, title: 'Second' },
  ]);
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  expect(files['word/media/page1.png']).toEqual(pixels);
  expect(files['word/media/page2.png']).toEqual(pixels);
  const xml = strFromU8(files['word/document.xml']);
  expect(xml).toContain('<w:pageBreakBefore/>');
  expect(xml).toContain('r:embed="image2"');
  expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
});
