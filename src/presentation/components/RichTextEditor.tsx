import React, { useCallback, useEffect, useRef, useState } from 'react';
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

// Gapcursor входит в StarterKit (v2.6.6) — явная регистрация даёт
// warning "Duplicate extension names found: ['gapCursor']".
// Поэтому импорт и регистрация убраны.

import { FontSize, CustomTableCell, CustomTableHeader, Indent } from './richText/extensions';
import { ColorPickerPopover } from './richText/ColorPickerPopover';
import { TableOperationsToolbar } from './richText/TableOperationsToolbar';
import { TEXT_COLORS, BG_COLORS, FONT_SIZES, FONT_FAMILIES } from './richText/palettes';

interface Props {
  isOpen: boolean;
  initialHtml: string;
  onClose: () => void;
  onSave: (html: string) => void;
}

type PopKind = null | 'color' | 'bg';

interface BtnProps {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}

/**
 * Кнопка тулбара вынесена из тела компонента — иначе React
 * видит новый компонент на каждый рендер и пересоздаёт DOM
 * (теряется фокус у соседних кнопок).
 */
const Btn: React.FC<BtnProps> = ({ onClick, active, title, children }) => (
  <button
    type="button"
    className={`rt-btn ${active ? 'active' : ''}`}
    onClick={onClick}
    title={title}
  >
    {children}
  </button>
);

export const RichTextEditor: React.FC<Props> = ({ isOpen, initialHtml, onClose, onSave }) => {
  const [pop, setPop] = useState<PopKind>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const isPlaceholder = initialHtml.includes('Введите текст') || !initialHtml.trim();
  let cleanHtml = isPlaceholder ? '<p></p>' : initialHtml;

  if (cleanHtml.includes('<table')) {
    if (!cleanHtml.startsWith('<p>') && !cleanHtml.startsWith('<div>')) {
      cleanHtml = '<p><br></p>' + cleanHtml;
    }
    if (!cleanHtml.endsWith('</p>') && !cleanHtml.endsWith('</div>')) {
      cleanHtml += '<p><br></p>';
    }
  }

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
    content: cleanHtml,
  });

  useEffect(() => {
    if (isOpen && editor) {
      editor.commands.setContent(cleanHtml);
      setTimeout(() => {
        try {
          editor.commands.focus('end');
        } catch {
          /* noop: фокус не критичен, если editor размонтирован */
        }
      }, 50);
    }
  }, [isOpen, cleanHtml, editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setPop(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    const isEmpty = html === '<p></p>' || html === '<p><br></p>';
    onSave(isEmpty ? '' : html);
    onClose();
  }, [editor, onSave, onClose]);

  if (!isOpen || !editor) return null;

  const currentFontSize = (editor.getAttributes('textStyle').fontSize || '16px').replace('px', '');
  const currentColor = editor.getAttributes('textStyle').color || '#000000';
  const currentHighlight = editor.getAttributes('highlight').color || null;

  return (
    <div className="rt-modal-backdrop" onMouseDown={handleSave}>
      <div className="rt-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="rt-header">
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
              value={editor.getAttributes('textStyle').fontFamily || 'Arial'}
              onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select
              className="rt-select"
              style={{ width: 60 }}
              value={currentFontSize}
              onChange={(e) => editor.chain().focus().setFontSize(`${e.target.value}px`).run()}
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="rt-sep" />
          <div className="rt-group">
            <Btn
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Жирный"
            ><b>B</b></Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Курсив"
            ><i>I</i></Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="Подчёркнутый"
            ><u>U</u></Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Зачёркнутый"
            ><s>S</s></Btn>
          </div>

          <div className="rt-sep" />
          <div className="rt-popover-wrap">
            <button
              type="button"
              className="rt-btn"
              title="Цвет текста"
              onMouseDown={(e) => { e.preventDefault(); setPop((p) => (p === 'color' ? null : 'color')); }}
            >
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
            <button
              type="button"
              className="rt-btn"
              title="Фон текста"
              onMouseDown={(e) => { e.preventDefault(); setPop((p) => (p === 'bg' ? null : 'bg')); }}
            >
              <span
                className="rt-letter rt-bg-letter"
                style={{
                  background: currentHighlight || 'transparent',
                  borderBottomColor: currentHighlight || '#9ca3af',
                }}
              >A</span>
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
            <Btn
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              active={editor.isActive({ textAlign: 'left' })}
              title="По левому краю"
            >◧</Btn>
            <Btn
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              active={editor.isActive({ textAlign: 'center' })}
              title="По центру"
            >◫</Btn>
            <Btn
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              active={editor.isActive({ textAlign: 'right' })}
              title="По правому краю"
            >◨</Btn>
            <Btn
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              active={editor.isActive({ textAlign: 'justify' })}
              title="По ширине"
            >☰</Btn>
          </div>

          <div className="rt-sep" />
          <div className="rt-group">
            <Btn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Маркированный список"
            >• Список</Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Нумерованный список"
            >1. Список</Btn>
          </div>

          <div className="rt-sep" />
          <div className="rt-group">
            <Btn
              onClick={() => editor.chain().focus().outdent().run()}
              title="Уменьшить отступ"
            >← Отступ</Btn>
            <Btn
              onClick={() => editor.chain().focus().indent().run()}
              title="Увеличить отступ"
            >→ Отступ</Btn>
          </div>

          <TableOperationsToolbar editor={editor} />
        </div>

        <div className="rt-content-wrapper">
          <EditorContent editor={editor} className="rt-editor-content" />
        </div>
      </div>
    </div>
  );
};