import { useEffect, useRef, useState } from "react";
import { type BibleVerse } from "../lib/bibleApi";
import { type ChapterHighlights } from "../lib/verseHighlights";
import { loadRedLetters, redVersesFor } from "../lib/redLetters";
import { useAppState } from "../state/AppState";

const PROGRAMMATIC_SCROLL_GUARD_MS = 320;

/** Renders one chapter's verses, with optional red-letter styling. */
export function ChapterView({
  bookId,
  chapter,
  verses,
  error,
  loading,
  activeVerse,
  selectedVerse,
  autoScrollActiveVerse = true,
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
  autoScrollActiveVerse?: boolean;
  highlightedVerses?: ChapterHighlights;
  onVerseTap?: (verse: number) => void;
  onVerseDoubleTap?: (verse: number) => void;
}) {
  const { settings } = useAppState();
  const manualScrollIdleMs = Math.min(5000, Math.max(400, Number(settings.bibleAutoScrollResumeMs) || 1400));
  const [redReady, setRedReady] = useState(false);
  const verseRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());
  const activeVerseRef = useRef<number | null>(activeVerse ?? null);
  const autoScrollEnabledRef = useRef<boolean>(autoScrollActiveVerse);
  const manualScrollOverrideRef = useRef(false);
  const programmaticScrollUntilRef = useRef(0);
  const manualScrollTimerRef = useRef<number | null>(null);

  const scrollToActiveVerse = (behavior: ScrollBehavior = "smooth") => {
    if (!autoScrollEnabledRef.current) return;
    if (manualScrollOverrideRef.current) return;
    const verse = activeVerseRef.current;
    if (!verse) return;
    const target = verseRefs.current.get(verse);
    if (!target) return;

    programmaticScrollUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_GUARD_MS;
    // Keep the currently spoken verse in view while audio advances.
    target.scrollIntoView({ behavior, block: "center", inline: "nearest" });
  };

  const clearManualScrollTimer = () => {
    if (manualScrollTimerRef.current !== null) {
      window.clearTimeout(manualScrollTimerRef.current);
      manualScrollTimerRef.current = null;
    }
  };

  const markManualScrollActivity = () => {
    manualScrollOverrideRef.current = true;
    clearManualScrollTimer();
    manualScrollTimerRef.current = window.setTimeout(() => {
      manualScrollOverrideRef.current = false;
      scrollToActiveVerse("smooth");
    }, manualScrollIdleMs);
  };

  useEffect(() => {
    loadRedLetters().then(() => setRedReady(true));
  }, []);

  useEffect(() => {
    activeVerseRef.current = activeVerse ?? null;
  }, [activeVerse]);

  useEffect(() => {
    autoScrollEnabledRef.current = autoScrollActiveVerse;
    if (autoScrollActiveVerse && !manualScrollOverrideRef.current) {
      scrollToActiveVerse("auto");
    }
  }, [autoScrollActiveVerse]);

  useEffect(() => {
    const firstVerse = verses?.[0]?.verse;
    if (!firstVerse) return;
    const firstEl = verseRefs.current.get(firstVerse);
    const scroller = firstEl?.closest(".reader-body") as HTMLElement | null;
    if (!scroller) return;

    const onManualInput = () => {
      if (!autoScrollEnabledRef.current) return;
      markManualScrollActivity();
    };

    const onScroll = () => {
      if (!autoScrollEnabledRef.current) return;
      if (Date.now() < programmaticScrollUntilRef.current) return;
      markManualScrollActivity();
    };

    scroller.addEventListener("wheel", onManualInput, { passive: true });
    scroller.addEventListener("touchstart", onManualInput, { passive: true });
    scroller.addEventListener("touchmove", onManualInput, { passive: true });
    scroller.addEventListener("pointerdown", onManualInput, { passive: true });
    scroller.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scroller.removeEventListener("wheel", onManualInput);
      scroller.removeEventListener("touchstart", onManualInput);
      scroller.removeEventListener("touchmove", onManualInput);
      scroller.removeEventListener("pointerdown", onManualInput);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [verses, bookId, chapter, manualScrollIdleMs]);

  useEffect(() => {
    return () => {
      clearManualScrollTimer();
    };
  }, []);

  useEffect(() => {
    scrollToActiveVerse("smooth");
  }, [activeVerse, autoScrollActiveVerse]);

  const red = settings.redLetters && redReady ? redVersesFor(bookId, chapter) : new Set<number>();

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      {loading && !error && <div className="spinner" />}
      {verses?.map((v) => {
        const highlight = highlightedVerses?.[v.verse];
        return (
          <p
          ref={(el) => {
            if (el) {
              verseRefs.current.set(v.verse, el);
            } else {
              verseRefs.current.delete(v.verse);
            }
          }}
          className={`verse verse--interactive ${red.has(v.verse) ? "red-letter" : ""} ${activeVerse === v.verse ? "verse--active" : ""} ${selectedVerse === v.verse && activeVerse === null ? "verse--selected" : ""} ${highlight ? "verse--saved" : ""} ${highlight ? `verse--saved--${highlight.style}` : ""}`}
          key={v.verse}
          onClick={() => onVerseTap?.(v.verse)}
          onDoubleClick={() => onVerseDoubleTap?.(v.verse)}
          role="button"
          tabIndex={0}
          title={highlight?.note || undefined}
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
          {highlight?.note ? <span className="verse-note-badge">note</span> : null}
        </p>
        );
      })}
    </>
  );
}
