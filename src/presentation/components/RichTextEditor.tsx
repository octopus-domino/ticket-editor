import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { FontSize, CustomTableCell, CustomTableHeader, Indent } from './richText/extensions';
import { ColorPickerPopover } from './richText/ColorPickerPopover';
import { TableOperationsToolbar } from './richText/TableOperationsToolbar';
import { TEXT_COLORS, BG_COLORS, FONT_SIZES, FONT_FAMILIES } from './richText/palettes';
import { serializeRichHtml, normalizeTableWidthsInHtml } from '@/lib/richText/tableSync';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { useLiveHtml } from '../hooks/useLiveHtml';
import type { Padding } from '@/shared/types';

/**
 * Максимальная визуальная ширина страницы внутри модала. Если
 * innerWidth * zoom больше — ужимаем через transform: scale, чтобы
 * модал не расползся на несколько экранов. Layout при этом остаётся
 * innerWidth → переносы строк и пропорции совпадают с канвой.
 */
const MAX_MODAL_CONTENT_WIDTH = 1400;
/** Минимальный отступ вокруг страницы. */
const MODAL_PADDING = 48;
/** Минимальная ширина модала — чтобы тулбар влезал в одну строку. */
const MIN_MODAL_WIDTH = 600;
/** Отступы от краёв вьюпорта. */
const MODAL_VIEWPORT_MARGIN = 32;

interface Props {
  isOpen: boolean;
  initialHtml: string;
  /** bbox.width элемента на канве (без учёта zoom). */
  contentWidth: number;
  /** padding элемента. */
  padding: Padding;
  /** Шрифтовые атрибуты элемента. */
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fill: string;
  /** Текущий зум холста. Влияет на визуальный масштаб страницы. */
  zoom: number;
  onClose: () => void;
  onSave: (html: string) => void;
  onChange?: (html: string) => void;
}

type PopKind = null | 'color' | 'bg';

interface BtnProps {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}

const Btn: React.FC<BtnProps> = ({ onClick, active, title, children }) => (
  <button
    type="button"
    className={`rt-btn ${active ? 'active' : ''}`}
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault()}
    title={title}
  >
    {children}
  </button>
);

export const RichTextEditor: React.FC<Props> = ({
  isOpen,
  initialHtml,
  contentWidth,
  padding,
  fontFamily,
  fontSize,
  lineHeight,
  fill,
  zoom,
  onClose,
  onSave,
  onChange,
}) => {
  const [pop, setPop] = useState<PopKind>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { position, onHeaderMouseDown } = useDraggableModal();

  const innerWidth = Math.max(40, contentWidth - padding.left - padding.right);

  /*
   * Обработка initialHtml ДО создания редактора:
   *   • placeholder → пустой абзац
   *   • оборачиваем таблицу в <p> сверху и снизу (требование TipTap)
   *   • нормализуем ширины таблиц под innerWidth
   */
  const processedHtml = useMemo(() => {
    const isPlaceholder = initialHtml.includes('Введите текст') || !initialHtml.trim();
    let cleanHtml = isPlaceholder ? '<p></p>' : initialHtml;

    if (cleanHtml.includes('<table')) {
      if (!cleanHtml.startsWith('<p>') && !cleanHtml.startsWith('<div>')) {
        cleanHtml = '<p><br></p>' + cleanHtml;
      }
      if (!cleanHtml.endsWith('</p>') && !cleanHtml.endsWith('</div>')) {
        cleanHtml += '<p><br></p>';
      }
      cleanHtml = normalizeTableWidthsInHtml(cleanHtml, innerWidth);
    }
    return cleanHtml;
  }, [initialHtml, innerWidth]);

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
    if (isOpen && editor) {
      editor.commands.setContent(processedHtml);
      setTimeout(() => {
        try { editor.commands.focus('end'); } catch { /* noop */ }
      }, 50);
    }
  }, [isOpen, processedHtml, editor]);

  useLiveHtml({
    editor,
    onChange: onChange ?? (() => undefined),
    enabled: isOpen && !!onChange,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setPop(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = useCallback(() => {
    if (!editor) return;

    let html = '';
    try {
      const raw = editor.getHTML();
      html = raw.includes('<table') ? serializeRichHtml(editor.view.dom, raw) : raw;
    } catch (err) {
      console.error('[RichTextEditor] serialization failed:', err);
      html = initialHtml;
    }

    const hadTable = initialHtml.includes('<table');
    const hasTable = html.includes('<table');
    if (hadTable && !hasTable) {
      const stripped = html.replace(/<[^>]+>/g, '').replace(/[\s\u00A0\u200B]/g, '');
      if (!stripped) html = initialHtml;
    }

    if (html.includes('<table') && /<\/table>\s*$/.test(html)) {
      html += '<p><br></p>';
    }

    const isEmpty = !html || html === '<p></p>' || html === '<p><br></p>';
    onSave(isEmpty ? '' : html);
    onClose();
  }, [editor, onSave, onClose, initialHtml]);

  /*
   * Визуальный масштаб страницы:
   *   • при zoom = 1 и innerWidth ≤ MAX — scale = 1 (норма);
   *   • при zoom = 2 и innerWidth ≤ MAX/2 — scale = 2 (крупнее, как на канве);
   *   • при zoom = 0.5 — scale = 0.5 (мельче, как на канве);
   *   • если innerWidth * zoom > MAX — ограничиваем сверху,
   *     чтобы модал не расползся за экран.
   *
   * Layout остаётся `innerWidth` CSS-пикселей. Transform scale только
   * визуально увеличивает. Переносы строк, ширины колонок, размеры
   * шрифтов — 1:1 с тем, что видит Konva при данном zoom.
   */
  const maxAllowedScale = MAX_MODAL_CONTENT_WIDTH / innerWidth;
  const visualScale = Math.min(zoom, maxAllowedScale);
  const visualWidth = innerWidth * visualScale;

  const modalWidth = Math.min(
    Math.max(MIN_MODAL_WIDTH, visualWidth + MODAL_PADDING * 2),
    window.innerWidth - MODAL_VIEWPORT_MARGIN * 2,
  );
  const modalHeight = Math.min(window.innerHeight * 0.9, 820);

  const pageStyle = useMemo<React.CSSProperties>(() => ({
    width: innerWidth,
    transform: visualScale !== 1 ? `scale(${visualScale})` : undefined,
    transformOrigin: 'top left',
    background: '#ffffff',
    boxShadow: '0 0 0 1px #e2e8f0, 0 4px 16px rgba(15, 23, 42, 0.08)',
    minHeight: 200,
    fontFamily,
    fontSize,
    lineHeight,
    color: fill,
  }), [innerWidth, visualScale, fontFamily, fontSize, lineHeight, fill]);

  if (!isOpen || !editor) return null;

  const currentFontSize = (editor.getAttributes('textStyle').fontSize || `${fontSize}px`).replace('px', '');
  const currentColor = editor.getAttributes('textStyle').color || fill || '#000000';
  const currentHighlight = editor.getAttributes('highlight').color || null;

  return (
    <div className="rt-modal-backdrop" onMouseDown={handleSave}>
      <div
        className="rt-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          width: modalWidth,
          height: modalHeight,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="rt-header"
          onMouseDown={onHeaderMouseDown}
          style={{ cursor: 'grab', userSelect: 'none' }}
        >
          <h3>Редактор текста</h3>
          <button type="button" className="rt-close" onClick={handleSave}>×</button>
        </div>

        <div className="rt-toolbar" ref={toolbarRef}>
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
              value={editor.getAttributes('textStyle').fontFamily || fontFamily}
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
            <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Жирный"><b>B</b></Btn>
            <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Курсив"><i>I</i></Btn>
            <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Подчёркнутый"><u>U</u></Btn>
            <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Зачёркнутый"><s>S</s></Btn>
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
            <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="По левому краю">◧</Btn>
            <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="По центру">◫</Btn>
            <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="По правому краю">◨</Btn>
            <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="По ширине">☰</Btn>
          </div>

          <div className="rt-sep" />
          <div className="rt-group">
            <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Маркированный список">• Список</Btn>
            <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Нумерованный список">1. Список</Btn>
          </div>

          <div className="rt-sep" />
          <div className="rt-group">
            <Btn onClick={() => editor.chain().focus().outdent().run()} title="Уменьшить отступ">← Отступ</Btn>
            <Btn onClick={() => editor.chain().focus().indent().run()} title="Увеличить отступ">→ Отступ</Btn>
          </div>

          <TableOperationsToolbar editor={editor} />
        </div>

        <div className="rt-content-wrapper">
          <div
            style={{
              width: visualWidth,
              flex: '0 0 auto',
            }}
          >
            <div
              className="rt-page"
              style={pageStyle}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  editor.chain().focus().run();
                }
              }}
            >
              <EditorContent editor={editor} className="rt-editor-content" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};