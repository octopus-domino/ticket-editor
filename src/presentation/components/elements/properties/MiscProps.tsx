import { t as __tr } from '@/shared/i18n';
import React from 'react';
import type {
  LineElement,
  ImageElement,
  FooterElement,
  PlaceholderElement,
  FillElement,
  ConnectorElement,
  StampElement,
  DiagramElement,
  QrElement,
} from '@/shared/types';
import { Group, L, inputStyle, normalizeColor } from './ui';
import { useModalsStore } from '../../../providers/EditorProvider';

export const LineProps: React.FC<{
  el: LineElement;
  update: (p: Partial<LineElement>) => void;
}> = ({ el, update }) => (
  <Group title={__tr('Линия')}>
    <L label={__tr('Цвет')}>
      <input
        style={inputStyle}
        type="color"
        value={normalizeColor(el.stroke)}
        onChange={(e) => update({ stroke: e.target.value })}
      />
    </L>
    <L label={__tr('Толщина')}>
      <input
        style={inputStyle}
        type="number"
        min={1}
        value={el.strokeWidth}
        onChange={(e) => update({ strokeWidth: +e.target.value })}
      />
    </L>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
      <input
        type="checkbox"
        checked={el.isArrow}
        onChange={(e) => update({ isArrow: e.target.checked })}
      />{' '}
      {__tr('Стрелка')}
    </label>
  </Group>
);

export const ImageProps: React.FC<{
  el: ImageElement;
  update: (p: Partial<ImageElement>) => void;
}> = ({ el }) => (
  <Group title={__tr('Изображение')}>
    <img
      src={el.src}
      alt=""
      style={{
        width: '100%',
        maxHeight: 120,
        objectFit: 'contain',
        background: '#f8fafc',
        borderRadius: 4,
      }}
    />
  </Group>
);

export const FooterProps: React.FC<{
  el: FooterElement;
  update: (p: Partial<FooterElement>) => void;
}> = ({ el, update }) => (
  <Group title={__tr('Футер')}>
    <L label={__tr('Текст')}>
      <textarea
        style={{ ...inputStyle, minHeight: 50 }}
        value={el.text}
        onChange={(e) => update({ text: e.target.value })}
      />
    </L>
    <L label={__tr('Цвет текста')}>
      <input
        style={inputStyle}
        type="color"
        value={normalizeColor(el.fill)}
        onChange={(e) => update({ fill: e.target.value })}
      />
    </L>
    <L label={__tr('Цвет фона')}>
      <input
        style={inputStyle}
        type="color"
        value={normalizeColor(el.bgColor)}
        onChange={(e) => update({ bgColor: e.target.value })}
      />
    </L>
  </Group>
);

export const PlaceholderProps: React.FC<{
  el: PlaceholderElement;
  update: (p: Partial<PlaceholderElement>) => void;
}> = ({ el, update }) => (
  <Group title={__tr('Плейсхолдер')}>
    <L label={__tr('Путь к полю')}>
      <input
        style={inputStyle}
        value={el.fieldPath}
        onChange={(e) => update({ fieldPath: e.target.value, label: e.target.value })}
      />
    </L>
    <L label={__tr('Тип')}>
      <select
        style={inputStyle}
        value={el.fieldType}
        onChange={(e) => update({ fieldType: e.target.value as any })}
      >
        <option value="string">{__tr('Строка')}</option>
        <option value="number">{__tr('Число')}</option>
        <option value="date">{__tr('Дата')}</option>
        <option value="boolean">{__tr('Да/Нет')}</option>
        <option value="image">{__tr('Изображение')}</option>
      </select>
    </L>
  </Group>
);

export const FillProps: React.FC<{
  el: FillElement;
  update: (p: Partial<FillElement>) => void;
}> = ({ el, update }) => (
  <Group title={__tr('Заливка')}>
    <L label={__tr('Цвет')}>
      <input
        style={inputStyle}
        type="color"
        value={normalizeColor(el.fill)}
        onChange={(e) => update({ fill: e.target.value })}
      />
    </L>
    <L label={__tr('Прозрачность')}>
      <input
        style={inputStyle}
        type="number"
        min={0}
        max={1}
        step={0.1}
        value={el.opacity}
        onChange={(e) => update({ opacity: +e.target.value })}
      />
    </L>
  </Group>
);

export const ConnectorProps: React.FC<{
  el: ConnectorElement;
  update: (p: Partial<ConnectorElement>) => void;
}> = ({ el, update }) => (
  <Group title={__tr('Коннектор')}>
    <L label={__tr('Цвет')}>
      <input
        style={inputStyle}
        type="color"
        value={normalizeColor(el.stroke)}
        onChange={(e) => update({ stroke: e.target.value })}
      />
    </L>
    <L label={__tr('Толщина')}>
      <input
        style={inputStyle}
        type="number"
        min={1}
        value={el.strokeWidth}
        onChange={(e) => update({ strokeWidth: +e.target.value })}
      />
    </L>
    <L label={__tr('Форма')}>
      <select
        style={inputStyle}
        value={el.routing}
        onChange={(e) => update({ routing: e.target.value as any })}
      >
        <option value="orthogonal">{__tr('Ортогональный (с обходами)')}</option>
        <option value="straight">{__tr('Прямой (по диагонали)')}</option>
      </select>
    </L>
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
      <input
        type="checkbox"
        checked={el.isArrow}
        onChange={(e) => update({ isArrow: e.target.checked })}
      />{' '}
      {__tr('Стрелка')}
    </label>
  </Group>
);

export const StampProps: React.FC<{ el: StampElement }> = ({ el }) => {
  const modalsStore = useModalsStore();
  return (
    <Group title={__tr('Штамп')}>
      <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
        {el.shapes?.length ?? 0} {__tr('фигур ·')} {el.texts?.length ?? 0} {__tr('текстов ·')}{' '}
        {el.images?.length ?? 0} {__tr('картинок')}
      </p>
      <button
        type="button"
        style={{ ...inputStyle, cursor: 'pointer', marginTop: 6 }}
        onClick={() => modalsStore.openStampEditor(el.id)}
      >
        {__tr('Открыть редактор штампа')}
      </button>
    </Group>
  );
};

export const DiagramProps: React.FC<{ el: DiagramElement }> = ({ el }) => {
  const modalsStore = useModalsStore();
  return (
    <Group title={__tr('Диаграмма')}>
      <button
        type="button"
        style={{ ...inputStyle, cursor: 'pointer' }}
        onClick={() => modalsStore.openDiagramEditor(el.id)}
      >
        {__tr('Открыть draw.io')}
      </button>
    </Group>
  );
};

export const QrProps: React.FC<{ el: QrElement; update: (p: Partial<QrElement>) => void }> = ({
  el,
  update,
}) => (
  <Group title={__tr('QR-код')}>
    <L label={__tr('Алгоритм')}>
      <select
        style={inputStyle}
        value={el.format || 'QR'}
        onChange={(e) => update({ format: e.target.value as QrElement['format'] })}
      >
        <option value="QR">QR Code</option>
        <option value="DATA_MATRIX">Data Matrix</option>
        <option value="AZTEC">Aztec</option>
        <option value="PDF_417">PDF417</option>
      </select>
    </L>
    <L label={__tr('Текст / URL')}>
      <textarea
        style={{ ...inputStyle, minHeight: 80, fontFamily: 'monospace', fontSize: 11 }}
        value={el.text}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="https://example.com"
      />
    </L>
    <L label={__tr('Цвет кода')}>
      <input
        style={inputStyle}
        type="color"
        value={normalizeColor(el.fgColor)}
        onChange={(e) => update({ fgColor: e.target.value })}
      />
    </L>
    <L label={__tr('Цвет фона')}>
      <input
        style={inputStyle}
        type="color"
        value={normalizeColor(el.bgColor)}
        onChange={(e) => update({ bgColor: e.target.value })}
      />
    </L>
    <L label={__tr('Отступ (модули)')}>
      <input
        style={inputStyle}
        type="number"
        min={0}
        max={10}
        value={el.margin}
        onChange={(e) => update({ margin: Math.max(0, +e.target.value) })}
      />
    </L>
    <L label={__tr('Уровень коррекции')}>
      <select
        style={inputStyle}
        value={el.ecc}
        onChange={(e) => update({ ecc: e.target.value as QrElement['ecc'] })}
      >
        <option value="L">{__tr('L (низкий, ~7%)')}</option>
        <option value="M">{__tr('M (средний, ~15%)')}</option>
        <option value="Q">{__tr('Q (высокий, ~25%)')}</option>
        <option value="H">{__tr('H (максимум, ~30%)')}</option>
      </select>
    </L>
    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
      {__tr(
        'На канве отображается placeholder. Реальная картинка генерируется при экспорте SVG / PDF на сервере.',
      )}
    </p>
  </Group>
);
