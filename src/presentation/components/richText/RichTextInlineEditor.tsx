import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import FontFamily from '@tiptap/extension-font-family';

import { FontSize, CustomTableCell, CustomTableHeader, Indent } from './extensions';
import { ColorPickerPopover } from './ColorPickerPopover';
import { TableOperationsToolbar } from './TableOperationsToolbar';
import { TEXT_COLORS, BG_COLORS, FONT_SIZES, FONT_FAMILIES } from './palettes';
import { normalizeTableWidthsInHtml, serializeRichHtml } from '@/lib/richText/tableSync';
import type { EditingState } from '../../stores/ModalsStore';
import type { TextElement } from '@/shared/types';

interface Props {
  editing: EditingState;
  element: TextElement;
  zoom: number;
  onClose: () => void;
  onCommit: (html: string, text: string) => void;
}

type PopKind = null | 'color' | 'bg';

const TOOLBAR_HEIGHT = 52;
const TOOLBAR_GAP = 8;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/**
 * Plain → HTML. Переносы строк → <br>.
 * Нужен для старых TextElement: у них richText: true, но нет html,
 * а текст лежит в el.text. Без этого редактор открывался пустым
 * и затирал старый текст при закрытии.
 */
function plainToHtml(text: string): string {
  if (!text) return '<p></p>';
  return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
}

export const RichTextInlineEditor: React.FC<Props> = ({
  editing, element, zoom, onClose, onCommit,
}) => {
  const [pop, setPop] = useState<PopKind>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  const innerWidth = Math.max(40, element.width - element.padding.left - element.padding.right);

  /*
   * Исходный HTML до нормализации ширин таблиц.
   * Приоритет: editing.html → wrap(editing.value) → пустой.
   *
   * Случай со старыми элементами (richText:true, html:undefined, есть text):
   * оборачиваем text в <p> — иначе редактор стартует пустым и затирает контент.
   */
  const baseHtml = useMemo(() => {
    if (editing.html && editing.html.trim()) return editing.html;
    const plain = editing.value ?? '';
    if (!plain.trim() || plain === 'Введите текст') return '<p></p>';
    return plainToHtml(plain);
  }, [editing.html, editing.value]);

  /*
   * Нормализация ширин таблиц под innerWidth + обёртка <p>, если в
   * контенте есть <table>. Нужна, чтобы TipTap корректно распарсил
   * и чтобы таблица не вылезала за пределы элемента.
   */
  const processedHtml = useMemo(() => {
    let clean = baseHtml;
    if (clean.includes('<table')) {
      if (!clean.startsWith('<p>') && !clean.startsWith('<div>')) clean = '<p><br></p>' + clean;
      if (!clean.endsWith('</p>') && !clean.endsWith('</div>')) clean += '<p><br></p>';
      clean = normalizeTableWidthsInHtml(clean, innerWidth);
    }
    return clean;
  }, [baseHtml, innerWidth]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      Indent,
    ],
    content: processedHtml,
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(processedHtml);
      setTimeout(() => {
        try { editor.commands.focus('end'); } catch { /* noop */ }
      }, 30);
    }
  }, [processedHtml, editor]);

  const handleCommit = useCallback(() => {
    if (!editor) return;

    let html = '';
    try {
      const raw = editor.getHTML();
      html = raw.includes('<table')
        ? serializeRichHtml(editor.view.dom, raw, innerWidth)
        : raw;
    } catch (err) {
      console.error('[RichTextInlineEditor] serialization failed:', err);
      // Страховка: если сериализация упала, не затираем исходный контент.
      html = baseHtml;
    }
    if (html.includes('<table') && /<\/table>\s*$/.test(html)) html += '<p><br></p>';

    const text = editor.getText();
    const hasRichContent = html.includes('<table') || html.includes('<img');
    const isEmpty = !text.trim() && !hasRichContent;

    // Пустой документ — сохраняем плейсхолдер, иначе текст + html.
    onCommit(isEmpty ? '' : html, isEmpty ? '' : text);
    onClose();
  }, [editor, onCommit, onClose, baseHtml, innerWidth]);

  /* Escape → commit */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCommit();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleCommit]);

  /* Клик вне оверлея и тулбара → commit */
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (overlayRef.current?.contains(target)) return;
      if (toolbarRef.current?.contains(target)) return;
      if (target.closest('.rt-popover')) return;
      handleCommit();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onMouseDown), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [handleCommit]);

  /* Позиция тулбара — fixed поверх, над элементом */
  useLayoutEffect(() => {
    const updatePos = () => {
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      let top = rect.top - TOOLBAR_HEIGHT - TOOLBAR_GAP;
      if (top < 8) top = 8;

      let left = Math.max(16, rect.left);
      const toolbarWidth = toolbarRef.current?.offsetWidth || 800;
      if (left + toolbarWidth > window.innerWidth - 16) {
        left = window.innerWidth - toolbarWidth - 16;
      }
      setToolbarPos({ top, left });
    };

    updatePos();
    const canvasArea = overlayRef.current?.closest('.canvas-area');
    if (canvasArea) {
      canvasArea.addEventListener('scroll', updatePos, { passive: true });
    }
    window.addEventListener('resize', updatePos);

    return () => {
      if (canvasArea) {
        canvasArea.removeEventListener('scroll', updatePos);
      }
      window.removeEventListener('resize', updatePos);
    };
  }, [zoom, element.x, element.y, element.width, element.height]);

  if (!editor) return null;

  const currentColor = editor.getAttributes('textStyle').color || element.fill || '#000000';
  const currentHighlight = editor.getAttributes('highlight').color || null;
  const currentFontSize = (editor.getAttributes('textStyle').fontSize || `${element.fontSize}px`).replace('px', '');

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.x * zoom,
    top: element.y * zoom,
    width: element.width,
    minHeight: element.height,
    transform: `scale(${zoom})`,
    transformOrigin: 'top left',
    zIndex: 100,
    background: '#ffffff',
    boxShadow: '0 0 0 2px #6366f1, 0 4px 16px rgba(15, 23, 42, 0.15)',
    borderRadius: 2,
  };

  const contentStyle: React.CSSProperties = {
    width: innerWidth,
    minHeight: Math.max(20, element.height - element.padding.top - element.padding.bottom),
    marginLeft: element.padding.left,
    marginTop: element.padding.top,
    marginRight: element.padding.right,
    marginBottom: element.padding.bottom,
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    lineHeight: element.lineHeight,
    color: element.fill,
    outline: 'none',
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
    textAlign: element.align,
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    top: toolbarPos.top,
    left: toolbarPos.left,
    zIndex: 9998,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
    maxWidth: 'calc(100vw - 32px)',
  };

  return (
    <>
      <div ref={overlayRef} style={overlayStyle}>
        <div style={contentStyle}>
          <EditorContent editor={editor} className="rt-editor-content" />
        </div>
      </div>

      <div ref={toolbarRef} className="rt-toolbar" style={toolbarStyle}>
        <div className="rt-group">
          <select
            className="rt-select"
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1'
                : editor.isActive('heading', { level: 2 }) ? 'h2'
                : editor.isActive('heading', { level: 3 }) ? 'h3'
                : 'p'
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'p') editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: +v[1] as 1 | 2 | 3 }).run();
            }}
          >
            <option value="p">Обычный</option>
            <option value="h1">Заголовок 1</option>
            <option value="h2">Заголовок 2</option>
            <option value="h3">Заголовок 3</option>
          </select>
          <select
            className="rt-select"
            value={editor.getAttributes('textStyle').fontFamily || element.fontFamily}
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            className="rt-select" style={{ width: 60 }}
            value={currentFontSize}
            onChange={(e) => editor.chain().focus().setFontSize(`${e.target.value}px`).run()}
          >
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="rt-sep" />
        <div className="rt-group">
          <button
            type="button"
            className={`rt-btn ${editor.isActive('bold') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Жирный"
          ><b>B</b></button>
          <button
            type="button"
            className={`rt-btn ${editor.isActive('italic') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Курсив"
          ><i>I</i></button>
          <button
            type="button"
            className={`rt-btn ${editor.isActive('underline') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Подчёркнутый"
          ><u>U</u></button>
          <button
            type="button"
            className={`rt-btn ${editor.isActive('strike') ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Зачёркнутый"
          ><s>S</s></button>
        </div>

        <div className="rt-sep" />
        <div className="rt-popover-wrap">
          <button type="button" className="rt-btn" title="Цвет текста"
            onMouseDown={(e) => { e.preventDefault(); setPop((p) => (p === 'color' ? null : 'color')); }}>
            <span className="rt-letter" style={{ borderBottomColor: currentColor }}>A</span>
          </button>
          {pop === 'color' && (
            <ColorPickerPopover
              title="Цвет текста"
              colors={TEXT_COLORS.flat()}
              onPick={(c) => { editor.chain().focus().setColor(c).run(); setPop(null); }}
              onReset={() => { editor.chain().focus().unsetColor().run(); setPop(null); }}
            />
          )}
        </div>
        <div className="rt-popover-wrap">
          <button type="button" className="rt-btn" title="Фон текста"
            onMouseDown={(e) => { e.preventDefault(); setPop((p) => (p === 'bg' ? null : 'bg')); }}>
            <span className="rt-letter rt-bg-letter" style={{ background: currentHighlight || 'transparent', borderBottomColor: currentHighlight || '#9ca3af' }}>A</span>
          </button>
          {pop === 'bg' && (
            <ColorPickerPopover
              title="Фон текста"
              colors={BG_COLORS.flat()}
              onPick={(c) => { editor.chain().focus().setHighlight({ color: c }).run(); setPop(null); }}
              onReset={() => { editor.chain().focus().unsetHighlight().run(); setPop(null); }}
            />
          )}
        </div>

        <div className="rt-sep" />
        <div className="rt-group">
          <button type="button" className={`rt-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="По левому краю">◧</button>
          <button type="button" className={`rt-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="По центру">◫</button>
          <button type="button" className={`rt-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="По правому краю">◨</button>
          <button type="button" className={`rt-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="По ширине">☰</button>
        </div>

        <div className="rt-sep" />
        <div className="rt-group">
          <button type="button" className={`rt-btn ${editor.isActive('bulletList') ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Маркированный список">• Список</button>
          <button type="button" className={`rt-btn ${editor.isActive('orderedList') ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Нумерованный список">1. Список</button>
        </div>

        <div className="rt-sep" />
        <div className="rt-group">
          <button type="button" className="rt-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().outdent().run()} title="Уменьшить отступ">← Отступ</button>
          <button type="button" className="rt-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().indent().run()} title="Увеличить отступ">→ Отступ</button>
        </div>

        <TableOperationsToolbar editor={editor} />

        <div className="rt-sep" />
        <div className="rt-group">
          <button
            type="button"
            className="rt-btn primary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCommit}
            title="Готово (Escape)"
          >✓ Готово</button>
        </div>
      </div>
    </>
  );
};