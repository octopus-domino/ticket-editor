// src/presentation/components/Editor.tsx
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CanvasElement,
  FooterElement,
  ShapeElement,
  TextElement,
  GroupElement,
} from '@/shared/types';
import { useStore } from '@/shared/store/store';
import { DocumentStore, type InitialDocument } from '@/infra/state/DocumentStore';
import { SelectionStore } from '../stores/SelectionStore';
import { ModalsStore } from '../stores/ModalsStore';
import { GraphicsStore } from '../stores/GraphicsStore';
import {
  EditorProvider,
  useDocumentStore,
  useModalsStore,
  useSelectionStore,
} from '../providers/EditorProvider';
import { useAutoFitZoom } from '../hooks/useAutoFitZoom';
import { useAutoSave, loadAutoSave, clearAutoSave, type AutoSaveData } from '../hooks/useAutoSave';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';
import { useEditingCommit } from '../hooks/editor/useEditingCommit';
import { useStampCommit } from '../hooks/editor/useStampCommit';
import { useDiagramCommit } from '../hooks/editor/useDiagramCommit';
import { useClipboardActions } from '../hooks/editor/useClipboardActions';
import { useStyleClipboard } from '../hooks/editor/useStyleClipboard';
import { Canvas } from './Canvas';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { Toolbar } from './Toolbar';
import { ZoomBar } from './ZoomBar';
import { SlidesBar } from './SlidesBar';
import { ContextMenu } from './ContextMenu';
import { FloatingProps } from './FloatingProps';
import { ErrorBoundary } from './ErrorBoundary';
import { MigrationBanner } from './MigrationBanner';
import { ConfirmDialog } from '@/presentation/components/dialog';
import { isFeatureEnabled } from '@/shared/flags';
import type { TextStylePatch } from './TextToolbar';
import { generateIdWithPrefix } from '@/shared/utils/id';
import { fixGroupBoundsInPlace } from '@/lib/migrations';
import { useDocumentPersistence } from '../hooks/editor/useDocumentPersistence';
import { authStore } from '@/auth/store';
import { resetFillRasterizer } from '@/lib/stamps/fillRasterizer';

const InlineEditorHost = lazy(() =>
  import('./InlineEditorHost').then((m) => ({ default: m.InlineEditorHost })),
);
const StampEditorHost = lazy(() =>
  import('./StampEditorHost').then((m) => ({ default: m.StampEditorHost })),
);
const DiagramEditorHost = lazy(() =>
  import('./DiagramEditorHost').then((m) => ({ default: m.DiagramEditorHost })),
);
const TextToolbar = lazy(() => import('./TextToolbar').then((m) => ({ default: m.TextToolbar })));

export type { EditorInitialDoc } from '@/shared/types/document';
import type { EditorInitialDoc } from '@/shared/types/document';

export interface EditorProps {
  documentId?: string;
  initialDoc?: EditorInitialDoc;
  onSave?: (state: EditorInitialDoc) => Promise<void>;
}

function buildTextPatch(patch: TextStylePatch): Partial<TextElement> {
  const out: Partial<TextElement> = {};
  if (patch.fontSize !== undefined) out.fontSize = patch.fontSize;
  if (patch.fontFamily !== undefined) out.fontFamily = patch.fontFamily;
  if (patch.fontStyle !== undefined) out.fontStyle = patch.fontStyle;
  if (patch.textDecoration !== undefined) out.textDecoration = patch.textDecoration;
  if (patch.fill !== undefined) out.fill = patch.fill;
  if (patch.align !== undefined) out.align = patch.align;
  return out;
}

function buildFooterPatch(patch: TextStylePatch): Partial<FooterElement> {
  const out: Partial<FooterElement> = {};
  if (patch.fontSize !== undefined) out.fontSize = patch.fontSize;
  if (patch.fill !== undefined) out.fill = patch.fill;
  return out;
}

function buildShapePatch(patch: TextStylePatch): Partial<ShapeElement> {
  const out: Partial<ShapeElement> = {};
  if (patch.fontSize !== undefined) out.fontSize = patch.fontSize;
  if (patch.fontFamily !== undefined) out.textFontFamily = patch.fontFamily;
  if (patch.fontStyle !== undefined) out.textFontStyle = patch.fontStyle;
  if (patch.textDecoration !== undefined) out.textDecoration = patch.textDecoration;
  if (patch.fill !== undefined) out.textFill = patch.fill;
  if (patch.align !== undefined) out.textAlign = patch.align;
  return out;
}

function applyTextStylePatch(el: CanvasElement, patch: TextStylePatch): Partial<CanvasElement> {
  if (el.type === 'text') return buildTextPatch(patch);
  if (el.type === 'footer') return buildFooterPatch(patch);
  if (el.type === 'shape') return buildShapePatch(patch);
  return {};
}

interface EditorLayoutProps {
  documentId: string;
  onSave?: (state: EditorInitialDoc) => Promise<void>;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({ onSave, documentId }) => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const modalsStore = useModalsStore();

  const slides = useStore(docStore, (s) => s.slides);
  const activeId = useStore(docStore, (s) => s.activeId);
  const data = useStore(docStore, (s) => s.data);
  const bindings = useStore(docStore, (s) => s.bindings);
  const selectedIds = useStore(selStore, (s) => s.selectedIds);
  const editing = useStore(modalsStore, (s) => s.editing);
  const floatingPos = useStore(modalsStore, (s) => s.floatingPos);
  const contextMenu = useStore(modalsStore, (s) => s.contextMenu);
  const stampEditorTarget = useStore(modalsStore, (s) => s.stampEditorTarget);
  const diagramEditorTarget = useStore(modalsStore, (s) => s.diagramEditorTarget);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [liveMessage, setLiveMessage] = useState('');
  const [pendingRestore, setPendingRestore] = useState<AutoSaveData | null>(null);

  // P1.4 — inline toast вместо alert()
  const [toastText, setToastText] = useState<string | null>(null);
  useEffect(() => {
    if (!toastText) return;
    const t = window.setTimeout(() => setToastText(null), 3500);
    return () => window.clearTimeout(t);
  }, [toastText]);

  useEffect(() => {
    if (onSave) return;
    const saved = loadAutoSave();
    if (saved) setPendingRestore(saved);
  }, [onSave]);

  const handleRestoreConfirm = useCallback(() => {
    if (!pendingRestore) return;
    docStore.commit((draft) => {
      draft.slides = pendingRestore.slides;
      draft.activeId = pendingRestore.activeSlideId || pendingRestore.slides[0].id;
      draft.data = pendingRestore.data;

      for (const slide of draft.slides) {
        fixGroupBoundsInPlace(slide.elements as any[]);
      }
    }, 'restore-autosave');
    clearAutoSave();
    setPendingRestore(null);
  }, [docStore, pendingRestore]);

  const handleRestoreCancel = useCallback(() => {
    clearAutoSave();
    setPendingRestore(null);
  }, []);

  useEffect(() => {
    docStore.fixAllGroupBounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSlide = slides.find((s) => s.id === activeId);

  useAutoFitZoom({
    wrapRef,
    slideWidth: activeSlide?.width ?? 0,
    slideHeight: activeSlide?.height ?? 0,
    setZoom,
  });

  useAutoSave(slides, data, activeId ?? null, !onSave);

  const persistence = useDocumentPersistence(
    `${authStore.getState().user?.id ?? 'local'}:${documentId}`,
    { slides, data, activeId, bindings },
    onSave,
  );

  const commitEditing = useEditingCommit(docStore);
  const commitStamp = useStampCommit(docStore);
  const commitDiagram = useDiagramCommit(docStore);

  const { copy, cut, paste, duplicate, copyAsJson, pasteFromJson } = useClipboardActions(
    docStore,
    selStore,
    modalsStore,
  );

  const { copyStyle, applyStyle } = useStyleClipboard(docStore, selStore, modalsStore);

  useEditorShortcuts({
    docStore,
    selStore,
    modalsStore,
    clipboardActions: { copy, cut, paste, duplicate },
  });

  useEffect(() => {
    if (!activeSlide) {
      setLiveMessage('');
      return;
    }
    const n = selectedIds.length;
    if (n === 0) setLiveMessage('Ничего не выбрано');
    else if (n === 1) setLiveMessage('Выбран 1 элемент');
    else setLiveMessage(`Выбрано ${n} элементов`);
  }, [selectedIds, activeSlide]);

  const handleToolbarChange = useCallback(
    (patch: TextStylePatch) => {
      if (!editing) return;
      modalsStore.setEditing({
        ...editing,
        ...(patch.fontSize !== undefined && { fontSize: patch.fontSize }),
        ...(patch.fontFamily !== undefined && { fontFamily: patch.fontFamily }),
        ...(patch.fontStyle !== undefined && { fontStyle: patch.fontStyle }),
        ...(patch.textDecoration !== undefined && {
          textDecoration: patch.textDecoration,
        }),
        ...(patch.fill !== undefined && { fill: patch.fill }),
        ...(patch.align !== undefined && { align: patch.align }),
      });

      docStore.commit((draft) => {
        const s = draft.slides.find((x) => x.id === draft.activeId);
        const el = s?.elements.find((e) => e.id === editing.id);
        if (!el) return;
        Object.assign(el, applyTextStylePatch(el, patch));
      }, `toolbar-${editing.id}`);
    },
    [editing, docStore, modalsStore],
  );

  const handleToolbarCommit = useCallback(() => {
    if (!editing) return;
    modalsStore.closeEditor();
  }, [editing, modalsStore]);

  const selectedElement = useMemo<CanvasElement | null>(
    () => activeSlide?.elements.find((e) => e.id === selectedIds[0]) ?? null,
    [activeSlide, selectedIds],
  );

  const stampElement = useMemo<CanvasElement | null>(() => {
    if (stampEditorTarget == null || !activeSlide) return null;
    return activeSlide.elements.find((e) => e.id === stampEditorTarget) ?? null;
  }, [stampEditorTarget, activeSlide]);

  const diagramElement = useMemo<CanvasElement | null>(() => {
    if (diagramEditorTarget == null || !activeSlide) return null;
    return activeSlide.elements.find((e) => e.id === diagramEditorTarget) ?? null;
  }, [diagramEditorTarget, activeSlide]);

  if (!activeSlide) {
    return <div style={{ padding: 40 }}>Нет активного слайда</div>;
  }

  const contextSelected = activeSlide.elements.filter((e) => selectedIds.includes(e.id));
  const hasStyleCopied = modalsStore.getStyleClipboard() != null;
  const canPaste = modalsStore.getClipboard().length > 0;
  const canPasteJson = !!modalsStore.getClipboardJson();

  const closeContextMenu = () => {
    modalsStore.setContextMenu(null);
    modalsStore.setFloatingPos(null);
  };

  const groupSelected = () => {
    const ids = selectedIds;
    if (ids.length < 2) return;
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (!s) return;
      const selected = s.elements.filter((e) => ids.includes(e.id));
      const minX = Math.min(...selected.map((e) => e.x));
      const minY = Math.min(...selected.map((e) => e.y));
      const maxX = Math.max(...selected.map((e) => e.x + e.width));
      const maxY = Math.max(...selected.map((e) => e.y + e.height));

      const group: GroupElement = {
        id: generateIdWithPrefix('group'),
        type: 'group',
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        rotation: 0,
        children: ids,
      };
      s.elements.push(group);
    }, 'group');

    setTimeout(() => {
      const newGroup = docStore
        .getState()
        .slides.find((x) => x.id === docStore.getState().activeId)
        ?.elements.slice(-1)[0];
      if (newGroup) selStore.setIds([newGroup.id]);
    }, 0);
    closeContextMenu();
  };

  const ungroupSelected = () => {
    const state = docStore.getState();
    const slide = state.slides.find((x) => x.id === state.activeId);
    if (!slide) return;
    const groupId = selectedIds.find((id) => {
      const el = slide.elements.find((e) => e.id === id);
      return el?.type === 'group';
    });
    if (!groupId) return;
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (!s) return;
      s.elements = s.elements.filter((e) => e.id !== groupId);
    }, 'ungroup');
    selStore.clear();
    closeContextMenu();
  };

  const moveLayer = (dir: 'forward' | 'backward' | 'front' | 'back', targetId?: string) => {
    const id = targetId || selectedIds[0];
    if (!id) return;
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (!s) return;
      const i = s.elements.findIndex((e) => e.id === id);
      if (i < 0) return;
      const el = s.elements[i];
      s.elements.splice(i, 1);
      if (dir === 'front') s.elements.push(el);
      else if (dir === 'back') s.elements.unshift(el);
      else if (dir === 'forward') s.elements.splice(Math.min(s.elements.length, i + 1), 0, el);
      else if (dir === 'backward') s.elements.splice(Math.max(0, i - 1), 0, el);
    }, `layer-${id}`);
  };

  const deleteSelected = () => {
    if (!selectedIds.length) return;
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (!s) return;
      s.elements = s.elements.filter((el) => {
        if (selectedIds.includes(el.id)) return false;
        if (
          el.type === 'connector' &&
          (selectedIds.includes(el.fromId) || selectedIds.includes(el.toId))
        )
          return false;
        return true;
      });
    }, 'delete');
    selStore.clear();
    closeContextMenu();
  };

  const updateSelected = (patch: Partial<CanvasElement>) => {
    if (!selectedElement) return;
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      const el = s?.elements.find((x) => x.id === selectedElement.id);
      if (el) Object.assign(el, patch);
    }, `update-${selectedElement.id}`);
  };

  const simpleTextEditing =
    !!editing && !editing.isRich && (editing.kind === 'text' || editing.kind === 'shape');
  const showStampEditor =
    !!stampElement && stampElement.type === 'stamp' && isFeatureEnabled('FEATURE_STAMP_EDITOR');
  const showDiagramEditor =
    !!diagramElement && diagramElement.type === 'diagram' && isFeatureEnabled('FEATURE_DIAGRAM');
  const showPlainInlineEditor = !!editing && !editing.isRich;

  return (
    <div className="editor-shell" role="application" aria-label="Редактор билетов">
      {isFeatureEnabled('FEATURE_SHOW_MIGRATION_BANNER') && (
        <MigrationBanner
          rollbackUrl={isFeatureEnabled('FEATURE_SHOW_ROLLBACK_BUTTON') ? '/?legacy=1' : undefined}
        />
      )}

      {onSave && (
        <div role="status" style={{ padding: '4px 12px' }}>
          {persistence.status}
          {persistence.error && (
            <>
              : {persistence.error}{' '}
              <button onClick={() => void persistence.retry()}>Retry save</button>
            </>
          )}
        </div>
      )}
      <Toolbar />
      <div className="editor-layout">
        <ErrorBoundary fallback={<div style={{ padding: 20 }}>Ошибка в левой панели</div>}>
          <LeftPanel />
        </ErrorBoundary>

        <main className="canvas-area" ref={wrapRef}>
          <ZoomBar
            zoom={zoom}
            onChange={setZoom}
            selectedCount={selectedIds.length}
            fillMode={modalsStore.getState().fillMode}
            dataHighlight={modalsStore.getState().dataHighlight}
            onToggleDataHighlight={() => modalsStore.toggleDataHighlight()}
          />
          <ErrorBoundary fallback={<div style={{ padding: 20 }}>Ошибка в холсте</div>}>
            <Canvas slide={activeSlide} zoom={zoom} onZoomChange={setZoom} wrapRef={wrapRef} />
          </ErrorBoundary>

          {simpleTextEditing && editing && (
            <Suspense fallback={null}>
              <TextToolbar
                x={editing.x}
                y={editing.y}
                elementHeight={editing.height}
                fontSize={editing.fontSize}
                fontFamily={editing.fontFamily}
                fontStyle={editing.fontStyle}
                textDecoration={editing.textDecoration}
                fill={editing.fill}
                align={editing.align}
                onChange={handleToolbarChange}
                onCommit={handleToolbarCommit}
              />
            </Suspense>
          )}
        </main>

        <ErrorBoundary fallback={<div style={{ padding: 20 }}>Ошибка в правой панели</div>}>
          <RightPanel />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div style={{ padding: 20 }}>Ошибка в панели слайдов</div>}>
          <SlidesBar />
        </ErrorBoundary>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elementId={contextMenu.elementId}
          selectedElements={contextSelected}
          onClose={closeContextMenu}
          onCut={() => {
            cut(contextSelected);
            closeContextMenu();
          }}
          onCopy={() => {
            copy(contextSelected);
            closeContextMenu();
          }}
          onPaste={() => {
            paste();
            closeContextMenu();
          }}
          onDuplicate={() => {
            duplicate(contextSelected);
            closeContextMenu();
          }}
          onDelete={deleteSelected}
          onBringToFront={() => {
            moveLayer('front', contextMenu.elementId || undefined);
            closeContextMenu();
          }}
          onBringForward={() => {
            moveLayer('forward', contextMenu.elementId || undefined);
            closeContextMenu();
          }}
          onSendBackward={() => {
            moveLayer('backward', contextMenu.elementId || undefined);
            closeContextMenu();
          }}
          onSendToBack={() => {
            moveLayer('back', contextMenu.elementId || undefined);
            closeContextMenu();
          }}
          onCopyStyle={() => {
            if (selectedElement) copyStyle(selectedElement);
            closeContextMenu();
          }}
          onApplyStyle={() => {
            applyStyle();
            closeContextMenu();
          }}
          onGroup={groupSelected}
          onUngroup={ungroupSelected}
          canPaste={canPaste}
          hasStyleCopied={hasStyleCopied}
          onCopyAsJson={() => {
            copyAsJson(contextSelected);
            closeContextMenu();
          }}
          onPasteFromJson={() => {
            const res = pasteFromJson();
            if (!res.ok) setToastText(res.error || 'Не удалось вставить JSON');
            closeContextMenu();
          }}
          canPasteJson={canPasteJson}
          onApplyClipByTop={() =>
            docStore.commit((draft) => {
              const slide = draft.slides.find((item) => item.id === draft.activeId);
              const selected = slide?.elements.filter((element) =>
                selectedIds.includes(element.id),
              );
              if (!selected || selected.length < 2) return;
              const clipper = selected[selected.length - 1];
              if (clipper.type !== 'shape') return;
              for (const element of selected.slice(0, -1)) element.clipPathId = clipper.id;
            })
          }
          onRemoveClip={() =>
            docStore.commit((draft) => {
              for (const slide of draft.slides)
                for (const element of slide.elements)
                  if (selectedIds.includes(element.id)) element.clipPathId = null;
            })
          }
          canClip={false}
          canRemoveClip={false}
        />
      )}

      {floatingPos && selectedElement && !editing && (
        <FloatingProps
          x={floatingPos.x}
          y={floatingPos.y}
          element={selectedElement}
          onUpdate={updateSelected}
          onClose={() => modalsStore.setFloatingPos(null)}
          onDelete={deleteSelected}
        />
      )}

      {showPlainInlineEditor && editing && (
        <ErrorBoundary fallback={<div style={{ padding: 20 }}>Ошибка в редакторе текста</div>}>
          <Suspense fallback={null}>
            <InlineEditorHost
              key={editing.id}
              editing={editing}
              onClose={() => modalsStore.closeEditor()}
              onCommit={(html, text) => {
                commitEditing(editing, html, text);
                modalsStore.closeEditor();
              }}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {showStampEditor && stampElement && stampElement.type === 'stamp' && (
        <ErrorBoundary fallback={<div style={{ padding: 20 }}>Ошибка в редакторе штампа</div>}>
          <Suspense fallback={null}>
            <StampEditorHost
              element={stampElement}
              onClose={() => modalsStore.closeStampEditor()}
              onSave={(patch) => {
                commitStamp(stampElement.id, patch);
                modalsStore.closeStampEditor();
              }}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {showDiagramEditor && diagramElement && diagramElement.type === 'diagram' && (
        <ErrorBoundary fallback={<div style={{ padding: 20 }}>Ошибка в редакторе диаграммы</div>}>
          <Suspense fallback={null}>
            <DiagramEditorHost
              element={diagramElement}
              onClose={() => modalsStore.closeDiagramEditor()}
              onSave={(patch) => {
                commitDiagram(diagramElement.id, patch);
                modalsStore.closeDiagramEditor();
              }}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {toastText && <div className="toast">{toastText}</div>}

      <ConfirmDialog
        isOpen={!!pendingRestore}
        title="Восстановить незавершённую сессию?"
        description={
          pendingRestore
            ? `Сессия от ${new Date(pendingRestore.savedAt).toLocaleString()}`
            : undefined
        }
        confirmLabel="Восстановить"
        cancelLabel="Отклонить"
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
      />

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </div>
  );
};

export const Editor: React.FC<EditorProps> = ({ documentId, initialDoc, onSave }) => {
  const stores = useMemo(
    () => {
      const initial: InitialDocument | undefined = initialDoc
        ? {
            slides: initialDoc.slides,
            data: initialDoc.data,
            activeId: initialDoc.activeId,
            bindings: initialDoc.bindings,
          }
        : undefined;
      return {
        document: new DocumentStore(initial),
        selection: new SelectionStore(),
        modals: new ModalsStore(),
        graphics: new GraphicsStore(),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentId],
  );

  // При unmount редактора (или смене документа) гасим fill-worker и чистим его кэш
  useEffect(() => {
    return () => {
      resetFillRasterizer();
    };
  }, [documentId]);

  return (
    <EditorProvider stores={stores}>
      <EditorLayout documentId={documentId ?? 'local'} onSave={onSave} />
    </EditorProvider>
  );
};
