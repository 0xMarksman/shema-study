const VERSE_HIGHLIGHTS_KEY = "shema-study:verse-highlights";

export type VerseHighlightStyle = "gold" | "mint" | "sky" | "rose";

export interface VerseHighlight {
  style: VerseHighlightStyle;
  note: string;
  updatedAt: number;
}

export type ChapterHighlights = Record<number, VerseHighlight>;

type StoredChapterHighlights = Record<string, VerseHighlight> | number[];
type StoredHighlights = Record<string, StoredChapterHighlights>;

const DEFAULT_STYLE: VerseHighlightStyle = "gold";

function chapterKey(bookId: number, chapter: number) {
  return `${bookId}:${chapter}`;
}

function loadAllHighlights(): StoredHighlights {
  try {
    const raw = localStorage.getItem(VERSE_HIGHLIGHTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredHighlights;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveAllHighlights(highlights: StoredHighlights) {
  localStorage.setItem(VERSE_HIGHLIGHTS_KEY, JSON.stringify(highlights));
}

function normalizeEntry(raw: unknown): VerseHighlight {
  const style = raw && typeof raw === "object" && typeof (raw as { style?: unknown }).style === "string"
    ? (raw as { style: string }).style
    : DEFAULT_STYLE;
  const note = raw && typeof raw === "object" && typeof (raw as { note?: unknown }).note === "string"
    ? (raw as { note: string }).note
    : "";
  const updatedAt = raw && typeof raw === "object" && Number.isFinite((raw as { updatedAt?: unknown }).updatedAt)
    ? Number((raw as { updatedAt: number }).updatedAt)
    : Date.now();

  const safeStyle: VerseHighlightStyle =
    style === "mint" || style === "sky" || style === "rose" || style === "gold"
      ? style
      : DEFAULT_STYLE;

  return { style: safeStyle, note, updatedAt };
}

export function getChapterHighlightsDetailed(bookId: number, chapter: number): ChapterHighlights {
  const all = loadAllHighlights();
  const key = chapterKey(bookId, chapter);
  const chapterHighlights = all[key];

  if (!chapterHighlights) return {};

  if (Array.isArray(chapterHighlights)) {
    const migrated: ChapterHighlights = {};
    for (const verse of chapterHighlights) {
      if (!Number.isFinite(verse)) continue;
      migrated[Number(verse)] = {
        style: DEFAULT_STYLE,
        note: "",
        updatedAt: Date.now(),
      };
    }
    return migrated;
  }

  if (typeof chapterHighlights !== "object") return {};

  const normalized: ChapterHighlights = {};
  for (const [verseKey, rawEntry] of Object.entries(chapterHighlights)) {
    const verse = Number(verseKey);
    if (!Number.isFinite(verse)) continue;
    normalized[verse] = normalizeEntry(rawEntry);
  }
  return normalized;
}

function saveChapterHighlights(bookId: number, chapter: number, chapterHighlights: ChapterHighlights) {
  const all = loadAllHighlights();
  const key = chapterKey(bookId, chapter);
  const next: Record<string, VerseHighlight> = {};
  for (const [verse, entry] of Object.entries(chapterHighlights)) {
    next[String(verse)] = entry;
  }
  all[key] = next;
  saveAllHighlights(all);
}

export function getChapterHighlights(bookId: number, chapter: number): Set<number> {
  return new Set(Object.keys(getChapterHighlightsDetailed(bookId, chapter)).map(Number));
}

export function toggleChapterHighlight(bookId: number, chapter: number, verse: number): Set<number> {
  const chapterHighlights = getChapterHighlightsDetailed(bookId, chapter);
  if (chapterHighlights[verse]) {
    delete chapterHighlights[verse];
  } else {
    chapterHighlights[verse] = {
      style: DEFAULT_STYLE,
      note: "",
      updatedAt: Date.now(),
    };
  }
  saveChapterHighlights(bookId, chapter, chapterHighlights);
  return new Set(Object.keys(chapterHighlights).map(Number));
}

export function setVerseHighlight(
  bookId: number,
  chapter: number,
  verse: number,
  input: { style: VerseHighlightStyle; note?: string },
): ChapterHighlights {
  const chapterHighlights = getChapterHighlightsDetailed(bookId, chapter);
  chapterHighlights[verse] = {
    style: input.style,
    note: (input.note ?? "").trim(),
    updatedAt: Date.now(),
  };
  saveChapterHighlights(bookId, chapter, chapterHighlights);
  return chapterHighlights;
}

export function removeVerseHighlight(bookId: number, chapter: number, verse: number): ChapterHighlights {
  const chapterHighlights = getChapterHighlightsDetailed(bookId, chapter);
  delete chapterHighlights[verse];
  saveChapterHighlights(bookId, chapter, chapterHighlights);
  return chapterHighlights;
}