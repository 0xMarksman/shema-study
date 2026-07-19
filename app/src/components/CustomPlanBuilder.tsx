import { useState } from "react";
import { BIBLE_BOOKS } from "../lib/bibleBooks";

const TANAKH_GROUP = BIBLE_BOOKS.filter((b) => b.id < 40);
const BRIT_CHADASHAH_GROUP = BIBLE_BOOKS.filter((b) => b.id >= 40);

interface CustomPlanBuilderProps {
  initialBookIds: number[];
  initialPace: number;
  onSave: (bookIds: number[], pace: number) => void;
  onClose: () => void;
}

export function CustomPlanBuilderSheet({
  initialBookIds,
  initialPace,
  onSave,
  onClose,
}: CustomPlanBuilderProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(initialBookIds));
  const [pace, setPace] = useState(initialPace);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setGroup(group: typeof BIBLE_BOOKS, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const b of group) {
        if (on) next.add(b.id);
        else next.delete(b.id);
      }
      return next;
    });
  }

  const totalChapters = BIBLE_BOOKS
    .filter((b) => selected.has(b.id))
    .reduce((sum, b) => sum + b.chapters, 0);
  const estimatedDays = totalChapters > 0 ? Math.ceil(totalChapters / Math.max(pace, 1)) : 0;

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Build a Custom Plan">
        <div className="sheet-handle" />

        <div className="setting-row" style={{ display: "block" }}>
          <label style={{ fontWeight: 500, color: "var(--text-h)" }}>Chapters per day</label>
          <input
            type="number"
            min={1}
            max={20}
            value={pace}
            onChange={(e) => setPace(Math.min(Math.max(Number(e.target.value) || 1, 1), 20))}
            style={{ marginTop: 8, width: 90 }}
          />
        </div>

        <BookGroup
          title="Tanakh"
          books={TANAKH_GROUP}
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => setGroup(TANAKH_GROUP, true)}
          onClear={() => setGroup(TANAKH_GROUP, false)}
        />
        <BookGroup
          title="B'rit Chadashah"
          books={BRIT_CHADASHAH_GROUP}
          selected={selected}
          onToggle={toggle}
          onSelectAll={() => setGroup(BRIT_CHADASHAH_GROUP, true)}
          onClear={() => setGroup(BRIT_CHADASHAH_GROUP, false)}
        />

        <div className="plan-builder-summary">
          {totalChapters === 0
            ? "Select at least one book to build your plan."
            : `${totalChapters} chapters selected — about ${estimatedDays} day${estimatedDays === 1 ? "" : "s"} at ${pace}/day.`}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn btn-secondary btn-block" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-block"
            disabled={selected.size === 0}
            onClick={() => onSave(Array.from(selected), pace)}
          >
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function BookGroup({
  title,
  books,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  title: string;
  books: typeof BIBLE_BOOKS;
  selected: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  return (
    <div className="plan-builder-group">
      <div className="plan-builder-group-title">
        <span>{title}</span>
        <span>
          <button className="plan-builder-group-action" onClick={onSelectAll}>
            Select all
          </button>
          <button className="plan-builder-group-action" onClick={onClear}>
            Clear
          </button>
        </span>
      </div>
      <div className="plan-builder-book-grid">
        {books.map((b) => (
          <label className="plan-builder-book-row" key={b.id}>
            <input
              type="checkbox"
              checked={selected.has(b.id)}
              onChange={() => onToggle(b.id)}
            />
            {b.name}
          </label>
        ))}
      </div>
    </div>
  );
}
