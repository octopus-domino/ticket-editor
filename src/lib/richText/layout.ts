import type { TextRun, PositionedRun, LayoutResult } from './types';
import { measureText } from './measure';

type Token = TextRun & { width: number; fsize: number; ffamily: string; style: string };

const PARAGRAPH_GAP_PX = 8;
const LIST_INDENT = 20; // отступ для пунктов списка

export function layoutRuns(
  runs: TextRun[],
  maxWidth: number,
  lineHeightCoef: number,
): LayoutResult {
  if (!runs.length || maxWidth <= 0) {
    return { lines: [], totalHeight: 0, lineHeight: 0 };
  }

  let baseFontSize = 16;
  let baseFontFamily = 'Arial';
  for (const run of runs) {
    if (run.fontSize) baseFontSize = run.fontSize;
    if (run.fontFamily) baseFontFamily = run.fontFamily;
  }

  const tokens = tokenize(runs, baseFontSize, baseFontFamily);
  const paragraphGap = PARAGRAPH_GAP_PX;

  const lines: PositionedRun[][] = [];
  let currentLine: PositionedRun[] = [];
  let currentLineMaxFontSize = 0;
  let cursorX = 0;
  let cursorY = 0;
  let pendingNewlines = 0;
  let currentIndent = 0;

  let leadingGapY = 0;

  const flushLine = () => {
    if (!currentLine.length) return;
    lines.push(currentLine);

    const lh = Math.max(
      currentLineMaxFontSize,
      Math.round(currentLineMaxFontSize * lineHeightCoef),
    );
    cursorY += lh;
    cursorX = 0;
    currentLine = [];
    currentLineMaxFontSize = 0;
  };

  const applyPendingNewlines = (isEnd: boolean) => {
    if (pendingNewlines === 0) return;
    const approxLh = Math.round(baseFontSize * lineHeightCoef);

    if (lines.length === 0 && currentLine.length === 0) {
      if (!isEnd) {
        const pairs = Math.floor(pendingNewlines / 2);
        if (pairs > 0) {
          leadingGapY += paragraphGap;
          for (let p = 1; p < pairs; p++) leadingGapY += approxLh + paragraphGap;
        } else {
          leadingGapY += approxLh;
        }
      }
      pendingNewlines = 0;
      return;
    }

    flushLine();

    if (!isEnd) {
      const pairs = Math.floor(pendingNewlines / 2);
      if (pairs > 0) {
        cursorY += paragraphGap;
        for (let p = 1; p < pairs; p++) cursorY += approxLh + paragraphGap;
      }
    }
    pendingNewlines = 0;
  };

  const pushToken = (tk: Token, text: string, width: number) => {
    if (leadingGapY > 0 && currentLine.length === 0 && lines.length === 0) {
      cursorY += leadingGapY;
      leadingGapY = 0;
    }
    if (tk.fsize > currentLineMaxFontSize) currentLineMaxFontSize = tk.fsize;

    if (cursorX === 0) {
      cursorX += currentIndent;
    }

    currentLine.push({
      text,
      bold: tk.bold,
      italic: tk.italic,
      underline: tk.underline,
      strike: tk.strike,
      color: tk.color,
      bgColor: tk.bgColor,
      href: tk.href,
      fontSize: tk.fsize,
      fontFamily: tk.ffamily,
      x: cursorX,
      y: cursorY,
      width,
      actualFontSize: tk.fsize,
    });
    cursorX += width;
  };

  for (const tk of tokens) {
    if (tk.text === '\n') {
      pendingNewlines++;
      continue;
    }

    const isSpace = /^\s+$/.test(tk.text);
    if (isSpace && cursorX === 0 && pendingNewlines === 0) continue;

    // Сброс отступа при двойном переносе (новый абзац)
    if (pendingNewlines >= 2) {
      currentIndent = 0;
    }

    // Сначала применяем переносы строк, чтобы cursorX сбросился в 0
    applyPendingNewlines(false);

    // Теперь, если мы в начале строки, вычисляем отступ
    if (cursorX === 0) {
      if (tk.text.startsWith('•') || tk.text.startsWith('1.') || tk.text.startsWith('2.')) {
        currentIndent = LIST_INDENT;
      } else if (tk.text.trim() === '') {
        currentIndent = tk.width;
      }
      // Если это продолжение списка (перенос длинного текста), currentIndent не сбрасываем
    }

    if (cursorX + tk.width <= maxWidth) {
      pushToken(tk, tk.text, tk.width);
      continue;
    }

    if (cursorX > 0) flushLine();
    if (isSpace) continue;

    if (tk.width > maxWidth) {
      const chars = Array.from(tk.text);
      let chunk = '';
      let chunkWidth = 0;

      for (const ch of chars) {
        const cw = measureText(ch, tk.fsize, tk.ffamily, tk.style);
        if (chunkWidth + cw > maxWidth && chunk.length > 0) {
          pushToken(tk, chunk, chunkWidth);
          flushLine();
          chunk = ch;
          chunkWidth = cw;
        } else {
          chunk += ch;
          chunkWidth += cw;
        }
      }
      if (chunk.length) pushToken(tk, chunk, chunkWidth);
      continue;
    }

    pushToken(tk, tk.text, tk.width);
  }

  applyPendingNewlines(true);
  flushLine();

  let totalHeight = 0;
  for (const line of lines) {
    for (const r of line) {
      const bottom = r.y + Math.max(r.actualFontSize, r.actualFontSize * lineHeightCoef);
      if (bottom > totalHeight) totalHeight = bottom;
    }
  }

  return { lines, totalHeight, lineHeight: 0 };
}

function tokenize(runs: TextRun[], baseFontSize: number, baseFontFamily: string): Token[] {
  const tokens: Token[] = [];
  for (const run of runs) {
    const fs = run.fontSize ?? baseFontSize;
    const ff = run.fontFamily ?? baseFontFamily;
    const style =
      run.bold && run.italic ? 'italic bold'
      : run.bold ? 'bold'
      : run.italic ? 'italic'
      : 'normal';

    for (const part of run.text.split(/(\n)/)) {
      if (part === '') continue;
      if (part === '\n') {
        tokens.push({ ...run, text: '\n', width: 0, fsize: fs, ffamily: ff, style });
        continue;
      }
      for (const w of part.split(/(\s+)/)) {
        if (w === '') continue;
        tokens.push({
          ...run,
          text: w,
          width: measureText(w, fs, ff, style),
          fsize: fs,
          ffamily: ff,
          style,
        });
      }
    }
  }
  return tokens;
}