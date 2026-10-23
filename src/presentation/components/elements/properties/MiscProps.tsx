import React from 'react';
import type { 
  LineElement, ImageElement, FooterElement, PlaceholderElement, 
  FillElement, ConnectorElement, StampElement, DiagramElement 
} from '@/shared/types';
import { Group, L, inputStyle, normalizeColor } from './ui';
import { useModalsStore } from '../../../providers/EditorProvider';

export const LineProps: React.FC<{ el: LineElement; update: (p: Partial<LineElement>) => void }> = ({ el, update }) => (
  <Group title="Линия">
    <L label="Цвет"><input style={inputStyle} type="color" value={normalizeColor(el.stroke)} onChange={(e) => update({ stroke: e.target.value })} /></L>
    <L label="Толщина"><input style={inputStyle} type="number" min={1} value={el.strokeWidth} onChange={(e) => update({ strokeWidth: +e.target.value })} /></L>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
      <input type="checkbox" checked={el.isArrow} onChange={(e) => update({ isArrow: e.target.checked })} /> Стрелка
    </label>
  </Group>
);

export const ImageProps: React.FC<{ el: ImageElement; update: (p: Partial<ImageElement>) => void }> = ({ el }) => (
  <Group title="Изображение">
    <img src={el.src} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', background: '#f8fafc', borderRadius: 4 }} />
  </Group>
);

export const FooterProps: React.FC<{ el: FooterElement; update: (p: Partial<FooterElement>) => void }> = ({ el, update }) => (
  <Group title="Футер">
    <L label="Текст"><textarea style={{ ...inputStyle, minHeight: 50 }} value={el.text} onChange={(e) => update({ text: e.target.value })} /></L>
    <L label="Цвет текста"><input style={inputStyle} type="color" value={normalizeColor(el.fill)} onChange={(e) => update({ fill: e.target.value })} /></L>
    <L label="Цвет фона"><input style={inputStyle} type="color" value={normalizeColor(el.bgColor)} onChange={(e) => update({ bgColor: e.target.value })} /></L>
  </Group>
);

export const PlaceholderProps: React.FC<{ el: PlaceholderElement; update: (p: Partial<PlaceholderElement>) => void }> = ({ el, update }) => (
  <Group title="Плейсхолдер">
    <L label="Путь к полю"><input style={inputStyle} value={el.fieldPath} onChange={(e) => update({ fieldPath: e.target.value, label: e.target.value })} /></L>
    <L label="Тип">
      <select style={inputStyle} value={el.fieldType} onChange={(e) => update({ fieldType: e.target.value as any })}>
        <option value="string">Строка</option>
        <option value="number">Число</option>
        <option value="date">Дата</option>
        <option value="boolean">Да/Нет</option>
        <option value="image">Изображение</option>
      </select>
    </L>
  </Group>
);

export const FillProps: React.FC<{ el: FillElement; update: (p: Partial<FillElement>) => void }> = ({ el, update }) => (
  <Group title="Заливка">
    <L label="Цвет"><input style={inputStyle} type="color" value={normalizeColor(el.fill)} onChange={(e) => update({ fill: e.target.value })} /></L>
    <L label="Прозрачность"><input style={inputStyle} type="number" min={0} max={1} step={0.1} value={el.opacity} onChange={(e) => update({ opacity: +e.target.value })} /></L>
  </Group>
);

export const ConnectorProps: React.FC<{ el: ConnectorElement; update: (p: Partial<ConnectorElement>) => void }> = ({ el, update }) => (
  <Group title="Коннектор">
    <L label="Цвет"><input style={inputStyle} type="color" value={normalizeColor(el.stroke)} onChange={(e) => update({ stroke: e.target.value })} /></L>
    <L label="Толщина"><input style={inputStyle} type="number" min={1} value={el.strokeWidth} onChange={(e) => update({ strokeWidth: +e.target.value })} /></L>
    <L label="Форма">
      <select style={inputStyle} value={el.routing} onChange={(e) => update({ routing: e.target.value as any })}>
        <option value="orthogonal">Ортогональный (с обходами)</option>
        <option value="straight">Прямой (по диагонали)</option>
      </select>
    </L>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
      <input type="checkbox" checked={el.isArrow} onChange={(e) => update({ isArrow: e.target.checked })} /> Стрелка
    </label>
  </Group>
);

export const StampProps: React.FC<{ el: StampElement }> = ({ el }) => {
  const modalsStore = useModalsStore();
  return (
    <Group title="Штамп">
      <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
        {(el.shapes?.length ?? 0)} фигур · {(el.texts?.length ?? 0)} текстов · {(el.images?.length ?? 0)} картинок
      </p>
      <button type="button" style={{ ...inputStyle, cursor: 'pointer', marginTop: 6 }} onClick={() => modalsStore.openStampEditor(el.id)}>
        Открыть редактор штампа
      </button>
    </Group>
  );
};

export const DiagramProps: React.FC<{ el: DiagramElement }> = ({ el }) => {
  const modalsStore = useModalsStore();
  return (
    <Group title="Диаграмма">
      <button type="button" style={{ ...inputStyle, cursor: 'pointer' }} onClick={() => modalsStore.openDiagramEditor(el.id)}>
        Открыть draw.io
      </button>
    </Group>
  );
};