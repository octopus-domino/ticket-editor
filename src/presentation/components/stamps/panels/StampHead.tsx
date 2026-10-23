import React from 'react';

interface Props {
  name: string; width: number; height: number;
  onChangeName: (v: string) => void; onChangeWidth: (v: number) => void; onChangeHeight: (v: number) => void;
  onSave: () => void; onCancel: () => void;
}

export const StampHead: React.FC<Props> = ({ name, width, height, onChangeName, onChangeWidth, onChangeHeight, onSave, onCancel }) => (
  <div className="stamp-editor-head">
    <input className="stamp-editor-name" value={name} onChange={(e) => onChangeName(e.target.value)} placeholder="Название штампа" />
    <div className="stamp-editor-head-right">
      <label>Ш <input type="number" min="40" max="1200" value={width} onChange={(e) => onChangeWidth(Math.max(40, +e.target.value))} /></label>
      <label>В <input type="number" min="40" max="1200" value={height} onChange={(e) => onChangeHeight(Math.max(40, +e.target.value))} /></label>
      <button className="stamp-btn primary" onClick={onSave}>Сохранить</button>
      <button className="stamp-btn" onClick={onCancel}>Отмена</button>
    </div>
  </div>
);