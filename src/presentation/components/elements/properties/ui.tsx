import React from 'react';

export function normalizeColor(c: string | undefined | null): string {
  if (!c || c === 'transparent') return '#ffffff';
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  return c;
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '5px 8px', fontSize: 12,
  border: '1px solid #cbd5e1', borderRadius: 4, boxSizing: 'border-box',
};

export const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
    <h4 style={{ margin: '0 0 8px', fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>{title}</h4>
    {children}
  </div>
);

export const L: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
    <span style={{ display: 'block', marginBottom: 2 }}>{label}</span>
    {children}
  </label>
);