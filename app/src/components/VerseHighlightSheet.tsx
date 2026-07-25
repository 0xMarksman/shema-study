import { useEffect, useState } from "react";
import { type VerseHighlight, type VerseHighlightStyle } from "../lib/verseHighlights";

const HIGHLIGHT_STYLES: { id: VerseHighlightStyle; label: string }[] = [
  { id: "gold", label: "Gold" },
  { id: "mint", label: "Mint" },
  { id: "sky", label: "Sky" },
  { id: "rose", label: "Rose" },
];

export function VerseHighlightSheet({
  verse,
  current,
  onSave,
  onRemove,
  onClose,
}: {
  verse: number;
  current: VerseHighlight | null;
  onSave: (input: { style: VerseHighlightStyle; note: string }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [style, setStyle] = useState<VerseHighlightStyle>(current?.style ?? "gold");
  const [note, setNote] = useState(current?.note ?? "");

  useEffect(() => {
    setStyle(current?.style ?? "gold");
    setNote(current?.note ?? "");
  }, [current, verse]);

  return (
    <div
      className="sheet-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`Verse ${verse} highlight`}>
        <div className="sheet-handle" />
        <div className="section-label" style={{ marginTop: 0 }}>Verse {verse}</div>
        <h3 style={{ margin: "4px 0 10px" }}>Highlight & Note</h3>

        <div className="highlight-style-grid" role="radiogroup" aria-label="Highlight style">
          {HIGHLIGHT_STYLES.map((option) => (
            <button
              key={option.id}
              className={`highlight-style-btn ${style === option.id ? "is-active" : ""}`}
              data-style={option.id}
              role="radio"
              aria-checked={style === option.id}
              onClick={() => setStyle(option.id)}
            >
              <span className="highlight-style-btn__swatch" aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <div className="setting-row" style={{ borderTop: 0, padding: "10px 0 0" }}>
          <label htmlFor="verse-highlight-note">Note</label>
        </div>
        <textarea
          id="verse-highlight-note"
          className="highlight-note-input"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Write a note about this verse..."
          maxLength={600}
        />
        <div className="small muted" style={{ marginTop: 6 }}>
          {note.length}/600
        </div>

        <div className="audio-card__buttons" style={{ marginTop: 14 }}>
          <button
            className="btn"
            onClick={() => {
              onSave({ style, note });
              onClose();
            }}
          >
            Save highlight
          </button>
          {current && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              Remove highlight
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
