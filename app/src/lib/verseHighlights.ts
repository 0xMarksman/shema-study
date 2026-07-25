const VERSE_HIGHLIGHTS_KEY = "shema-study:verse-highlights";

type StoredHighlights = Record<string, number[]>;

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

export function getChapterHighlights(bookId: number, chapter: number): Set<number> {
  const all = loadAllHighlights();
  const key = chapterKey(bookId, chapter);
  const verses = all[key] ?? [];
  return new Set(verses.filter((verse) => Number.isFinite(verse)));
}

export function toggleChapterHighlight(bookId: number, chapter: number, verse: number): Set<number> {
  const all = loadAllHighlights();
  const key = chapterKey(bookId, chapter);
  const current = new Set((all[key] ?? []).filter((entry) => Number.isFinite(entry)));
  if (current.has(verse)) current.delete(verse);
  else current.add(verse);
  all[key] = [...current].sort((a, b) => a - b);
  saveAllHighlights(all);
  return current;
}