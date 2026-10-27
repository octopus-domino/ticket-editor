import React from 'react';
import type {
  DashType, TextAlign, TextVerticalAlign, DataFieldType, Padding,
} from '../../types';
import { useSelectionContext } from '../../editor/contexts/SelectionContext';
import { useActionsContext } from '../../editor/contexts/ActionsContext';
import { useModalsContext } from '../../editor/contexts/ModalsContext';

const RotationControl: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <>
    <label>Поворот
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="range" min="-180" max="180" value={value}
          onChange={(e) => onChange(+e.target.value)} style={{ flex: 1, padding: 0 }} />
        <input type="number" min="-180" max="180" value={Math.round(value)}
          onChange={(e) => onChange(+e.target.value)} style={{ width: 64 }} />
        <span style={{ fontSize: 12, color: '#666' }}>°</span>
      </div>
    </label>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
      <button style={{ margin: 0 }} onClick={() => onChange(value - 90)}>−90°</button>
      <button style={{ margin: 0 }} onClick={() => onChange(0)}>0°</button>
      <button style={{ margin: 0 }} onClick={() => onChange(value + 90)}>+90°</button>
    </div>
  </>
);

const PaddingEditor: React.FC<{ value: Padding; onChange: (p: Padding) => void }> = ({ value, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
    <label>Верх<input type="number" min="0" value={value.top} onChange={(e) => onChange({ ...value, top: +e.target.value })} /></label>
    <label>Низ<input type="number" min="0" value={value.bottom} onChange={(e) => onChange({ ...value, bottom: +e.target.value })} /></label>
    <label>Слева<input type="number" min="0" value={value.left} onChange={(e) => onChange({ ...value, left: +e.target.value })} /></label>
    <label>Справа<input type="number" min="0" value={value.right} onChange={(e) => onChange({ ...value, right: +e.target.value })} /></label>
  </div>
);

const StampZoneEditor: React.FC<{
  label: string;
  prefix: 'top' | 'center' | 'bottom';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  color: string;
  fallbackColor: string;
  onChange: (patch: Record<string, any>) => void;
}> = ({
  label, prefix, text, fontSize, fontFamily, fontStyle, textDecoration, color, fallbackColor, onChange,
}) => {
  const hasBold = (fontStyle || '').includes('bold');
  const hasItalic = (fontStyle || '').includes('italic');
  const hasUnderline = (textDecoration || '').includes('underline');

  const toggleStyle = (flag: 'bold' | 'italic') => {
    const parts = (fontStyle || '').split(' ').filter(Boolean);
    const has = parts.includes(flag);
    const next = has ? parts.filter((p) => p !== flag) : [...parts, flag];
    onChange({ [`${prefix}FontStyle`]: next.join(' ') || 'normal' });
  };

  return (
    <div style={{ marginTop: 8, padding: 8, border: '1px solid var(--border)', borderRadius: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{label}</div>

      <label>Текст
        <input value={text} onChange={(e) => onChange({ [`${prefix}Text`]: e.target.value })} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <label>Размер
          <input type="number" min="6" max="200" value={fontSize}
            onChange={(e) => onChange({ [`${prefix}FontSize`]: +e.target.value })} />
        </label>
        <label>Шрифт
          <select value={fontFamily} onChange={(e) => onChange({ [`${prefix}FontFamily`]: e.target.value })}>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button type="button" className={hasBold ? 'active' : ''} style={{ flex: 1, fontWeight: 700 }}
          onClick={() => toggleStyle('bold')}>B</button>
        <button type="button" className={hasItalic ? 'active' : ''} style={{ flex: 1, fontStyle: 'italic' }}
          onClick={() => toggleStyle('italic')}>I</button>
        <button type="button" className={hasUnderline ? 'active' : ''} style={{ flex: 1, textDecoration: 'underline' }}
          onClick={() => onChange({ [`${prefix}TextDecoration`]: hasUnderline ? '' : 'underline' })}>U</button>
      </div>

      <label>Цвет текста
        <input type="color" value={color || fallbackColor}
          onChange={(e) => onChange({ [`${prefix}Color`]: e.target.value })} />
      </label>
    </div>
  );
};

export const PropertiesPanel: React.FC = () => {
  const selection = useSelectionContext();
  const actions = useActionsContext();
  const modals = useModalsContext();

  const selected = selection.selected;
  const selectedId = selection.selectedId;

  const update = (patch: any) => {
    if (selectedId) actions.updateWithHistory(selectedId, patch);
  };

  /* ---------- Штамп новой модели ---------- */
  if (
    selected
    && selected.type === 'stamp'
    && (selected as any).shapes
    && (selected as any).texts
  ) {
    const s = selected as any;
    return (
      <aside className="props">
        <h3>Штамп</h3>

        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <button style={{ flex: 1 }} onClick={() => actions.moveLayer(1)}>⬆ Вверх</button>
          <button style={{ flex: 1 }} onClick={() => actions.moveLayer(-1)}>⬇ Вниз</button>
        </div>
        <button className="danger" onClick={actions.removeSelected}>✕ Удалить</button>

        <RotationControl value={s.rotation} onChange={(v) => update({ rotation: v })} />

        <h4>Размер</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <label>Ширина
            <input type="number" min="40" value={Math.round(s.width)}
              onChange={(e) => update({ width: Math.max(40, +e.target.value) })} />
          </label>
          <label>Высота
            <input type="number" min="40" value={Math.round(s.height)}
              onChange={(e) => update({ height: Math.max(40, +e.target.value) })} />
          </label>
        </div>

        <h4>Содержимое</h4>
        <p className="hint-sm">
          {(s.shapes?.length || 0)} фигур, {(s.texts?.length || 0)} текстов,{' '}
          {(s.images?.length || 0)} картинок
        </p>

        <button onClick={() => modals.openStampEditor(selected.id)}>✎ Редактировать штамп</button>

        <h4>Позиция</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <label>X <input type="number" value={Math.round(s.x)} onChange={(e) => update({ x: +e.target.value })} /></label>
          <label>Y <input type="number" value={Math.round(s.y)} onChange={(e) => update({ y: +e.target.value })} /></label>
        </div>
      </aside>
    );
  }

  /* ---------- Общая панель ---------- */
  return (
    <aside className="props">
      <h3>🖌 Свойства</h3>

      {!selection.selectedIds.length && <p className="empty">Выделите элемент на холсте</p>}

      {selection.selectedIds.length > 1 && (
        <p className="empty">
          Выбрано элементов: {selection.selectedIds.length}. Кликните один для настройки.
        </p>
      )}

      {selected && selection.selectedIds.length === 1 && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button style={{ flex: 1 }} onClick={() => actions.moveLayer(1)}>⬆ Вперёд</button>
            <button style={{ flex: 1 }} onClick={() => actions.moveLayer(-1)}>⬇ Назад</button>
          </div>
          <button className="danger" onClick={actions.removeSelected}>✕ Удалить</button>
          <button onClick={actions.copyStyle}>🖌 Копировать стиль</button>
          {actions.copiedStyle && (
            <button onClick={actions.applyStyle}>🖍 Применить стиль</button>
          )}

          <RotationControl value={selected.rotation} onChange={(v) => update({ rotation: v })} />

          {/* FILL */}
          {selected.type === 'fill' && (
            <>
              <h4>Заливка области</h4>
              <label>Цвет
                <input type="color" value={(selected as any).fill}
                  onChange={(e) => update({ fill: e.target.value })} />
              </label>
              <p className="hint-sm">
                Область задаётся точкой на холсте.<br />
                Произвольную форму можно нарисовать в режиме «Заливка областей».
              </p>
            </>
          )}

          {/* LINE */}
          {selected.type === 'line' && (
            <>
              <h4>Линия</h4>
              <label>Цвет
                <input type="color" value={(selected as any).stroke}
                  onChange={(e) => update({ stroke: e.target.value })} />
              </label>
              <label>Толщина
                <input type="number" min="1" value={(selected as any).strokeWidth}
                  onChange={(e) => update({ strokeWidth: +e.target.value })} />
              </label>
              <label>Тип
                <select value={(selected as any).dash}
                  onChange={(e) => update({ dash: e.target.value as DashType })}>
                  <option value="solid">Сплошная</option>
                  <option value="dashed">Пунктир</option>
                  <option value="dotted">Точки</option>
                  <option value="dashdot">Штрих-пунктир</option>
                  <option value="longdash">Длинный пунктир</option>
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={(selected as any).isArrow}
                  onChange={(e) => update({ isArrow: e.target.checked })} />
                Стрелка
              </label>
              <p className="hint-sm">Двойной клик по линии — добавить опорную точку.</p>
            </>
          )}

          {/* PLACEHOLDER */}
          {selected.type === 'placeholder' && (
            <>
              <h4>Плейсхолдер в данных</h4>
              <label>Путь поля
                <input value={(selected as any).fieldPath}
                  onChange={(e) => update({ fieldPath: e.target.value, label: e.target.value })} />
              </label>
              <label>Тип значения
                <select value={(selected as any).fieldType}
                  onChange={(e) => update({ fieldType: e.target.value as DataFieldType })}>
                  <option value="string">Текст</option>
                  <option value="number">Число</option>
                  <option value="date">Дата</option>
                  <option value="boolean">Да/Нет</option>
                  <option value="image">Картинка</option>
                </select>
              </label>

              {(selected as any).fieldType !== 'image' && (
                <>
                  <h4>Стиль текста</h4>
                  <label>Размер
                    <input type="number" value={(selected as any).fontSize}
                      onChange={(e) => update({ fontSize: +e.target.value })} />
                  </label>
                  <label>Шрифт
                    <select value={(selected as any).fontFamily}
                      onChange={(e) => update({ fontFamily: e.target.value })}>
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </label>
                  <label>Цвет
                    <input type="color" value={(selected as any).fill}
                      onChange={(e) => update({ fill: e.target.value })} />
                  </label>
                  <label>Интерлиньяж
                    <input type="number" step="0.1" value={(selected as any).lineHeight}
                      onChange={(e) => update({ lineHeight: +e.target.value })} />
                  </label>
                  <select value={(selected as any).align}
                    onChange={(e) => update({ align: e.target.value as TextAlign })}>
                    <option value="left">Влево</option>
                    <option value="center">По центру</option>
                    <option value="right">Вправо</option>
                    <option value="justify">По ширине</option>
                  </select>
                  <select value={(selected as any).verticalAlign}
                    onChange={(e) => update({ verticalAlign: e.target.value as TextVerticalAlign })}>
                    <option value="top">Сверху</option>
                    <option value="middle">По центру</option>
                    <option value="bottom">Снизу</option>
                  </select>
                </>
              )}
              <h4>Внутренние отступы</h4>
              <PaddingEditor value={(selected as any).padding} onChange={(p) => update({ padding: p })} />
            </>
          )}

          {/* TEXT */}
          {selected.type === 'text' && (
            <>
              <label>Текст
                <textarea value={(selected as any).text}
                  onChange={(e) => update({ text: e.target.value })} />
              </label>
              <label>Размер
                <input type="number" value={(selected as any).fontSize}
                  onChange={(e) => update({ fontSize: +e.target.value })} />
              </label>
              <label>Интерлиньяж
                <input type="number" step="0.1" value={(selected as any).lineHeight}
                  onChange={(e) => update({ lineHeight: +e.target.value })} />
              </label>
              <label>Шрифт
                <select value={(selected as any).fontFamily}
                  onChange={(e) => update({ fontFamily: e.target.value })}>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </label>
              <label>Цвет
                <input type="color" value={(selected as any).fill}
                  onChange={(e) => update({ fill: e.target.value })} />
              </label>
              <label>Фон
                <input type="color"
                  value={(selected as any).background === 'transparent' ? '#ffffff' : (selected as any).background}
                  onChange={(e) => update({ background: e.target.value })} />
              </label>
              <button onClick={() => update({ background: 'transparent' })}>Прозрачный фон</button>

              <h4>Горизонтальное</h4>
              <select value={(selected as any).align}
                onChange={(e) => update({ align: e.target.value as TextAlign })}>
                <option value="left">Влево</option>
                <option value="center">По центру</option>
                <option value="right">Вправо</option>
                <option value="justify">По ширине</option>
              </select>

              <h4>Вертикальное</h4>
              <select value={(selected as any).verticalAlign}
                onChange={(e) => update({ verticalAlign: e.target.value as TextVerticalAlign })}>
                <option value="top">Сверху</option>
                <option value="middle">По центру</option>
                <option value="bottom">Снизу</option>
              </select>

              <h4>Отступы</h4>
              <PaddingEditor value={(selected as any).padding} onChange={(p) => update({ padding: p })} />
            </>
          )}

          {/* STAMP legacy */}
          {selected.type === 'stamp' && !(selected as any).shapes && (
            <>
              <h4>Геометрия</h4>
              <label>Толщина внешней
                <input type="number" min="0" value={(selected as any).strokeWidth}
                  onChange={(e) => update({ strokeWidth: +e.target.value })} />
              </label>
              <label>Тип внешней
                <select value={(selected as any).strokeDash}
                  onChange={(e) => update({ strokeDash: e.target.value as DashType })}>
                  <option value="solid">Сплошная</option>
                  <option value="dashed">Пунктир</option>
                  <option value="dotted">Точки</option>
                  <option value="dashdot">Штрих-пунктир</option>
                  <option value="longdash">Длинный пунктир</option>
                </select>
              </label>
              <label>Толщина внутренней
                <input type="number" min="0" value={(selected as any).innerStrokeWidth}
                  onChange={(e) => update({ innerStrokeWidth: +e.target.value })} />
              </label>
              <label>Тип внутренней
                <select value={(selected as any).innerStrokeDash}
                  onChange={(e) => update({ innerStrokeDash: e.target.value as DashType })}>
                  <option value="solid">Сплошная</option>
                  <option value="dashed">Пунктир</option>
                  <option value="dotted">Точки</option>
                  <option value="dashdot">Штрих-пунктир</option>
                  <option value="longdash">Длинный пунктир</option>
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={(selected as any).showInner}
                  onChange={(e) => update({ showInner: e.target.checked })} />
                Внутренний контур
              </label>
              <label>Цвет штампа
                <input type="color" value={(selected as any).stampColor}
                  onChange={(e) => update({ stampColor: e.target.value })} />
              </label>

              <StampZoneEditor
                label="Верхний текст" prefix="top"
                text={(selected as any).topText}
                fontSize={(selected as any).topFontSize}
                fontFamily={(selected as any).topFontFamily || 'Arial'}
                fontStyle={(selected as any).topFontStyle || 'normal'}
                textDecoration={(selected as any).topTextDecoration || ''}
                color={(selected as any).topColor}
                fallbackColor={(selected as any).stampColor}
                onChange={update}
              />
              <StampZoneEditor
                label="Центральный текст" prefix="center"
                text={(selected as any).centerText}
                fontSize={(selected as any).centerFontSize}
                fontFamily={(selected as any).centerFontFamily || 'Arial'}
                fontStyle={(selected as any).centerFontStyle || 'normal'}
                textDecoration={(selected as any).centerTextDecoration || ''}
                color={(selected as any).centerColor}
                fallbackColor={(selected as any).stampColor}
                onChange={update}
              />
              <StampZoneEditor
                label="Нижний текст" prefix="bottom"
                text={(selected as any).bottomText}
                fontSize={(selected as any).bottomFontSize}
                fontFamily={(selected as any).bottomFontFamily || 'Arial'}
                fontStyle={(selected as any).bottomFontStyle || 'normal'}
                textDecoration={(selected as any).bottomTextDecoration || ''}
                color={(selected as any).bottomColor}
                fallbackColor={(selected as any).stampColor}
                onChange={update}
              />
            </>
          )}

          {/* SHAPE */}
          {selected.type === 'shape' && (
            <>
              <h4>Фигура</h4>
              <label>Заливка
                <input type="color"
                  value={(selected as any).fill === 'transparent' ? '#ffffff' : (selected as any).fill}
                  onChange={(e) => update({ fill: e.target.value })} />
              </label>
              <button onClick={() => update({ fill: 'transparent' })}>Прозрачная заливка</button>
              <label>Обводка
                <input type="color" value={(selected as any).stroke}
                  onChange={(e) => update({ stroke: e.target.value })} />
              </label>
              <label>Толщина
                <input type="number" min="0" value={(selected as any).strokeWidth}
                  onChange={(e) => update({ strokeWidth: +e.target.value })} />
              </label>

              {((selected as any).shape === 'rect' || (selected as any).shape === 'roundRect') && (
                <label>Округление углов
                  <input type="number" min="0" value={(selected as any).radius || 0}
                    onChange={(e) => update({ radius: +e.target.value })} />
                </label>
              )}

              <h4>Текст внутри фигуры</h4>
              <label>Текст
                <input value={(selected as any).text}
                  onChange={(e) => update({ text: e.target.value })} />
              </label>
              <label>Размер
                <input type="number" value={(selected as any).fontSize}
                  onChange={(e) => update({ fontSize: +e.target.value })} />
              </label>
              <label>Цвет текста
                <input type="color" value={(selected as any).textFill}
                  onChange={(e) => update({ textFill: e.target.value })} />
              </label>

              <h4>Положение текста</h4>
              <label>По горизонтали
                <select value={(selected as any).textAlign || 'center'}
                  onChange={(e) => update({ textAlign: e.target.value as TextAlign })}>
                  <option value="left">Слева</option>
                  <option value="center">По центру</option>
                  <option value="right">Справа</option>
                </select>
              </label>
              <label>По вертикали
                <select value={(selected as any).textVerticalAlign || 'middle'}
                  onChange={(e) => update({ textVerticalAlign: e.target.value as TextVerticalAlign })}>
                  <option value="top">Сверху</option>
                  <option value="middle">По центру</option>
                  <option value="bottom">Снизу</option>
                </select>
              </label>
              <label>Шрифт
                <select value={(selected as any).textFontFamily || 'Arial'}
                  onChange={(e) => update({ textFontFamily: e.target.value })}>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </label>
              <label>Интерлиньяж
                <input type="number" step="0.1"
                  value={(selected as any).textLineHeight ?? 1.3}
                  onChange={(e) => update({ textLineHeight: +e.target.value })} />
              </label>

              <h4>Отступы текста</h4>
              <PaddingEditor
                value={(selected as any).textPadding || { top: 8, right: 8, bottom: 8, left: 8 }}
                onChange={(p) => update({ textPadding: p })}
              />
            </>
          )}

          {/* TABLE */}
          {selected.type === 'table' && (
            <>
              <p className="empty" style={{ marginBottom: 8 }}>
                Двойной клик по ячейке — редактирование.
              </p>
              <h4>Строки</h4>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
                <button style={{ flex: 1 }} onClick={() => {
                  const rows = (selected as any).rows + 1;
                  update({ rows, data: [...(selected as any).data, Array((selected as any).cols).fill('')] });
                }}>+ Строка</button>
                <button style={{ flex: 1 }} disabled={(selected as any).rows <= 1} onClick={() => {
                  if ((selected as any).rows <= 1) return;
                  const rows = (selected as any).rows - 1;
                  update({ rows, data: (selected as any).data.slice(0, rows) });
                }}>− Строка</button>
                <span>{(selected as any).rows}</span>
              </div>

              <h4>Колонки</h4>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
                <button style={{ flex: 1 }} onClick={() => {
                  const cols = (selected as any).cols + 1;
                  update({ cols, data: (selected as any).data.map((r: string[]) => [...r, '']) });
                }}>+ Колонка</button>
                <button style={{ flex: 1 }} disabled={(selected as any).cols <= 1} onClick={() => {
                  if ((selected as any).cols <= 1) return;
                  const cols = (selected as any).cols - 1;
                  update({ cols, data: (selected as any).data.map((r: string[]) => r.slice(0, cols)) });
                }}>− Колонка</button>
                <span>{(selected as any).cols}</span>
              </div>

              <label>Цвет границ
                <input type="color" value={(selected as any).borderColor}
                  onChange={(e) => update({ borderColor: e.target.value })} />
              </label>
              <label>Цвет заголовка
                <input type="color" value={(selected as any).headerBg}
                  onChange={(e) => update({ headerBg: e.target.value })} />
              </label>
              <label>Размер
                <input type="number" value={(selected as any).fontSize}
                  onChange={(e) => update({ fontSize: +e.target.value })} />
              </label>
            </>
          )}

          {/* FOOTER */}
          {selected.type === 'footer' && (
            <>
              <label>Текст
                <textarea value={(selected as any).text}
                  onChange={(e) => update({ text: e.target.value })} />
              </label>
              <label>Цвет текста
                <input type="color" value={(selected as any).fill}
                  onChange={(e) => update({ fill: e.target.value })} />
              </label>
              <label>Цвет фона
                <input type="color" value={(selected as any).bgColor}
                  onChange={(e) => update({ bgColor: e.target.value })} />
              </label>
              <label>Размер
                <input type="number" value={(selected as any).fontSize}
                  onChange={(e) => update({ fontSize: +e.target.value })} />
              </label>
            </>
          )}
        </>
      )}
    </aside>
  );
};