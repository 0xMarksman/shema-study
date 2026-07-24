import { useEffect, useRef, useState } from "react";
import { chapterTitle, parseReference } from "../lib/passage";
import { progressKey } from "../lib/schedule";
import { useChapterVerses } from "../lib/useChapterVerses";
import { useAppState } from "../state/AppState";
import { TRANSLATIONS, type Track, type Translation } from "../types";
import { AppearanceSheet } from "./AppearancePanel";
import { BibleAudioControls } from "./BibleAudioControls";
import { ChapterView } from "./ChapterView";
import { CheckCircleIcon, ChevronIcon, CloseIcon } from "./icons";

export interface ReaderRequest {
  reference: string;
  /** When set, the reader offers "Mark as read" for this plan day/track. */
  day?: number;
  track?: Track;
  /** Overrides the generic "Close" label — e.g. "Back to message" when opened from chat. */
  returnLabel?: string;
}

export function ReaderOverlay({
  request,
  onClose,
}: {
  request: ReaderRequest;
  onClose: () => void;
}) {
  const { settings, progress, toggleProgress, updateSettings } = useAppState();
  const chapters = parseReference(request.reference);
  const [index, setIndex] = useState(0);
  const [showAppearance, setShowAppearance] = useState(false);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const current = chapters[index] ?? null;
  const currentVerses = useChapterVerses(
    settings.translation,
    current?.book.id ?? 0,
    current?.chapter ?? 1,
    Boolean(current),
  );

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    setActiveVerse(null);
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const markable = request.day !== undefined && request.track !== undefined;
  const done = markable && progress.has(progressKey(settings.planTemplateId, request.day!, request.track!));

  return (
    <div className="reader-overlay" role="dialog" aria-modal="true" aria-label={request.reference}>
      <header className="reader-header">
        <h2>{request.reference}</h2>
        <select
          value={settings.translation}
          onChange={(e) => updateSettings({ translation: e.target.value as Translation })}
          aria-label="Translation"
        >
          {TRANSLATIONS.map((t) => (
            <option key={t.code} value={t.code}>
              {t.code}
            </option>
          ))}
        </select>
        <button className="aa-btn" onClick={() => setShowAppearance(true)} aria-label="Appearance">
          Aa
        </button>
        <button onClick={onClose} aria-label={request.returnLabel ?? "Close reader"} title={request.returnLabel} style={{ padding: 6 }}>
          <CloseIcon className="q-icon" />
        </button>
      </header>

      <div className="reader-body" ref={bodyRef}>
        {chapters.length === 0 && (
          <p className="muted">Couldn't understand the reference "{request.reference}".</p>
        )}
        {current && (
          <>
            <h3>
              {chapterTitle(current)}{" "}
              <span className="small muted" style={{ fontWeight: 400 }}>
                {settings.translation}
              </span>
            </h3>
            <BibleAudioControls
              reference={chapterTitle(current)}
              verses={currentVerses.verses}
              loading={currentVerses.loading}
              onVerseChange={setActiveVerse}
            />
            <ChapterView
              bookId={current.book.id}
              chapter={current.chapter}
              verses={currentVerses.verses}
              error={currentVerses.error}
              loading={currentVerses.loading}
              activeVerse={activeVerse}
            />
            {chapters.length > 1 && (
              <div className="chapter-nav">
                <button
                  className="btn btn-secondary"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => i - 1)}
                  aria-label="Previous chapter"
                >
                  <ChevronIcon direction="left" className="q-icon" />
                </button>
                <span className="small muted">
                  {index + 1} of {chapters.length}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={index === chapters.length - 1}
                  onClick={() => setIndex((i) => i + 1)}
                  aria-label="Next chapter"
                >
                  <ChevronIcon direction="right" className="q-icon" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="reader-footer">
        {markable ? (
          <button
            className={done ? "btn btn-secondary btn-block" : "btn btn-block"}
            onClick={() => {
              toggleProgress(request.day!, request.track!);
              if (!done) onClose();
            }}
          >
            <CheckCircleIcon filled={done} className="q-icon" />
            {done ? "Marked as read — tap to undo" : "Mark as read"}
          </button>
        ) : (
          <button className="btn btn-secondary btn-block" onClick={onClose}>
            {request.returnLabel ? `← ${request.returnLabel}` : "Close"}
          </button>
        )}
      </footer>

      {showAppearance && <AppearanceSheet onClose={() => setShowAppearance(false)} />}
    </div>
  );
}
