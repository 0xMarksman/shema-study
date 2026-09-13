import { useEffect, useRef, useState } from "react";
import { chapterTitle, parseReference } from "../lib/passage";
import { progressKey } from "../lib/schedule";
import { useChapterVerses } from "../lib/useChapterVerses";
import { getChapterHighlightsDetailed, removeVerseHighlight, setVerseHighlight, type ChapterHighlights } from "../lib/verseHighlights";
import { useAppState } from "../state/AppState";
import { TRANSLATIONS, type Track, type Translation } from "../types";
import { AppearanceSheet } from "./AppearancePanel";
import { BibleAudioControls } from "./BibleAudioControls";
import { ChapterView } from "./ChapterView";
import { CheckCircleIcon, ChevronIcon, CloseIcon } from "./icons";
import { VerseHighlightSheet } from "./VerseHighlightSheet";

export interface ReaderRequest {
  reference: string;
  /** When set, the reader offers "Mark as read" for this plan day/track. */
  day?: number;
  track?: Track;
  dayReadingIndex?: number;
  dayReadingCount?: number;
  dayReadingLabel?: string;
  /** Overrides the generic "Close" label — e.g. "Back to message" when opened from chat. */
  returnLabel?: string;
}

export function ReaderOverlay({
  request,
  onClose,
  onAdvanceToNextReading,
  onGoToPreviousReading,
  onGoToNextReading,
}: {
  request: ReaderRequest;
  onClose: () => void;
  onAdvanceToNextReading?: (track: Track) => boolean;
  onGoToPreviousReading?: (track: Track) => boolean;
  onGoToNextReading?: (track: Track) => boolean;
}) {
  const { settings, progress, toggleProgress, updateSettings } = useAppState();
  const chapters = parseReference(request.reference);
  const [index, setIndex] = useState(0);
  const [showAppearance, setShowAppearance] = useState(false);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [jumpToVerse, setJumpToVerse] = useState<number | null>(null);
  const [autoPlaySignal, setAutoPlaySignal] = useState<number | undefined>(undefined);
  const [pauseAudioSignal, setPauseAudioSignal] = useState<number | undefined>(undefined);
  const [continuousAudio, setContinuousAudio] = useState(false);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const [highlightedVerses, setHighlightedVerses] = useState<ChapterHighlights>({});
  const [editingHighlightVerse, setEditingHighlightVerse] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const current = chapters[index] ?? null;
  const currentVerses = useChapterVerses(
    settings.translation,
    current?.book.id ?? 0,
    current?.chapter ?? 1,
    Boolean(current),
  );

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("reader-visibility", { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent("reader-visibility", { detail: false }));
    };
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    setActiveVerse(null);
    setSelectedVerse(null);
    setJumpToVerse(null);
    setAudioIsPlaying(false);
    if (current) {
      setHighlightedVerses(getChapterHighlightsDetailed(current.book.id, current.chapter));
    } else {
      setHighlightedVerses({});
    }
    setEditingHighlightVerse(null);
  }, [index]);

  useEffect(() => {
    setIndex(0);
    if (continuousAudio) {
      setAutoPlaySignal(Date.now());
    }
  }, [request.reference]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const markable = request.day !== undefined && request.track !== undefined;
  const done = markable && progress.has(progressKey(settings.planTemplateId, request.day!, request.track!));
  const readingIndex = request.dayReadingIndex ?? null;
  const readingCount = request.dayReadingCount ?? null;
  const readingLabel = request.dayReadingLabel ?? "Day";

  const handleVerseTap = (verse: number) => {
    setSelectedVerse(verse);
    setJumpToVerse(verse);
  };

  const handleVerseDoubleTap = (verse: number) => {
    setSelectedVerse(verse);
    setPauseAudioSignal(Date.now());
    setEditingHighlightVerse(verse);
  };

  const handleAudioCompleted = () => {
    setAudioIsPlaying(false);
    if (!continuousAudio) return;
    if (!settings.bibleAutoAdvance) {
      setContinuousAudio(false);
      return;
    }

    if (index < chapters.length - 1) {
      setIndex((value) => value + 1);
      setAutoPlaySignal(Date.now());
      return;
    }

    if (markable && !done) {
      toggleProgress(request.day!, request.track!);
    }

    if (markable && request.track && onAdvanceToNextReading?.(request.track)) {
      setAutoPlaySignal(Date.now());
      return;
    }

    setContinuousAudio(false);
    onClose();
  };

  const goToPreviousReading = () => {
    if (!request.track || !onGoToPreviousReading) return;
    const moved = onGoToPreviousReading(request.track);
    if (moved) setAutoPlaySignal(Date.now());
  };

  const goToNextReading = () => {
    if (!request.track || !onGoToNextReading) return;
    const moved = onGoToNextReading(request.track);
    if (moved) setAutoPlaySignal(Date.now());
  };

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
              jumpToVerse={jumpToVerse}
              onJumpHandled={() => setJumpToVerse(null)}
              onPlaybackComplete={handleAudioCompleted}
              onPlaybackControl={(action) => {
                if (action === "play") {
                  setAudioIsPlaying(true);
                  setSelectedVerse(null);
                  setContinuousAudio(settings.bibleAutoAdvance);
                }
                if (action === "pause" || action === "stop") {
                  setAudioIsPlaying(false);
                  setContinuousAudio(false);
                }
              }}
              autoPlaySignal={autoPlaySignal}
              pauseSignal={pauseAudioSignal}
            />
            <ChapterView
              bookId={current.book.id}
              chapter={current.chapter}
              verses={currentVerses.verses}
              error={currentVerses.error}
              loading={currentVerses.loading}
              activeVerse={activeVerse}
              selectedVerse={selectedVerse}
              autoScrollActiveVerse={settings.bibleAutoScroll}
              followActiveVerse={audioIsPlaying}
              highlightedVerses={highlightedVerses}
              onVerseTap={handleVerseTap}
              onVerseDoubleTap={handleVerseDoubleTap}
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

      <footer className="reader-footer reader-footer--stack">
        {markable && request.track && (onGoToPreviousReading || onGoToNextReading) && (
          <div className="reader-footer-nav">
            <button
              className="btn btn-secondary"
              onClick={goToPreviousReading}
              disabled={!onGoToPreviousReading || readingIndex === 1}
              aria-label="Previous reading"
            >
              <ChevronIcon direction="left" className="q-icon" />
            </button>
            <span className="small muted reader-footer-nav__label">
              {readingIndex && readingCount
                ? `${readingLabel} ${readingIndex} of ${readingCount}`
                : `Day ${request.day}`}
            </span>
            <button
              className="btn btn-secondary"
              onClick={goToNextReading}
              disabled={!onGoToNextReading || (readingIndex !== null && readingCount !== null && readingIndex >= readingCount)}
              aria-label="Next reading"
            >
              <ChevronIcon direction="right" className="q-icon" />
            </button>
          </div>
        )}
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
      {current && editingHighlightVerse !== null && (
        <VerseHighlightSheet
          verse={editingHighlightVerse}
          current={highlightedVerses[editingHighlightVerse] ?? null}
          onSave={({ style, note }) => {
            setHighlightedVerses(
              setVerseHighlight(current.book.id, current.chapter, editingHighlightVerse, { style, note }),
            );
          }}
          onRemove={() => {
            setHighlightedVerses(removeVerseHighlight(current.book.id, current.chapter, editingHighlightVerse));
          }}
          onClose={() => setEditingHighlightVerse(null)}
        />
      )}
    </div>
  );
}
