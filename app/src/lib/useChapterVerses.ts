import { useEffect, useState } from "react";
import { fetchChapter, type BibleVerse } from "./bibleApi";
import type { Translation } from "../types";

export function useChapterVerses(
  translation: Translation,
  bookId: number,
  chapter: number,
  enabled = true,
) {
  const [verses, setVerses] = useState<BibleVerse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setVerses(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setVerses(null);
    setError(null);
    fetchChapter(translation, bookId, chapter)
      .then((data) => {
        if (!cancelled) setVerses(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load this chapter. Check your connection and try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, translation, bookId, chapter]);

  return {
    verses,
    error,
    loading: enabled && !verses && !error,
  };
}