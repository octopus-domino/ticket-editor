import { it, expect } from 'vitest';
import { hasRichStructure } from '@/lib/richText/content';
import { appendPlaceholderPatch } from '@/lib/modelBinding';
import { newText } from '@/lib/factories';

it('recognizes an empty table as structure without treating an empty paragraph as content', () => {
  expect(hasRichStructure('<p><br></p>')).toBe(false);
  expect(hasRichStructure('<TABLE><tr><td><p></p></td></tr></TABLE>')).toBe(true);
});

it('adding a data field preserves a table that has no cell text yet', () => {
  const html = '<table><tbody><tr><td><p></p></td><td><p></p></td></tr></tbody></table>';
  const patch = appendPlaceholderPatch({ ...newText(), text: '', html }, 'name');
  const document = new DOMParser().parseFromString(patch.html ?? '', 'text/html');
  expect(document.querySelectorAll('td')).toHaveLength(2);
  expect(document.body.textContent).toContain('{{name}}');
});
