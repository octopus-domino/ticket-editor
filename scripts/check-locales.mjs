import ts from 'typescript';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const languages = ['en', 'ru', 'zh', 'pl', 'it', 'es', 'nl', 'fr', 'de'];
const normalize = (value) =>
  value
    .trim()
    .replace(/^[^\p{L}\p{N}{]+|[^\p{L}\p{N}}]+$/gu, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
const known = new Set();
const remainingSources = JSON.parse(
  await readFile('src/shared/i18n/remaining-source.json', 'utf8'),
);
const remainingTable = await readFile('src/shared/i18n/remaining-translations.ts', 'utf8');
const remainingIds = new Set();
for (const row of remainingTable
  .match(/String\.raw`([\s\S]*?)`/)[1]
  .trim()
  .split('\n')) {
  const [id, ...values] = row.split('|');
  if (
    remainingIds.has(id) ||
    values.length !== 8 ||
    values.some((value) => !value.trim()) ||
    !remainingSources[Number(id)]
  )
    throw new Error(`Invalid translation row: ${id}`);
  remainingIds.add(id);
  known.add(normalize(remainingSources[Number(id)]));
  known.add(normalize(values[0]));
}
if (remainingIds.size !== remainingSources.length)
  throw new Error('Some source messages have no translations');
for (const name of [
  'messages.ts',
  'editor-messages.ts',
  'editor-more.ts',
  'editor-final.ts',
  'help-messages.ts',
  'marketing-messages.ts',
  'extra-messages.ts',
  'tutorial-messages.ts',
  'recognition-messages.ts',
  'api-messages.ts',
  'workflow-messages.ts',
  'steering-messages.ts',
  'journey-messages.ts',
  'journey-extra-messages.ts',
  'journey-tools-messages.ts',
  'publication-messages.ts',
]) {
  const source = await readFile(`src/shared/i18n/${name}`, 'utf8').catch(() => '');
  const rows = [...source.matchAll(/String\.raw`([\s\S]*?)`/g)].flatMap((match) =>
    match[1].trim().split('\n'),
  );
  for (const row of rows) {
    const values = row.split('|');
    if (values.length !== languages.length || values.some((value) => !value.trim()))
      throw new Error(`Incomplete translations: ${row}`);
    known.add(normalize(values[0].replaceAll('\\n', '\n')));
    known.add(normalize(values[1].replaceAll('\\n', '\n')));
  }
}
const required = new Set();
async function inspect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) {
      if (!filename.replaceAll('\\', '/').includes('shared/i18n')) await inspect(filename);
      continue;
    }
    if (!/\.tsx?$/.test(filename)) continue;
    const file = ts.createSourceFile(
      filename,
      await readFile(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    function key(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        required.add(node.text);
      else if (ts.isConditionalExpression(node)) {
        key(node.whenTrue);
        key(node.whenFalse);
      }
    }
    function visit(node) {
      if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='PROFESSIONAL_COPY'&&node.initializer&&ts.isArrayLiteralExpression(node.initializer))for(const item of node.initializer.elements)key(item);
      if (
        filename.replaceAll('\\', '/').endsWith('shared/constants/index.ts') &&
        ts.isPropertyAssignment(node) &&
        node.name.getText(file) === 'label'
      )
        key(node.initializer);
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (['t', '__tr'].includes(node.expression.text) && node.arguments[0])
          key(node.arguments[0]);
        if (/journeys\/domain\/(definitions|extraPresets)\.ts$/.test(filename.replaceAll('\\', '/')) && node.expression.text === 'translate' && node.arguments[0])
          key(node.arguments[0]);
        if (filename.replaceAll('\\', '/').endsWith('journeys/domain/extraPresets.ts') && node.expression.text === 'field' && node.arguments[1]) key(node.arguments[1]);
        if (
          filename.replaceAll('\\', '/').endsWith('features/learning/lessons.ts') &&
          node.expression.text === 'step'
        ) {
          key(node.arguments[0]);
          key(node.arguments[1]);
          key(node.arguments[2]);
        }
        if (
          filename.replaceAll('\\', '/').endsWith('templates/tutorials.ts') &&
          node.expression.text === 'text'
        )
          key(node.arguments[1]);
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
}
await inspect('src');
const missing = [...required].filter((key) => !known.has(normalize(key))).sort();
await writeFile('src/shared/i18n/missing-messages.json', JSON.stringify(missing, null, 2) + '\n');
console.log(
  `${required.size} UI messages; ${missing.length} missing translations in the nine-language catalog.`,
);
if (missing.length && !process.argv.includes('--report')) process.exitCode = 1;
