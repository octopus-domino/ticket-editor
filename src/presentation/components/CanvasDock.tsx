import type { CanvasElement } from '@/shared/types';
import { t } from '@/shared/i18n';
import { newSimpleText, newShape, newLine } from '@/lib/factories';
import { useDocumentStore, useSelectionStore } from '../providers/EditorProvider';
import { canvasMode, useCanvasMode, toggleCanvasFullscreen } from '@/shared/mobile/canvasMode';
import { useStore } from '@/shared/store/store';
import './canvas-dock.css';
import { useEffect } from 'react';

export function CanvasDock({
  onTools,
  onGroup,
  onMenu,
}: {
  onTools(): void;
  onGroup(): void;
  onMenu(): void;
}) {
  const doc = useDocumentStore();
  const selection = useSelectionStore();
  const selected = useStore(selection, (state) => state.selectedIds);
  const mode = useCanvasMode();
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canvasMode.getState().fullscreen) toggleCanvasFullscreen();
    };
    const change = () => {
      if (!document.fullscreenElement)
        canvasMode.setState((value) => ({ ...value, fullscreen: false }));
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('fullscreenchange', change);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('fullscreenchange', change);
    };
  }, []);
  function add(element: CanvasElement) {
    doc.commit((draft) => {
      draft.slides.find((slide) => slide.id === draft.activeId)?.elements.push(element);
    });
    selection.setIds([element.id]);
  }
  return (
    <nav className="canvas-dock" aria-label={t('Canvas tools')}>
      <button
        type="button"
        title={t('Tool library')}
        aria-label={t('Tool library')}
        onClick={onTools}
      >
        ＋
      </button>
      <button
        type="button"
        title={t('Text')}
        aria-label={t('Text')}
        onClick={() => add(newSimpleText())}
      >
        T
      </button>
      <button
        type="button"
        title={t('Rectangle')}
        aria-label={t('Rectangle')}
        onClick={() => add(newShape('rect'))}
      >
        □
      </button>
      <button
        type="button"
        title={t('Circle')}
        aria-label={t('Circle')}
        onClick={() => add(newShape('circle'))}
      >
        ○
      </button>
      <button type="button" title={t('Line')} aria-label={t('Line')} onClick={() => add(newLine())}>
        ╱
      </button>
      <hr />
      <button
        type="button"
        title={t('Select multiple objects')}
        aria-label={t('Select multiple objects')}
        aria-pressed={mode.multiselect}
        onClick={() =>
          canvasMode.setState((value) => ({ ...value, multiselect: !value.multiselect }))
        }
      >
        ▱
      </button>
      <button
        type="button"
        title={t('Group')}
        aria-label={t('Group')}
        disabled={selected.length < 2}
        onClick={onGroup}
      >
        ▣
      </button>
      <button
        type="button"
        title={t('Object actions')}
        aria-label={t('Object actions')}
        onClick={onMenu}
      >
        ⋯
      </button>
      <hr />
      <button
        type="button"
        title={t(mode.fullscreen ? 'Exit full screen' : 'Full screen')}
        aria-label={t(mode.fullscreen ? 'Exit full screen' : 'Full screen')}
        onClick={(event) =>
          toggleCanvasFullscreen(event.currentTarget.closest<HTMLElement>('.editor-shell'))
        }
      >
        {mode.fullscreen ? '⊡' : '⛶'}
      </button>
    </nav>
  );
}
