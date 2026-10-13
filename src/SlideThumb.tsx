import React from 'react';
import type { Slide } from './types';

interface Props {
  slide: Slide;
  index: number;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export const SlideThumb: React.FC<Props> = ({ slide, index, active, onClick, onDelete }) => (
  <div className={`slide-thumb ${active ? 'active' : ''}`} onClick={onClick}>
    <div className="num">{index + 1}</div>
    <div className="name">{slide.name}</div>
    <div className="count">{slide.elements.length} эл.</div>
    <button className="del" onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
  </div>
);