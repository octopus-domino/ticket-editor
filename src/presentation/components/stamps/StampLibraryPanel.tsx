import React, { useState, useMemo } from 'react';
import type { StampShape, StampShapeItem, StampTextItem, StampImageItem } from '@/shared/types';
import {
  getAllStamps, addCustomStamp, updateCustomStamp, removeCustomStamp, isBuiltinStamp, forkStampAsCustom, type StampTemplate,
} from '@/lib/stamps/library';
import { newStampFromTemplate, newLegacyStamp } from '@/lib/stamps/factories';
import { StampEditor } from './StampEditor';
import { useDocumentStore, useSelectionStore } from '../../providers/EditorProvider';

const LEGACY_QUICK: { shape: StampShape; label: string; icon: string }[] = [
  { shape: 'circle',   label: 'Круглая',       icon: '⬤' },
  { shape: 'oval',     label: 'Овал',          icon: '⬭' },
  { shape: 'rect',     label: 'Прямоугольная', icon: '▭' },
  { shape: 'triangle', label: 'Треугольная',   icon: '△' },
];

interface EditorState {
  mode: 'create' | 'edit'; sourceId?: string; sourceIsBuiltin?: boolean; customId?: string;
  width: number; height: number; shapes: StampShapeItem[]; texts: StampTextItem[]; images: StampImageItem[]; name?: string;
}

function toDragPayload(tpl: StampTemplate) {
  return JSON.stringify({ kind: 'stamp-template', template: { id: tpl.id, name: tpl.name, description: tpl.description, icon: tpl.icon, width: tpl.width, height: tpl.height, shapes: tpl.shapes, texts: tpl.texts, images: tpl.images || [] } });
}

export const StampLibraryPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const [version, setVersion] = useState(0);
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  const stamps = useMemo(() => {
  // `version` — cache-buster: после add/remove/update custom stamp
  // localStorage меняется, useMemo должен пересчитать.
  void version;
  return getAllStamps();
}, [version]);
  const generalStamps = useMemo(() => stamps.filter((s) => !s.custom && !s.banking), [stamps]);
  const bankingStamps = useMemo(() => stamps.filter((s) => !s.custom && s.banking), [stamps]);
  const customStamps  = useMemo(() => stamps.filter((s) => s.custom), [stamps]);

  const addElement = (el: StampShapeItem | StampTextItem | StampImageItem | any) => {
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (s) s.elements.push(el);
    }, 'add-stamp-element');
    selStore.select(el.id);
  };

  const applyStamp = (tpl: StampTemplate) => addElement(newStampFromTemplate(tpl, 200, 200));
  const addLegacy = (shape: StampShape) => addElement(newLegacyStamp(shape, 200, 200));

  const openNew = () => { setEditorState({ mode: 'create', width: 200, height: 200, shapes: [], texts: [], images: [], name: 'Мой штамп' }); };
  const openEdit = (tpl: StampTemplate) => {
    const builtin = isBuiltinStamp(tpl.id);
    setEditorState({ mode: 'edit', sourceId: tpl.id, sourceIsBuiltin: builtin, customId: builtin ? undefined : tpl.id, width: tpl.width, height: tpl.height, shapes: JSON.parse(JSON.stringify(tpl.shapes)), texts: JSON.parse(JSON.stringify(tpl.texts)), images: JSON.parse(JSON.stringify(tpl.images || [])), name: tpl.name });
  };

  const handleSave = (data: { name: string; width: number; height: number; shapes: StampShapeItem[]; texts: StampTextItem[]; images: StampImageItem[]; }) => {
    if (!editorState) return;
    if (editorState.mode === 'edit') {
      if (editorState.sourceIsBuiltin) {
        const source = stamps.find((s) => s.id === editorState.sourceId);
        if (source) addCustomStamp(forkStampAsCustom({ ...source, name: data.name, width: data.width, height: data.height, shapes: data.shapes, texts: data.texts, images: data.images }));
      } else if (editorState.customId) {
        updateCustomStamp(editorState.customId, { name: data.name, width: data.width, height: data.height, shapes: data.shapes, texts: data.texts, images: data.images });
      }
      setVersion((v) => v + 1); setEditorState(null); return;
    }
    const tpl: StampTemplate = { id: `custom-${Date.now()}`, name: data.name, icon: '🖼', width: data.width, height: data.height, shapes: data.shapes, texts: data.texts, images: data.images, custom: true };
    addCustomStamp(tpl); setVersion((v) => v + 1); setEditorState(null); addElement(newStampFromTemplate(tpl, 200, 200));
  };

  const deleteStamp = (tpl: StampTemplate) => {
    if (!tpl.custom) return;
    if (!window.confirm(`Удалить штамп «${tpl.name}»?`)) return;
    removeCustomStamp(tpl.id); setVersion((v) => v + 1);
  };

  const renderItem = (s: StampTemplate, opts: { editable: boolean; deletable: boolean }) => (
    <div key={s.id} style={{ position: 'relative' }}>
      <button className="tool-tile" title={s.description || s.name} draggable onDragStart={(e) => { e.dataTransfer.setData('application/json', toDragPayload(s)); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => applyStamp(s)} style={{ width: '100%' }}>
        <span className="tile-ico">{s.icon || '🖼'}</span><span>{s.name}</span>
      </button>
      {opts.editable && <button title="Редактировать" onClick={(e) => { e.stopPropagation(); openEdit(s); }} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, padding: 0, fontSize: 10, lineHeight: '16px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer' }}>✎</button>}
      {opts.deletable && <button title="Удалить" onClick={(e) => { e.stopPropagation(); deleteStamp(s); }} style={{ position: 'absolute', top: 2, right: 22, width: 18, height: 18, padding: 0, fontSize: 11, lineHeight: '16px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--panel)', color: 'var(--danger, #ef4444)', cursor: 'pointer' }}>×</button>}
    </div>
  );

  return (
    <>
      <label className="field-label">Быстрые (устаревшие)</label>
      <div className="tool-grid">{LEGACY_QUICK.map((q) => <button key={q.shape} className="tool-tile" onClick={() => addLegacy(q.shape)}><span className="tile-ico">{q.icon}</span><span>{q.label}</span></button>)}</div>
      <label className="field-label" style={{ marginTop: 10 }}>Встроенные</label>
      <div className="tool-grid">{generalStamps.map((s) => renderItem(s, { editable: true, deletable: false }))}</div>
      <label className="field-label" style={{ marginTop: 10 }}>Банковские</label>
      <div className="tool-grid">{bankingStamps.map((s) => renderItem(s, { editable: true, deletable: false }))}</div>
      <label className="field-label" style={{ marginTop: 10 }}>Мои штампы</label>
      <div className="tool-grid">
        {customStamps.map((s) => renderItem(s, { editable: true, deletable: true }))}
        {customStamps.length === 0 && <p className="hint-sm" style={{ gridColumn: '1 / -1', margin: 0 }}>Пока пусто.</p>}
      </div>
      <button className="tool-btn" style={{ marginTop: 8 }} onClick={openNew}>+ Создать штамп…</button>
      {editorState && <StampEditor initialWidth={editorState.width} initialHeight={editorState.height} initialShapes={editorState.shapes} initialTexts={editorState.texts} initialImages={editorState.images} initialName={editorState.name} onSave={handleSave} onCancel={() => setEditorState(null)} />}
    </>
  );
};