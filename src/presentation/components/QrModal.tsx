import React, { useState } from 'react';
import { generateId } from '@/shared/utils/id';
import type { QrElement, QrFormat } from '@/shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (el: QrElement) => void;
}

export const QrModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [text, setText] = useState('https://');
  const [size, setSize] = useState(200);
  const [format, setFormat] = useState<QrFormat>('QR');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [ecc, setEcc] = useState<QrElement['ecc']>('M');

  if (!isOpen) return null;

  const handleCreate = () => {
    const el: QrElement = {
      id: generateId(),
      type: 'qr',
      x: 100, y: 100,
      width: size, height: size,
      rotation: 0,
      text: text.trim(),
      format,
      fgColor,
      bgColor,
      margin: 4,
      ecc,
    };
    onSave(el);
    onClose();
  };

  return (
    <div className="rt-modal-backdrop" onMouseDown={onClose}>
      <div
        className="rt-modal"
        style={{ width: 420, height: 'auto', padding: 24 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>Создать QR-код</h3>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Алгоритм
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as QrFormat)}
            style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }}
          >
            <option value="QR">QR Code</option>
            <option value="DATA_MATRIX">Data Matrix</option>
            <option value="AZTEC">Aztec</option>
            <option value="PDF_417">PDF417</option>
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Текст / URL
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <label>
            Размер, px
            <input
              type="number" min={100} max={1000} value={size}
              onChange={(e) => setSize(Math.max(100, +e.target.value))}
              style={{ width: '100%', padding: 6, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </label>
          <label>
            Коррекция
            <select
              value={ecc} onChange={(e) => setEcc(e.target.value as QrElement['ecc'])}
              style={{ width: '100%', padding: 6, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }}
            >
              <option value="L">L (~7%)</option>
              <option value="M">M (~15%)</option>
              <option value="Q">Q (~25%)</option>
              <option value="H">H (~30%)</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <label>
            Цвет кода
            <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)}
              style={{ width: '100%', height: 32, padding: 2, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          </label>
          <label>
            Фон
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
              style={{ width: '100%', height: 32, padding: 2, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          </label>
        </div>

        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          На канве будет видна разметка. Реальный код появится при экспорте
          SVG (локально) или PDF (на сервере).
        </p>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
            Отмена
          </button>
          <button onClick={handleCreate} disabled={!text.trim()} style={{ padding: '6px 12px', border: 'none', borderRadius: 4, background: '#6366f1', color: '#fff', cursor: 'pointer' }}>
            Создать
          </button>
        </div>
      </div>
    </div>
  );
};