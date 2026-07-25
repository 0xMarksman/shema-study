import { useEffect, useMemo, useState } from "react";
import { parseReference } from "../lib/passage";
import { getHebrewDateInfo } from "../lib/hebrewCalendar";
import { getCalendarEventsForDate, getUpcomingCalendarEvents, type CalendarEventEntry } from "../lib/eventGuides";
import { useAppState } from "../state/AppState";
import { CheckCircleIcon, CalendarIcon, BookOpenIcon } from "./icons";

const EVENT_PROGRESS_KEY = "shema-study:event-progress";

type SavedChecklist = Record<string, boolean[]>;

function loadSavedChecklist(): SavedChecklist {
  try {
    const raw = localStorage.getItem(EVENT_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SavedChecklist;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function EventsScreen() {
  const { openBibleRef } = useAppState();
  const [selected, setSelected] = useState<CalendarEventEntry | null>(null);
  const [checklists, setChecklists] = useState<SavedChecklist>(loadSavedChecklist);

  useEffect(() => {
    localStorage.setItem(EVENT_PROGRESS_KEY, JSON.stringify(checklists));
  }, [checklists]);

  const today = new Date();
  const todayEvents = useMemo(() => getCalendarEventsForDate(today), [today.getFullYear(), today.getMonth(), today.getDate()]);
  const upcoming = useMemo(() => getUpcomingCalendarEvents(today, 14), [today.getFullYear(), today.getMonth(), today.getDate()]);
  const currentSelection = selected ?? todayEvents[0] ?? upcoming[0] ?? null;
  const currentHebrew = getHebrewDateInfo(today.getFullYear(), today.getMonth() + 1, today.getDate());

  useEffect(() => {
    if (!selected && currentSelection) setSelected(currentSelection);
  }, [selected, currentSelection]);

  const currentKey = currentSelection?.key ?? "";
  const steps = currentSelection?.guide.steps ?? [];
  const saved = checklists[currentKey] ?? steps.map(() => false);
  const readings = currentSelection?.guide.readings ?? [];

  const openReading = (reference: string) => {
    const passages = parseReference(reference);
    const first = passages[0];
    if (!first) return;
    openBibleRef(first.book.id, first.chapter);
  };

  const toggleStep = (idx: number) => {
    if (!currentSelection) return;
    setChecklists((prev) => {
      const next = [...(prev[currentSelection.key] ?? steps.map(() => false))];
      next[idx] = !next[idx];
      return { ...prev, [currentSelection.key]: next };
    });
  };

  const resetSteps = () => {
    if (!currentSelection) return;
    setChecklists((prev) => ({ ...prev, [currentSelection.key]: steps.map(() => false) }));
  };

  return (
    <>
      <div className="screen-title">Events</div>
      <div className="card">
        <div className="day-header">
          <span className="small muted" style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CalendarIcon className="q-icon" />
            Today
          </span>
          <span className="small muted">
            {today.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div className="hebrew-date small muted" style={{ marginTop: 6 }}>
          {currentHebrew.day} {currentHebrew.monthName} {currentHebrew.year}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Follow along with Shabbat, Rosh Chodesh, and the Hebrew-calendar holidays for the day.
        </p>
      </div>

      <div className="section-label">Today</div>
      <div className="card event-list">
        {todayEvents.length > 0 ? (
          todayEvents.map((event) => (
            <button
              key={event.key}
              className={`event-list-item ${currentSelection?.key === event.key ? "is-active" : ""}`}
              onClick={() => setSelected(event)}
            >
              <span className="event-list-item__date">Today</span>
              <span className="event-list-item__title">{event.guide.title}</span>
              <span className="event-list-item__subtitle">{event.guide.subtitle}</span>
            </button>
          ))
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            No special holiday is listed today. Check upcoming days below.
          </p>
        )}
      </div>

      <div className="section-label">Guided Experience</div>
      {currentSelection ? (
        <div className="card">
          <div className="day-theme">{currentSelection.guide.title}</div>
          <p className="small muted">{currentSelection.guide.meaning}</p>

          {readings.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: 14 }}>Recommended Readings</div>
              <div className="event-readings">
                {readings.map((reading) => (
                  <button
                    key={`${currentSelection.key}::${reading.reference}`}
                    className="event-reading"
                    onClick={() => openReading(reading.reference)}
                  >
                    <span className="event-reading__icon"><BookOpenIcon className="q-icon" /></span>
                    <span className="event-reading__body">
                      <span className="event-reading__title">{reading.label}</span>
                      <span className="event-reading__ref">{reading.reference}</span>
                      {reading.note && <span className="event-reading__note">{reading.note}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="event-steps">
            {steps.map((step, idx) => (
              <button
                key={`${currentSelection.key}-${idx}`}
                className={`event-step ${saved[idx] ? "done" : ""}`}
                onClick={() => toggleStep(idx)}
              >
                <span className={`event-step__check ${saved[idx] ? "done" : ""}`}>
                  <CheckCircleIcon filled={saved[idx]} className="q-icon" />
                </span>
                <span className="event-step__body">
                  <span className="event-step__title">{step.title}</span>
                  {step.transliteration && <span className="event-step__text"><strong>Transliteration:</strong> {step.transliteration}</span>}
                  {step.hebrew && <span className="event-step__text"><strong>Hebrew:</strong> {step.hebrew}</span>}
                  {step.translation && <span className="event-step__text"><strong>English:</strong> {step.translation}</span>}
                  {step.note && <span className="event-step__text">{step.note}</span>}
                </span>
              </button>
            ))}
          </div>

          <div className="audio-card__buttons" style={{ marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={resetSteps}>Reset checklist</button>
            <button className="btn btn-secondary" onClick={() => setSelected(null)}>Back to list</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>
            Select an event to begin its guided steps.
          </p>
        </div>
      )}

      <div className="section-label">Upcoming</div>
      <div className="card event-list">
        {upcoming.length > 0 ? (
          upcoming.slice(0, 10).map((event) => (
            <button
              key={event.key}
              className={`event-list-item ${currentSelection?.key === event.key ? "is-active" : ""}`}
              onClick={() => setSelected(event)}
            >
              <span className="event-list-item__date">
                {event.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="event-list-item__title">{event.guide.title}</span>
              <span className="event-list-item__subtitle">{event.guide.subtitle}</span>
            </button>
          ))
        ) : (
          <p className="small muted" style={{ margin: 0 }}>No upcoming holidays were found in the next two weeks.</p>
        )}
      </div>
    </>
  );
}