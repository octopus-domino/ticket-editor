import { t } from '@/shared/i18n';
import { unzipSync, strFromU8 } from 'fflate';

/** Bounded XLSX reader. Never evaluates formulas, follows links or uploads the workbook. */
export async function readProposalWorkbook(file: File): Promise<string[][]> {
  if (file.size > 2 * 1024 * 1024) throw new Error(t('Excel-файл должен быть не больше 2 МБ.'));
  let expanded = 0;
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter(entry) {
      expanded += entry.originalSize;
      if (expanded > 8 * 1024 * 1024 || entry.name.includes('..'))
        throw new Error(t('Слишком большой Excel-файл.'));
      if (/vbaProject|externalLinks/i.test(entry.name))
        throw new Error(t('Сохраните файл без макросов и внешних ссылок.'));
      return entry.name.startsWith('xl/');
    },
  });
  function xml(path: string) {
    if (!files[path]) throw new Error(t('Не удалось прочитать Excel. Нужен файл .xlsx.'));
    const text = strFromU8(files[path]);
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error(t('Неподдерживаемый Excel-файл.'));
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error(t('Повреждённый Excel-файл.'));
    return doc;
  }
  const first = xml('xl/workbook.xml').getElementsByTagName('sheet')[0];
  const rel = Array.from(
    xml('xl/_rels/workbook.xml.rels').getElementsByTagName('Relationship'),
  ).find((r) => r.getAttribute('Id') === first?.getAttribute('r:id'));
  const target = rel?.getAttribute('Target') ?? '';
  if (!target || target.includes('..') || rel?.getAttribute('TargetMode') === 'External')
    throw new Error(t('Неподдерживаемая ссылка на лист Excel.'));
  const shared = files['xl/sharedStrings.xml']
    ? Array.from(xml('xl/sharedStrings.xml').getElementsByTagName('si')).map(
        (s) => s.textContent ?? '',
      )
    : [];
  const rows = Array.from(
    xml(target.startsWith('/') ? target.slice(1) : `xl/${target}`).getElementsByTagName('row'),
  );
  if (rows.length > 1000)
    throw new Error(t('Оставьте на первом листе заголовок и до 200 позиций.'));
  return rows
    .map((row) => {
      const values: string[] = [];
      for (const cell of Array.from(row.getElementsByTagName('c'))) {
        const letters = cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0] ?? '';
        let col = 0;
        for (const c of letters) col = col * 26 + c.charCodeAt(0) - 64;
        if (col < 1 || col > 100) throw new Error(t('Поддерживается до 100 колонок.'));
        const type = cell.getAttribute('t');
        const raw = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        // Cached formula values may be stale: require explicit values instead.
        values[col - 1] = cell.getElementsByTagName('f').length
          ? t('[формула — замените значением]')
          : type === 's'
            ? (shared[Number(raw)] ?? '')
            : type === 'inlineStr'
              ? (cell.getElementsByTagName('is')[0]?.textContent ?? '')
              : raw;
      }
      return values;
    })
    .filter((row) => row.some(Boolean));
}
