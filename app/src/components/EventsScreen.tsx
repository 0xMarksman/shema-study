import { useEffect, useMemo, useState } from "react";
import { getHebrewDateInfo } from "../lib/hebrewCalendar";
import { getCalendarEventsForDate, getUpcomingCalendarEvents, type CalendarEventEntry } from "../lib/eventGuides";
import { useAppState } from "../state/AppState";
import { BookOpenIcon, CheckCircleIcon, CalendarIcon } from "./icons";

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
  useAppState();
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
      <div className="card">
        {todayEvents.length > 0 ? (
          todayEvents.map((event) => (
            <button
              key={event.key}
              className={`plan-template-option ${currentSelection?.key === event.key ? "selected" : ""}`}
              data-active={currentSelection?.key === event.key}
              onClick={() => setSelected(event)}
            >
              <span style={{ fontWeight: 700 }}>{event.guide.title}</span>
              <span className="small muted">{event.guide.subtitle}</span>
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
      <div className="card">
        {upcoming.length > 0 ? (
          upcoming.slice(0, 10).map((event) => (
            <button
              key={event.key}
              className={`reading-row ${currentSelection?.key === event.key ? "done" : ""}`}
              onClick={() => setSelected(event)}
            >
              <span className="reading-main" style={{ paddingLeft: 0 }}>
                <BookOpenIcon />
                <span style={{ minWidth: 0 }}>
                  <span className="reading-track">{event.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <br />
                  <span className="reading-ref">{event.guide.title}</span>
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="small muted" style={{ margin: 0 }}>No upcoming holidays were found in the next two weeks.</p>
        )}
      </div>
    </>
  );
}