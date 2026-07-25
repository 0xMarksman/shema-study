import { useEffect, useState } from "react";
import { type BibleVerse } from "../lib/bibleApi";
import { loadRedLetters, redVersesFor } from "../lib/redLetters";
import { useAppState } from "../state/AppState";

/** Renders one chapter's verses, with optional red-letter styling. */
export function ChapterView({
  bookId,
  chapter,
  verses,
  error,
  loading,
  activeVerse,
  selectedVerse,
  highlightedVerses,
  onVerseTap,
  onVerseDoubleTap,
}: {
  bookId: number;
  chapter: number;
  verses: BibleVerse[] | null;
  error: string | null;
  loading: boolean;
  activeVerse?: number | null;
  selectedVerse?: number | null;
  highlightedVerses?: Set<number>;
  onVerseTap?: (verse: number) => void;
  onVerseDoubleTap?: (verse: number) => void;
}) {
  const { settings } = useAppState();
  const [redReady, setRedReady] = useState(false);

  useEffect(() => {
    loadRedLetters().then(() => setRedReady(true));
  }, []);

  const red = settings.redLetters && redReady ? redVersesFor(bookId, chapter) : new Set<number>();

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      {loading && !error && <div className="spinner" />}
      {verses?.map((v) => (
        <p
          className={`verse verse--interactive ${red.has(v.verse) ? "red-letter" : ""} ${activeVerse === v.verse ? "verse--active" : ""} ${selectedVerse === v.verse ? "verse--selected" : ""} ${highlightedVerses?.has(v.verse) ? "verse--saved" : ""}`}
          key={v.verse}
          onClick={() => onVerseTap?.(v.verse)}
          onDoubleClick={() => onVerseDoubleTap?.(v.verse)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onVerseTap?.(v.verse);
            }
            if ((event.key === "H" || event.key === "h") && onVerseDoubleTap) {
              event.preventDefault();
              onVerseDoubleTap(v.verse);
            }
          }}
        >
          <span className="verse-num">{v.verse}</span>
          {v.text}
        </p>
      ))}
    </>
  );
}
