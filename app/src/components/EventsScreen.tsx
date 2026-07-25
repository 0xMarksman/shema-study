import { useEffect, useMemo, useState } from "react";
import { parseReference } from "../lib/passage";
import { getHebrewDateInfo } from "../lib/hebrewCalendar";
import { getCalendarEventsForDate, getCalendarEventsForYear, getUpcomingCalendarEvents, type CalendarEventEntry } from "../lib/eventGuides";
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
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  useEffect(() => {
    localStorage.setItem(EVENT_PROGRESS_KEY, JSON.stringify(checklists));
  }, [checklists]);

  const today = new Date();
  const todayEvents = useMemo(() => getCalendarEventsForDate(today), [today.getFullYear(), today.getMonth(), today.getDate()]);
  const upcoming = useMemo(() => getUpcomingCalendarEvents(today, 14), [today.getFullYear(), today.getMonth(), today.getDate()]);
  const yearEvents = useMemo(() => getCalendarEventsForYear(calendarYear).filter((event) => event.holiday.type !== "shabbat"), [calendarYear]);
  const currentSelection = selected ?? todayEvents[0] ?? upcoming[0] ?? null;
  const currentHebrew = getHebrewDateInfo(today.getFullYear(), today.getMonth() + 1, today.getDate());

  useEffect(() => {
    if (!selected && currentSelection) setSelected(currentSelection);
  }, [selected, currentSelection]);

  useEffect(() => {
    if (yearEvents.length === 0) {
      return;
    }
    if (!selected || selected.date.getFullYear() !== calendarYear) {
      setSelected(yearEvents[0]);
    }
  }, [calendarYear, selected, yearEvents]);

  const currentKey = currentSelection?.key ?? "";
  const steps = currentSelection?.guide.steps ?? [];
  const saved = checklists[currentKey] ?? steps.map(() => false);
  const readings = currentSelection?.guide.readings ?? [];
  const calendarMonthDate = new Date(calendarYear, calendarMonth, 1);
  const calendarMonthEvents = useMemo(
    () => yearEvents.filter((event) => event.date.getMonth() === calendarMonth),
    [calendarMonth, yearEvents],
  );
  const calendarCells = useMemo(() => {
    const cells: Array<{ date: Date | null; events: CalendarEventEntry[] }> = [];
    const firstDay = calendarMonthDate.getDay();
    for (let empty = 0; empty < firstDay; empty++) {
      cells.push({ date: null, events: [] });
    }
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarYear, calendarMonth, day);
      cells.push({
        date,
        events: getCalendarEventsForDate(date).filter((event) => event.holiday.type !== "shabbat"),
      });
    }
    return cells;
  }, [calendarMonthDate, calendarMonth, calendarYear]);
  const monthGroups = useMemo(() => {
    const groups = new Map<number, CalendarEventEntry[]>();
    for (const event of yearEvents) {
      const month = event.date.getMonth();
      const list = groups.get(month) ?? [];
      list.push(event);
      groups.set(month, list);
    }
    return Array.from(groups.entries()).map(([month, events]) => ({ month, events }));
  }, [yearEvents]);

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

  const goToPreviousMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const jumpToTodayMonth = () => {
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth());
  };

  const openDayEvent = (date: Date | null, events: CalendarEventEntry[]) => {
    if (!date || events.length === 0) return;
    setCalendarYear(date.getFullYear());
    setCalendarMonth(date.getMonth());
    setSelected(events[0]);
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

      <div className="section-label">Calendar</div>
      <div className="card event-calendar-card">
        <div className="event-calendar-header">
          <button className="btn btn-secondary event-calendar-nav" onClick={goToPreviousMonth} aria-label="Previous month">
            <span aria-hidden>‹</span>
          </button>
          <div className="event-calendar-header__title">
            <CalendarIcon className="q-icon" />
            <div>
              <div className="event-calendar-header__month">{calendarMonthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
              <div className="small muted">Dots mark holidays and holy days, excluding weekly Shabbat.</div>
            </div>
          </div>
          <button className="btn btn-secondary event-calendar-nav" onClick={goToNextMonth} aria-label="Next month">
            <span aria-hidden>›</span>
          </button>
        </div>

        <div className="event-calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="event-calendar-grid">
          {calendarCells.map((cell, idx) => {
            const active = cell.date && currentSelection?.date.toDateString() === cell.date.toDateString();
            const hasEvents = cell.events.length > 0;
            return (
              <button
                key={`${calendarYear}-${calendarMonth}-${idx}`}
                className={`event-calendar-day ${!cell.date ? "is-empty" : ""} ${active ? "is-active" : ""} ${hasEvents ? "has-event" : ""}`}
                onClick={() => openDayEvent(cell.date, cell.events)}
                disabled={!cell.date}
                aria-label={cell.date ? cell.date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Empty calendar cell"}
              >
                {cell.date && <span className="event-calendar-day__num">{cell.date.getDate()}</span>}
                {hasEvents && <span className="event-calendar-dot" aria-hidden />}
              </button>
            );
          })}
        </div>

        <div className="event-calendar-actions">
          <button className="btn btn-secondary" onClick={jumpToTodayMonth}>Today</button>
          <button className="btn btn-secondary" onClick={() => setSelected(calendarMonthEvents[0] ?? currentSelection)}>Open first event</button>
        </div>

        <div className="event-calendar-month-list">
          {calendarMonthEvents.length > 0 ? (
            calendarMonthEvents.map((event) => (
              <button
                key={event.key}
                className={`event-list-item ${currentSelection?.key === event.key ? "is-active" : ""}`}
                onClick={() => setSelected(event)}
              >
                <span className="event-list-item__date">
                  {event.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="event-list-item__title">{event.guide.title}</span>
                <span className="event-list-item__subtitle">{event.guide.subtitle}</span>
              </button>
            ))
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              No non-Shabbat holidays were found for this month.
            </p>
          )}
        </div>
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

      <div className="section-label">Calendar Year</div>
      <div className="card">
        <div className="event-year-controls">
          <label htmlFor="event-year" className="small muted" style={{ fontWeight: 700 }}>Browse year</label>
          <input
            id="event-year"
            type="number"
            min={2020}
            max={2035}
            value={calendarYear}
            onChange={(e) => setCalendarYear(Math.min(2035, Math.max(2020, Number(e.target.value) || calendarYear)))}
          />
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Scan the full calendar year, month by month, and tap any item to open its guide and readings.
        </p>
      </div>

      <div className="calendar-year-list">
        {monthGroups.map(({ month, events }) => (
          <section key={`${calendarYear}-${month}`} className="card calendar-month-group">
            <div className="calendar-month-title">
              {new Date(calendarYear, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>
            <div className="event-list">
              {events.map((event) => (
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
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}