import ts from 'typescript';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// One-time syntax-aware migration. User data, identifiers, comments and types are not rewritten.
const cyrillic = /[А-Яа-яЁё]/;
const extraOnly = process.argv.includes('--extra');
const englishLabels = new Set(['Email','Email preview','Diagram Editor','Draw.io editor','Rich','Path','Bar','Donut','Pathfinder','Appearance','Language / Язык']);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { if (!filename.includes('shared\\i18n') && !filename.includes('shared/i18n')) await walk(filename); }
    else if (entry.name.endsWith('.tsx') && !extraOnly || extraOnly && entry.name.endsWith('.ts') && /(?:features|workspace|presentation)[\\/]/.test(filename)) files.push(filename);
  }
}
await walk('src');
if (!extraOnly) files.push('src/shared/constants.ts', 'src/features/schemas/domain/DataSchema.ts', 'src/features/workspace/domain/WorkspaceFlow.ts', 'src/lib/factories.ts', 'src/lib/stamps/factories.ts', 'src/marketing/content.ts', 'src/marketing/searchPages.ts');
if (extraOnly) { async function jsx(d) { for(const e of await readdir(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()){if(!p.replaceAll('\\','/').includes('shared/i18n'))await jsx(p);}else if(p.endsWith('.tsx'))files.push(p);}} await jsx('src'); }
const messages = new Set();
let changed = 0;
for (const filename of files) {
  const source = await readFile(filename, 'utf8').catch(() => null);
  if (source === null) continue;
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const add = (node, replacement) => edits.push({ start: node.getStart(file), end: node.end, replacement });
  const translated = (key, values = []) => { messages.add(key); return `__tr(${JSON.stringify(key)}${values.map((value) => `, ${value}`).join('')})`; };
  function visit(node) {
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isCallExpression(node) && ['t','__tr'].includes(node.expression.getText(file))) return;
    if (ts.isJsxText(node) && (cyrillic.test(node.text) || englishLabels.has(node.text.trim()))) {
      const key = node.text.replace(/\s+/g, ' ').trim().replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&nbsp;/g, '\u00a0');
      if (key) add(node, `{${translated(key)}}`);
      return;
    }
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && (cyrillic.test(node.text) || ts.isJsxAttribute(node.parent) && englishLabels.has(node.text)) && node.text.length > 1) {
      if (ts.isPropertyAssignment(node.parent) && node.parent.name === node || ts.isCaseClause(node.parent)) return;
      const value = translated(node.text);
      add(node, ts.isJsxAttribute(node.parent) ? `{${value}}` : value);
      return;
    }
    if (ts.isTemplateExpression(node) && cyrillic.test(node.getText(file))) {
      const values = node.templateSpans.map((span) => span.expression.getText(file));
      let key = node.head.text;
      node.templateSpans.forEach((span, index) => { key += `{${index}}${span.literal.text}`; });
      if (cyrillic.test(key)) { add(node, translated(key, values)); return; }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!edits.length) continue;
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  if (!/import\s*\{[^}]*\bt as __tr\b/.test(result)) result = `import { t as __tr } from '@/shared/i18n';\n` + result.replace(/^\uFEFF/, '');
  await writeFile(filename, result);
  changed++;
}
if (!extraOnly) await writeFile('src/shared/i18n/legacy-messages.json', JSON.stringify([...messages].sort(), null, 2) + '\n');
console.log(`Localized syntax in ${changed} files; ${messages.size} source messages.`);
