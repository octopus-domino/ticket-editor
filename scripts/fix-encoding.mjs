#!/usr/bin/env node
/**
 * Перекодирует все .ts/.tsx/.css/.json/.md в UTF-8 из Windows-1251.
 * Пропускает файлы, которые уже в UTF-8 (эвристика по невалидным
 * для cp1251 последовательностям). Идемпотентно.
 *
 * Запуск:  node scripts/fix-encoding.mjs [--dry]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['src', 'public'];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);
const DRY = process.argv.includes('--dry');

/** true, если байты валидны как UTF-8 */
function isValidUtf8(buf) {
  try { new TextDecoder('utf-8', { fatal: true }).decode(buf); return true; }
  catch { return false; }
}

/** true, если в тексте есть типичные mojibake-маркеры */
function looksLikeCp1251AsUtf8(text) {
  return /Р[ІЅС]|вЂ|СЂСџ|Рµ|СЂРµ/.test(text);
}

function processFile(path) {
  const buf = readFileSync(path);
  const utf8Ok = isValidUtf8(buf);

  if (utf8Ok) {
    const txt = buf.toString('utf-8');
    if (!looksLikeCp1251AsUtf8(txt)) return false;   // уже чисто
    // уже utf-8, но с битыми символами — попытка «двойного» декода
    const repaired = Buffer.from(txt, 'latin1').toString('utf-8');
    if (!/�/.test(repaired)) {
      if (!DRY) writeFileSync(path, repaired, 'utf-8');
      return true;
    }
    return false;
  }

  // читаем как cp1251 → пишем как utf-8
  const decoded = new TextDecoder('windows-1251').decode(buf);
  if (!DRY) writeFileSync(path, decoded, 'utf-8');
  return true;
}

function walk(dir, hits = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, hits);
    else if (EXTS.has(extname(entry)) && processFile(full)) hits.push(full);
  }
  return hits;
}

const touched = [];
for (const root of ROOTS) {
  try { walk(root, touched); } catch { /* ignore */ }
}

console.log(DRY ? '[dry]' : '[fix-encoding]', 'files:', touched.length);
for (const f of touched) console.log('  •', f);