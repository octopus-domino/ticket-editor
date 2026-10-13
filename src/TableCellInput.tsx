import React, { useEffect, useState } from 'react';

interface Props {
  value: string;
  placeholder?: string;
  onCommit: (v: string) => void;
}

export const TableCellInput: React.FC<Props> = ({ value, placeholder, onCommit }) => {
  const [v, setV] = useState(value);

  useEffect(() => { setV(value); }, [value]);

  return (
    <input
      value={v}
      placeholder={placeholder}
      style={{ marginBottom: 4 }}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onCommit(v);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
};