import React from 'react';
import type { StampImageItem } from '@/shared/types';

interface Props { image: StampImageItem; onChange: (p: Partial<StampImageItem>) => void; onReplace: () => void; }

export const StampImagePropsPanel: React.FC<Props> = ({ image, onChange, onReplace }) => (
  <>
    <h4>Свойства</h4>
    <label>Имя <input value={image.name || ''} placeholder="Картинка" onChange={(e) => onChange({ name: e.target.value })} /></label>
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <label className="check" style={{ flex: 1 }}><input type="checkbox" checked={!!image.locked} onChange={(e) => onChange({ locked: e.target.checked })} /> Закрыть</label>
      <label className="check" style={{ flex: 1 }}><input type="checkbox" checked={!!image.hidden} onChange={(e) => onChange({ hidden: e.target.checked })} /> Скрыть</label>
    </div>
    <h4>Геометрия</h4>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      <label>X <input type="number" value={Math.round(image.x)} onChange={(e) => onChange({ x: +e.target.value })} /></label>
      <label>Y <input type="number" value={Math.round(image.y)} onChange={(e) => onChange({ y: +e.target.value })} /></label>
      <label>Ширина <input type="number" min="1" value={Math.round(image.width)} onChange={(e) => onChange({ width: Math.max(1, +e.target.value) })} /></label>
      <label>Высота <input type="number" min="1" value={Math.round(image.height)} onChange={(e) => onChange({ height: Math.max(1, +e.target.value) })} /></label>
    </div>
    <h4>Вписывание</h4>
    <label>Режим <select value={image.fit || 'contain'} onChange={(e) => onChange({ fit: e.target.value as any })}><option value="contain">Вписать (contain)</option><option value="cover">Заполнить (cover)</option><option value="fill">Растянуть (fill)</option></select></label>
    <h4>Файл</h4>
    <button onClick={onReplace}>🖼 Заменить картинку</button>
  </>
);