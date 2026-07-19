import { useState } from "react";

/**
 * A plain number input snaps its controlled value back on every keystroke
 * (e.g. clearing it to type "21" reverts to the old value mid-edit, so the
 * new digits land next to the old one instead of replacing it). Editing here
 * as free-form text and only parsing/clamping/committing on blur or Enter
 * avoids that fight with React's controlled-input re-render.
 */
export function DayNumberInput({
  id,
  value,
  max,
  min = 1,
  className,
  style,
  placeholder,
  onCommit,
}: {
  id?: string;
  value: number;
  max: number;
  min?: number;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  if (!focused && draft !== String(value)) {
    setDraft(String(value));
  }

  function commit() {
    const v = parseInt(draft, 10);
    const clamped = Math.min(Math.max(Number.isNaN(v) ? min : v, min), max);
    setDraft(String(clamped));
    onCommit(clamped);
  }

  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      className={className}
      style={style}
      placeholder={placeholder}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
