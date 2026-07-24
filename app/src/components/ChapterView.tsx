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
}: {
  bookId: number;
  chapter: number;
  verses: BibleVerse[] | null;
  error: string | null;
  loading: boolean;
  activeVerse?: number | null;
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
          className={`verse ${red.has(v.verse) ? "red-letter" : ""} ${activeVerse === v.verse ? "verse--active" : ""}`}
          key={v.verse}
        >
          <span className="verse-num">{v.verse}</span>
          {v.text}
        </p>
      ))}
    </>
  );
}
