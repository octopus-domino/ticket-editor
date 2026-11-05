import { useEffect, useState } from 'react';
export function StampFontSizeInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const next = Number(draft);
    if (draft.trim() && Number.isFinite(next) && next >= 6 && next <= 512) {
      onChange(next);
      setDraft(String(next));
    } else setDraft(String(value));
  }
  return (
    <input
      type="number"
      min={6}
      max={512}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          setDraft(String(value));
          e.currentTarget.blur();
        }
      }}
    />
  );
}
