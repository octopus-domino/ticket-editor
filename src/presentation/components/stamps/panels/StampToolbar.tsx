import { t as __tr } from '@/shared/i18n';
import React from 'react';
import type { StampShapeKind } from '@/shared/types';
import type { PlacementMode } from '@/lib/stamps/geometry';

interface Props {
  placementMode: PlacementMode;
  zoom: number; minZoom: number; maxZoom: number;
  canUndo: boolean; canRedo: boolean; showGrid: boolean; snap: boolean;
  fillMode: boolean; fillColor: string;
  onChangePlacement: (v: PlacementMode) => void; onAddShape: (k: StampShapeKind) => void;
  onAddStraightText: () => void; onAddArcText: () => void; onAddImage: (transparent: boolean) => void;
  onToggleFillMode: () => void; onFillColorChange: (c: string) => void;
  onUndo: () => void; onRedo: () => void; onZoomIn: () => void; onZoomOut: () => void; onZoomFit: () => void;
  onToggleGrid: (v: boolean) => void; onToggleSnap: (v: boolean) => void;
}

export const StampToolbar: React.FC<Props> = ({
  placementMode, zoom, minZoom, maxZoom, canUndo, canRedo, showGrid, snap, fillMode, fillColor,
  onChangePlacement, onAddShape, onAddStraightText, onAddArcText, onAddImage, onToggleFillMode, onFillColorChange,
  onUndo, onRedo, onZoomIn, onZoomOut, onZoomFit, onToggleGrid, onToggleSnap,
}) => (
  <div className="stamp-toolbar">
    <button className="stamp-btn" onClick={() => onAddShape('circle')}>{__tr("○ Круг")}</button>
    <button className="stamp-btn" onClick={() => onAddShape('ellipse')}>{__tr("⬭ Эллипс")}</button>
    <button className="stamp-btn" onClick={() => onAddShape('rect')}>{__tr("▭ Прямоугольник")}</button>
    <button className="stamp-btn" onClick={() => onAddShape('triangle')}>{__tr("△ Треугольник")}</button>
    <button className="stamp-btn" onClick={() => onAddShape('line')}>{__tr("╱ Линия")}</button>
    <span className="stamp-sep" />
    <div className="stamp-fill-group">
      <button className={`stamp-btn ${fillMode ? 'active' : ''}`} onClick={onToggleFillMode} title={__tr("Заливка")}>
        {__tr("🎨 Заливка")}</button>
      <input type="color" value={fillColor} onChange={(e) => onFillColorChange(e.target.value)} className="stamp-fill-color" title={__tr("Цвет заливки")} />
    </div>
    <span className="stamp-sep" />
    <button className="stamp-btn" onClick={onAddStraightText}>{__tr("T Прямой текст")}</button>
    <button className="stamp-btn" onClick={onAddArcText}>{__tr("◯ Текст по дуге")}</button>
    <span className="stamp-sep" />
    <button className="stamp-btn" onClick={() => onAddImage(false)}>{__tr("🖼 Картинка")}</button>
    <button className="stamp-btn" onClick={() => onAddImage(true)}>{__tr("✂ Картинка (убрать фон)")}</button>
    <span className="stamp-sep" />
    <label className="stamp-check">{__tr("Размещать")}<select value={placementMode} onChange={(e) => onChangePlacement(e.target.value as PlacementMode)} style={{ width: 110, marginLeft: 4 }}>
        <option value="inside">{__tr("Внутри")}</option><option value="outside">{__tr("Снаружи")}</option><option value="next">{__tr("Рядом")}</option>
      </select>
    </label>
    <span className="stamp-sep" />
    <button className="stamp-btn" onClick={onUndo} disabled={!canUndo}>↶</button>
    <button className="stamp-btn" onClick={onRedo} disabled={!canRedo}>↷</button>
    <span className="stamp-sep" />
    <button className="stamp-btn" onClick={onZoomOut} disabled={zoom <= minZoom}>−</button>
    <span className="stamp-zoom-label">{Math.round(zoom * 100)}%</span>
    <button className="stamp-btn" onClick={onZoomIn} disabled={zoom >= maxZoom}>+</button>
    <button className="stamp-btn" onClick={onZoomFit}>⤢</button>
    <span className="stamp-sep" />
    <label className="stamp-check"><input type="checkbox" checked={showGrid} onChange={(e) => onToggleGrid(e.target.checked)} /> {__tr("Сетка")}</label>
    <label className="stamp-check"><input type="checkbox" checked={snap} onChange={(e) => onToggleSnap(e.target.checked)} /> {__tr("Привязка")}</label>
  </div>
);