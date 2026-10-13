import React from 'react';
import type { EditorApi } from '../../hooks/useEditor';
import type {
  DashType,
  TextAlign,
  TextVerticalAlign,
  DataFieldType,
  Padding,
} from '../../types';

interface Props {
  editor: EditorApi;
}

/* ---------- Вспомогательные контролы ---------- */

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

/* ---------- Основная панель ---------- */

export const PropertiesPanel: React.FC<Props> = ({ editor }) => {
  const selected = editor.selected;
  const selectedId = editor.selectedId;

  const update = (patch: any) => {
    if (selectedId) editor.updateWithHistory(selectedId, patch);
  };

  return (
    <aside className="props">
      <h3>⚙️ Свойства</h3>

      {!editor.selectedIds.length && <p className="empty">Выделите элемент на холсте</p>}

      {editor.selectedIds.length > 1 && (
        <p className="empty">
          Выбрано элементов: {editor.selectedIds.length}. Кликните один для настройки.
        </p>
      )}

      {selected && editor.selectedIds.length === 1 && (
        <>
          {/* Общие действия */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button style={{ flex: 1 }} onClick={() => editor.moveLayer(1)}>⬆ Вперёд</button>
            <button style={{ flex: 1 }} onClick={() => editor.moveLayer(-1)}>⬇ Назад</button>
          </div>
          <button className="danger" onClick={editor.removeSelected}>🗑 Удалить</button>
          <button onClick={editor.copyStyle}>🎨 Копировать стиль</button>
          {editor.copiedStyle && (
            <button onClick={editor.applyStyle}>🖌 Применить стиль</button>
          )}

          <RotationControl value={selected.rotation} onChange={(v) => update({ rotation: v })} />

          {/* ---------- FILL ---------- */}
          {selected.type === 'fill' && (
            <>
              <h4>Заливка области</h4>
              <label>Цвет
                <input type="color" value={selected.fill}
                  onChange={(e) => update({ fill: e.target.value })} />
              </label>
              <p className="hint-sm">
                Точки полигона тяните за жёлтые маркеры.<br />
                Прозрачность управляется общей для всех заливок.
              </p>
            </>
          )}

          {/* ---------- LINE ---------- */}
          {selected.type === 'line' && (
            <>
              <h4>Линия</h4>
              <label>Цвет
                <input type="color" value={selected.stroke}
                  onChange={(e) => update({ stroke: e.target.value })} />
              </label>
              <label>Толщина
                <input type="number" min="1" value={selected.strokeWidth}
                  onChange={(e) => update({ strokeWidth: +e.target.value })} />
              </label>
              <label>Тип
                <select value={selected.dash}
                  onChange={(e) => update({ dash: e.target.value as DashType })}>
                  <option value="solid">Сплошная</option>
                  <option value="dashed">Пунктир</option>
                  <option value="dotted">Точки</option>
                  <option value="dashdot">Штрих-пунктир</option>
                  <option value="longdash">Длинный пунктир</option>
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={selected.isArrow}
                  onChange={(e) => update({ isArrow: e.target.checked })} />
                Стрелка
              </label>
              <p className="hint-sm">
                Двойной клик по линии — добавить опорную точку.
              </p>
            </>
          )}

          {/* ---------- PLACEHOLDER ---------- */}
          {selected.type === 'placeholder' && (
            <>
              <h4>Привязка к данным</h4>
              <label>Путь поля
                <input value={selected.fieldPath}
                  onChange={(e) => update({ fieldPath: e.target.value, label: e.target.value })} />
              </label>
              <label>Пример значения
                <input value={selected.sample}
                  onChange={(e) => update({ sample: e.target.value })} />
              </label>
              <label>Тип
                <select value={selected.fieldType}
                  onChange={(e) => update({ fieldType: e.target.value as DataFieldType })}>
                  <option value="string">Текст</option>
                  <option value="number">Число</option>
                  <option value="date">Дата</option>
                  <option value="boolean">Да/Нет</option>
                  <option value="image">Картинка</option>
                </select>
              </label>

              {selected.fieldType !== 'image' && (
                <>
                  <h4>Стиль текста</h4>
                  <label>Размер
                    <input type="number" value={selected.fontSize}
                      onChange={(e) => update({ fontSize: +e.target.value })} />
                  </label>
                  <label>Семейство
                    <select value={selected.fontFamily}
                      onChange={(e) => update({ fontFamily: e.target.value })}>
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </label>

                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <button style={{ flex: 1 }} onClick={() => {
                      const has = (selected.fontStyle || '').includes('bold');
                      const parts = (selected.fontStyle || '').split(' ').filter(Boolean);
                      update({
                        fontStyle: has
                          ? parts.filter((p) => p !== 'bold').join(' ') || 'normal'
                          : [...parts, 'bold'].join(' '),
                      });
                    }}>
                      <b>{selected.fontStyle?.includes('bold') ? '✓ ' : ''}B</b>
                    </button>
                    <button style={{ flex: 1 }} onClick={() => {
                      const has = (selected.fontStyle || '').includes('italic');
                      const parts = (selected.fontStyle || '').split(' ').filter(Boolean);
                      update({
                        fontStyle: has
                          ? parts.filter((p) => p !== 'italic').join(' ') || 'normal'
                          : [...parts, 'italic'].join(' '),
                      });
                    }}>
                      <i>{selected.fontStyle?.includes('italic') ? '✓ ' : ''}I</i>
                    </button>
                    <button style={{ flex: 1 }} onClick={() => {
                      update({
                        textDecoration: selected.textDecoration === 'underline' ? '' : 'underline',
                      });
                    }}>
                      <u>{selected.textDecoration === 'underline' ? '✓ ' : ''}U</u>
                    </button>
                  </div>

                  <label>Цвет
                    <input type="color" value={selected.fill}
                      onChange={(e) => update({ fill: e.target.value })} />
                  </label>
                  <label>Фон
                    <input type="color"
                      value={selected.background === 'transparent' ? '#ffffff' : selected.background || '#ffffff'}
                      onChange={(e) => update({ background: e.target.value })} />
                  </label>
                  <button onClick={() => update({ background: 'transparent' })}>Прозрачный фон</button>
                  <label>Интерлиньяж
                    <input type="number" step="0.1" value={selected.lineHeight}
                      onChange={(e) => update({ lineHeight: +e.target.value })} />
                  </label>

                  <h4>Выравнивание</h4>
                  <select value={selected.align}
                    onChange={(e) => update({ align: e.target.value as TextAlign })}>
                    <option value="left">Влево</option>
                    <option value="center">По центру</option>
                    <option value="right">Вправо</option>
                    <option value="justify">По ширине</option>
                  </select>
                  <select value={selected.verticalAlign}
                    onChange={(e) => update({ verticalAlign: e.target.value as TextVerticalAlign })}>
                    <option value="top">Сверху</option>
                    <option value="middle">По центру</option>
                    <option value="bottom">Снизу</option>
                  </select>
                </>
              )}
              <h4>Внутренние отступы</h4>
              <PaddingEditor value={selected.padding} onChange={(p) => update({ padding: p })} />
            </>
          )}

          {/* ---------- TEXT ---------- */}
          {selected.type === 'text' && (
            <>
              <label>Текст
                <textarea value={selected.text}
                  onChange={(e) => update({ text: e.target.value })} />
              </label>
              <label>Размер
                <input type="number" value={selected.fontSize}
                  onChange={(e) => update({ fontSize: +e.target.value })} />
              </label>
              <label>Интерлиньяж
                <input type="number" step="0.1" value={selected.lineHeight}
                  onChange={(e) => update({ lineHeight: +e.target.value })} />
              </label>
              <label>Семейство
                <select value={selected.fontFamily}
                  onChange={(e) => update({ fontFamily: e.target.value })}>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </label>
              <label>Цвет
                <input type="color" value={selected.fill}
                  onChange={(e) => update({ fill: e.target.value })} />
              </label>
              <label>Фон
                <input type="color"
                  value={selected.background === 'transparent' ? '#ffffff' : selected.background}
                  onChange={(e) => update({ background: e.target.value })} />
              </label>
              <button onClick={() => update({ background: 'transparent' })}>Прозрачный фон</button>

              <h4>Горизонтальное</h4>
              <select value={selected.align}
                onChange={(e) => update({ align: e.target.value as TextAlign })}>
                <option value="left">Влево</option>
                <option value="center">По центру</option>
                <option value="right">Вправо</option>
                <option value="justify">По ширине</option>
              </select>

              <h4>Вертикальное</h4>
              <select value={selected.verticalAlign}
                onChange={(e) => update({ verticalAlign: e.target.value as TextVerticalAlign })}>
                <option value="top">Сверху</option>
                <option value="middle">По центру</option>
                <option value="bottom">Снизу</option>
              </select>

              <h4>Отступы</h4>
              <PaddingEditor value={selected.padding} onChange={(p) => update({ padding: p })} />
            </>
          )}

          {/* ---------- STAMP ---------- */}
          {selected.type === 'stamp' && (
            <>
              <h4>Линии</h4>
              <label>Толщина внешней
                <input type="number" min="0" value={selected.strokeWidth}
                  onChange={(e) => update({ strokeWidth: +e.target.value })} />
              </label>
              <label>Тип внешней
                <select value={selected.strokeDash}
                  onChange={(e) => update({ strokeDash: e.target.value as DashType })}>
                  <option value="solid">Сплошная</option>
                  <option value="dashed">Пунктир</option>
                  <option value="dotted">Точки</option>
                  <option value="dashdot">Штрих-пунктир</option>
                  <option value="longdash">Длинный пунктир</option>
                </select>
              </label>
              <label>Толщина внутренней
                <input type="number" min="0" value={selected.innerStrokeWidth}
                  onChange={(e) => update({ innerStrokeWidth: +e.target.value })} />
              </label>
              <label>Тип внутренней
                <select value={selected.innerStrokeDash}
                  onChange={(e) => update({ innerStrokeDash: e.target.value as DashType })}>
                  <option value="solid">Сплошная</option>
                  <option value="dashed">Пунктир</option>
                  <option value="dotted">Точки</option>
                  <option value="dashdot">Штрих-пунктир</option>
                  <option value="longdash">Длинный пунктир</option>
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={selected.showInner}
                  onChange={(e) => update({ showInner: e.target.checked })} />
                Внутренний контур
              </label>
              <label>Цвет обводки
                <input type="color" value={selected.stampColor}
                  onChange={(e) => update({ stampColor: e.target.value })} />
              </label>

              <h4>Тексты</h4>
              <label>Верх
                <input value={selected.topText}
                  onChange={(e) => update({ topText: e.target.value })} />
              </label>
              <label>Центр
                <input value={selected.centerText}
                  onChange={(e) => update({ centerText: e.target.value })} />
              </label>
              <label>Низ
                <input value={selected.bottomText}
                  onChange={(e) => update({ bottomText: e.target.value })} />
              </label>
            </>
          )}

          {/* ---------- SHAPE ---------- */}
          {selected.type === 'shape' && (
            <>
              <label>Заливка
                <input type="color"
                  value={selected.fill === 'transparent' ? '#ffffff' : selected.fill}
                  onChange={(e) => update({ fill: e.target.value })} />
              </label>
              <button onClick={() => update({ fill: 'transparent' })}>Прозрачная заливка</button>
              <label>Обводка
                <input type="color" value={selected.stroke}
                  onChange={(e) => update({ stroke: e.target.value })} />
              </label>
              <label>Толщина
                <input type="number" min="0" value={selected.strokeWidth}
                  onChange={(e) => update({ strokeWidth: +e.target.value })} />
              </label>

              {(selected.shape === 'rect' || selected.shape === 'roundRect') && (
                <label>Скругление углов
                  <input type="number" min="0" value={selected.radius || 0}
                    onChange={(e) => update({ radius: +e.target.value })} />
                </label>
              )}

              <label>Текст
                <input value={selected.text}
                  onChange={(e) => update({ text: e.target.value })} />
              </label>
              <label>Размер
                <input type="number" value={selected.fontSize}
                  onChange={(e) => update({ fontSize: +e.target.value })} />
              </label>
              <label>Цвет текста
                <input type="color" value={selected.textFill}
                  onChange={(e) => update({ textFill: e.target.value })} />
              </label>
            </>
          )}

          {/* ---------- TABLE ---------- */}
          {selected.type === 'table' && (
            <>
              <p className="empty" style={{ marginBottom: 8 }}>
                Двойной клик по ячейке — редактирование.
              </p>
              <h4>Строки</h4>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
                <button style={{ flex: 1 }} onClick={() => {
                  const rows = selected.rows + 1;
                  update({ rows, data: [...selected.data, Array(selected.cols).fill('')] });
                }}>+ Строка</button>
                <button style={{ flex: 1 }} disabled={selected.rows <= 1} onClick={() => {
                  if (selected.rows <= 1) return;
                  const rows = selected.rows - 1;
                  update({ rows, data: selected.data.slice(0, rows) });
                }}>− Строка</button>
                <span>{selected.rows}</span>
              </div>

              <h4>Колонки</h4>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
                <button style={{ flex: 1 }} onClick={() => {
                  const cols = selected.cols + 1;
                  update({ cols, data: selected.data.map((r) => [...r, '']) });
                }}>+ Столбец</button>
                <button style={{ flex: 1 }} disabled={selected.cols <= 1} onClick={() => {
                  if (selected.cols <= 1) return;
                  const cols = selected.cols - 1;
                  update({ cols, data: selected.data.map((r) => r.slice(0, cols)) });
                }}>− Столбец</button>
                <span>{selected.cols}</span>
              </div>

              <label>Цвет границ
                <input type="color" value={selected.borderColor}
                  onChange={(e) => update({ borderColor: e.target.value })} />
              </label>
              <label>Фон заголовка
                <input type="color" value={selected.headerBg}
                  onChange={(e) => update({ headerBg: e.target.value })} />
              </label>
              <label>Размер
                <input type="number" value={selected.fontSize}
                  onChange={(e) => update({ fontSize: +e.target.value })} />
              </label>
            </>
          )}

          {/* ---------- FOOTER ---------- */}
          {selected.type === 'footer' && (
            <>
              <label>Текст
                <textarea value={selected.text}
                  onChange={(e) => update({ text: e.target.value })} />
              </label>
              <label>Цвет текста
                <input type="color" value={selected.fill}
                  onChange={(e) => update({ fill: e.target.value })} />
              </label>
              <label>Цвет фона
                <input type="color" value={selected.bgColor}
                  onChange={(e) => update({ bgColor: e.target.value })} />
              </label>
              <label>Размер
                <input type="number" value={selected.fontSize}
                  onChange={(e) => update({ fontSize: +e.target.value })} />
              </label>
            </>
          )}
        </>
      )}
    </aside>
  );
};