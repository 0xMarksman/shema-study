import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearSession,
  fetchPushPublicKey,
  fetchServerState,
  getStoredUser,
  getToken,
  login as apiLogin,
  pushServerState,
  register as apiRegister,
  savePushSubscription,
  storeSession,
} from "../lib/api";
import { PERSONAL_PROGRESS_SCOPE, progressKey, scopedProgressKey, dateForDay } from "../lib/schedule";
import { generateParashaPlan } from "../lib/parashaPlan";
import {
  DEFAULT_SETTINGS,
  TRACKS,
  type PlanDay,
  type PlanState,
  type Settings,
  type Track,
  type User,
} from "../types";
import { generatePlan, generateCustomPlan } from "../lib/planTemplates";

const LEGACY_STATE_KEY = "bible-planner:state";
const STATE_KEY_PREFIX = "bible-planner:state:";
const SKIP_AUTH_KEY = "bible-planner:skip-auth";
const REMINDER_LAST_FIRED_KEY = "bible-planner:reminder:last-fired-at";

function parseReminderTime(reminderTime: string | null | undefined): { hour: number; minute: number } {
  const [rawHour, rawMinute] = (reminderTime ?? "08:00").split(":");
  const hour = Number.isFinite(Number(rawHour)) ? Number(rawHour) : 8;
  const minute = Number.isFinite(Number(rawMinute)) ? Number(rawMinute) : 0;
  return {
    hour: Math.min(23, Math.max(0, hour)),
    minute: Math.min(59, Math.max(0, minute)),
  };
}

function isReminderDay(date: Date, frequency: "daily" | "weekdays" | "weekends"): boolean {
  if (frequency === "daily") return true;
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  return frequency === "weekdays" ? isWeekday : !isWeekday;
}

function getNextReminderDate(from: Date, reminderTime: string, frequency: "daily" | "weekdays" | "weekends"): Date {
  const { hour, minute } = parseReminderTime(reminderTime);
  const next = new Date(from);
  next.setHours(hour, minute, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  while (!isReminderDay(next, frequency)) next.setDate(next.getDate() + 1);
  return next;
}

function getLatestScheduledReminderDate(now: Date, reminderTime: string, frequency: "daily" | "weekdays" | "weekends"): Date {
  const { hour, minute } = parseReminderTime(reminderTime);
  const slot = new Date(now);
  slot.setHours(hour, minute, 0, 0);
  if (slot > now) slot.setDate(slot.getDate() - 1);
  while (!isReminderDay(slot, frequency)) slot.setDate(slot.getDate() - 1);
  return slot;
}

function readLastReminderFiredAt(): number {
  const raw = localStorage.getItem(REMINDER_LAST_FIRED_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeLastReminderFiredAt(timestamp: number): void {
  localStorage.setItem(REMINDER_LAST_FIRED_KEY, String(timestamp));
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64Url(input: ArrayBuffer | null): string | null {
  if (!input) return null;
  let binary = "";
  const bytes = new Uint8Array(input);
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stateKeyForUser(userId: string | null): string {
  return `${STATE_KEY_PREFIX}${userId ? `user:${userId}` : "guest"}`;
}

/**
 * Progress/answers/custom-questions used to be un-scoped (e.g. "day:track",
 * "day:q:idx", or a plain day number); they're now scoped per plan template
 * ("templateId::...") so switching plans doesn't mix up data between them.
 * Old-format entries belonged to whatever template was active, so they
 * migrate into that template's namespace instead of vanishing. Applied to
 * every path that can bring a `PlanState` blob into memory — the initial
 * local load, and both server-sync reconciliation points below.
 */
function migrateState(raw: PlanState): PlanState {
  const templateId = raw.settings?.planTemplateId ?? DEFAULT_SETTINGS.planTemplateId;
  const progress = Array.isArray(raw.progress) ? raw.progress : [];
  const answers = raw.answers && typeof raw.answers === "object" ? raw.answers : {};
  const customQuestions = raw.customQuestions && typeof raw.customQuestions === "object" ? raw.customQuestions : {};

  const migratedAnswers: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    migratedAnswers[key.includes("::") ? key : `${templateId}::${key}`] = value;
  }
  const migratedCustomQuestions: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(customQuestions)) {
    migratedCustomQuestions[key.includes("::") ? key : `${templateId}::${key}`] = value;
  }

  return {
    ...raw,
    progress: progress.map((key) => {
      if (typeof key !== "string") return key;
      if (!key.includes("::")) return `${PERSONAL_PROGRESS_SCOPE}::${templateId}::${key}`;
      const parts = key.split("::");
      if (parts.length === 3) return `${PERSONAL_PROGRESS_SCOPE}::${key}`;
      return key;
    }),
    answers: migratedAnswers,
    customQuestions: migratedCustomQuestions,
  };
}

function loadLocalState(stateKey: string, allowLegacyFallback = false): PlanState {
  try {
    const raw = localStorage.getItem(stateKey);
    if (raw) {
      const parsed = JSON.parse(raw) as PlanState;
      const settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      return migrateState({
        settings,
        progress: Array.isArray(parsed.progress) ? parsed.progress : [],
        answers:
          parsed.answers && typeof parsed.answers === "object" && !Array.isArray(parsed.answers)
            ? parsed.answers
            : {},
        customQuestions:
          parsed.customQuestions && typeof parsed.customQuestions === "object" && !Array.isArray(parsed.customQuestions)
            ? parsed.customQuestions
            : {},
        updatedAt: parsed.updatedAt ?? 0,
      });
    }
    if (allowLegacyFallback) {
      const legacyRaw = localStorage.getItem(LEGACY_STATE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw) as PlanState;
        const settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        return migrateState({
          settings,
          progress: Array.isArray(parsed.progress) ? parsed.progress : [],
          answers:
            parsed.answers && typeof parsed.answers === "object" && !Array.isArray(parsed.answers)
              ? parsed.answers
              : {},
          customQuestions:
            parsed.customQuestions && typeof parsed.customQuestions === "object" && !Array.isArray(parsed.customQuestions)
              ? parsed.customQuestions
              : {},
          updatedAt: parsed.updatedAt ?? 0,
        });
      }
    }
  } catch {
    // Corrupt local state falls through to defaults.
  }
  return { settings: DEFAULT_SETTINGS, progress: [], answers: {}, customQuestions: {}, updatedAt: 0 };
}

interface AppStateValue {
  plan: PlanDay[];
  planLoading: boolean;
  settings: Settings;
  progress: Set<string>;
  answers: Record<string, string>;
  user: User | null;
  isAuthTransitioning: boolean;
  syncError: string | null;
  /** True after the user chose "continue without an account" on the landing page. */
  skippedAuth: boolean;
  skipAuth: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  toggleProgress: (day: number, track: Track) => void;
  toggleProgressScoped: (templateId: string, day: number, track: Track, scopeId: string) => void;
  markProgressThroughDayScoped: (templateId: string, plan: PlanDay[], throughDay: number, scopeId: string) => void;
  isTrackDoneScoped: (templateId: string, day: number, track: Track, scopeId: string) => boolean;
  /** Update a study-question answer. key = `"day:questionIndex"`. */
  updateAnswer: (key: string, html: string) => void;
  customQuestions: Record<string, string[]>;
  addCustomQuestion: (day: number, text: string) => void;
  removeCustomQuestion: (day: number, idx: number) => void;
  resetProgress: () => void;
  register: (username: string, password: string, birthDate: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  openBibleRef: (bookId: number, chapter: number) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (getToken() ? getStoredUser() : null));
  const currentStateKeyRef = useRef(stateKeyForUser(user?.id ?? null));
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [state, setState] = useState<PlanState>(() => loadLocalState(currentStateKeyRef.current, true));
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [skippedAuth, setSkippedAuth] = useState(
    () => localStorage.getItem(SKIP_AUTH_KEY) === "1",
  );
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reminderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pushDeliveryReady, setPushDeliveryReady] = useState(false);

  useEffect(() => {
    const nextKey = stateKeyForUser(user?.id ?? null);
    if (nextKey === currentStateKeyRef.current) return;
    currentStateKeyRef.current = nextKey;
    setState(loadLocalState(nextKey));
    setSyncError(null);
  }, [user?.id]);

  // Load reading plan — either the static plan.json or a generated template.
  useEffect(() => {
    const templateId = state.settings.planTemplateId ?? "default";
    if (templateId !== "default" && templateId !== "custom" && templateId !== "parasha") {
      const generated = generatePlan(templateId);
      if (generated) { setPlan(generated); setPlanLoading(false); return; }
    }
    if (templateId === "custom") {
      const custom = generateCustomPlan(
        state.settings.customPlanBookIds ?? [],
        state.settings.customPlanPace ?? 3,
        true,
      );
      setPlan(custom.length ? custom : []);
      setPlanLoading(false);
      return;
    }
    if (templateId === "parasha") {
      const anchor = state.settings.startDate ? dateForDay(state.settings, 1) ?? new Date() : new Date();
      generateParashaPlan(anchor, 371)
        .then((days) => setPlan(days))
        .catch(() => setSyncError("Couldn't load the Parashah cycle. Check your connection and reload."))
        .finally(() => setPlanLoading(false));
      return;
    }
    fetch("/plan.json")
      .then((res) => res.json())
      .then((days: PlanDay[]) => setPlan(days))
      .catch(() => setSyncError("Couldn't load the reading plan. Check your connection and reload."))
      .finally(() => setPlanLoading(false));
  }, [state.settings.planTemplateId, state.settings.customPlanBookIds, state.settings.customPlanPace, state.settings.startDate, state.settings.startDay]);

  // Persist every state change locally (guest mode works fully offline)…
  useEffect(() => {
    localStorage.setItem(currentStateKeyRef.current, JSON.stringify(state));
  }, [state]);

  // Register Web Push subscription for signed-in users so reminders can fire while app is closed.
  useEffect(() => {
    let cancelled = false;

    async function setupPushSubscription() {
      if (!user) {
        setPushDeliveryReady(false);
        return;
      }
      if (!state.settings.reminderEnabled) {
        setPushDeliveryReady(false);
        return;
      }
      if (!("Notification" in window) || Notification.permission !== "granted") {
        setPushDeliveryReady(false);
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushDeliveryReady(false);
        return;
      }

      try {
        const { publicKey } = await fetchPushPublicKey();
        if (!publicKey) {
          if (!cancelled) setPushDeliveryReady(false);
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        let sub = await registration.pushManager.getSubscription();
        if (!sub) {
          sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
          });
        }

        const serialized = sub.toJSON();
        const endpoint = serialized.endpoint ?? sub.endpoint;
        const p256dh = serialized.keys?.p256dh ?? arrayBufferToBase64Url(sub.getKey("p256dh"));
        const auth = serialized.keys?.auth ?? arrayBufferToBase64Url(sub.getKey("auth"));
        if (!endpoint || !p256dh || !auth) throw new Error("Incomplete Push subscription keys.");

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        await savePushSubscription({ endpoint, keys: { p256dh, auth } }, timezone);
        if (!cancelled) setPushDeliveryReady(true);
      } catch {
        if (!cancelled) setPushDeliveryReady(false);
      }
    }

    void setupPushSubscription();
    return () => {
      cancelled = true;
    };
  }, [user, state.settings.reminderEnabled]);

  // Schedule/cancel browser notification reminders.
  useEffect(() => {
    if (reminderTimer.current) { clearTimeout(reminderTimer.current); reminderTimer.current = null; }
    const { reminderEnabled, reminderTime, reminderFrequency } = state.settings;
    // When Web Push is active for a signed-in account, avoid duplicate local timer notifications.
    if (!reminderEnabled || !("Notification" in window) || Notification.permission !== "granted" || (user && pushDeliveryReady)) return;
    let cancelled = false;

    async function showReminder(reason: "scheduled" | "catchup") {
      const body =
        reason === "catchup"
          ? "Your reminder was missed while the app was inactive. Open your reading for today."
          : "Your daily Bible reading is waiting for you.";
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification("Time to read! 📖", {
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: "daily-reading-reminder",
            data: { url: "/" },
          });
        } else {
          new Notification("Time to read! 📖", {
            body,
            icon: "/icons/icon-192.png",
          });
        }
        writeLastReminderFiredAt(Date.now());
      } catch {
        // Ignore transient notification errors (e.g. registration race conditions).
      }
    }

    function scheduleNext() {
      const next = getNextReminderDate(new Date(), reminderTime, reminderFrequency);
      const ms = Math.max(1000, next.getTime() - Date.now());
      reminderTimer.current = setTimeout(() => {
        void showReminder("scheduled").finally(() => {
          if (!cancelled) scheduleNext();
        });
      }, ms);
    }

    async function maybeCatchUpMissedReminder() {
      const now = new Date();
      const latestSlot = getLatestScheduledReminderDate(now, reminderTime, reminderFrequency);
      const lastFiredAt = readLastReminderFiredAt();
      if (lastFiredAt >= latestSlot.getTime()) return;
      await showReminder("catchup");
    }

    const handleForegroundCheck = () => {
      if (document.visibilityState !== "visible") return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      void maybeCatchUpMissedReminder();
    };

    window.addEventListener("focus", handleForegroundCheck);
    document.addEventListener("visibilitychange", handleForegroundCheck);
    handleForegroundCheck();
    scheduleNext();

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleForegroundCheck);
      document.removeEventListener("visibilitychange", handleForegroundCheck);
      if (reminderTimer.current) clearTimeout(reminderTimer.current);
    };
  }, [state.settings.reminderEnabled, state.settings.reminderTime, state.settings.reminderFrequency, user, pushDeliveryReady]);

  // …and, when signed in, debounce-push it to the server.
  const schedulePush = useCallback((next: PlanState) => {
    if (!getToken()) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        await pushServerState(next);
        setSyncError(null);
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        const body = (err as Error & { body?: { data?: PlanState; updatedAt?: number } }).body;
        if (status === 409 && body?.data) {
          // Another device wrote newer state; adopt it.
          setState(migrateState({ ...body.data, updatedAt: body.updatedAt ?? Date.now() }));
          setSyncError(null);
        } else if (status === 401) {
          setSyncError("Session expired — sign in again to keep syncing.");
        } else {
          setSyncError("Changes saved on this device; syncing will retry.");
        }
      }
    }, 1200);
  }, []);

  const mutate = useCallback(
    (updater: (prev: PlanState) => PlanState) => {
      setState((prev) => {
        const next = { ...updater(prev), updatedAt: Date.now() };
        schedulePush(next);
        return next;
      });
    },
    [schedulePush],
  );

  // On load with a session: pull server state and reconcile.
  useEffect(() => {
    if (!getToken()) return;
    fetchServerState()
      .then(({ data, updatedAt }) => {
        if (!data) {
          // Fresh account with no server state yet — seed it from this device.
          setState((prev) => {
            const next = { ...prev, updatedAt: prev.updatedAt || Date.now() };
            pushServerState(next).catch(() => {});
            return next;
          });
          return;
        }
        setState((prev) => (updatedAt > prev.updatedAt ? migrateState({ ...data, updatedAt }) : prev));
      })
      .catch((err) => {
        if ((err as Error & { status?: number }).status === 401) {
          clearSession();
          setUser(null);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const progress = useMemo(() => new Set(state.progress), [state.progress]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      mutate((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    },
    [mutate],
  );

  const toggleProgress = useCallback(
    (day: number, track: Track) => {
      mutate((prev) => {
        const key = progressKey(prev.settings.planTemplateId, day, track);
        const set = new Set(prev.progress);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return { ...prev, progress: [...set] };
      });
    },
    [mutate],
  );

  const toggleProgressScoped = useCallback(
    (templateId: string, day: number, track: Track, scopeId: string) => {
      mutate((prev) => {
        const key = scopedProgressKey(templateId, day, track, scopeId);
        const set = new Set(prev.progress);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return { ...prev, progress: [...set] };
      });
    },
    [mutate],
  );

  const markProgressThroughDayScoped = useCallback(
    (templateId: string, plan: PlanDay[], throughDay: number, scopeId: string) => {
      if (throughDay < 1 || plan.length === 0) return;
      const clampedThrough = Math.min(throughDay, plan.length);
      mutate((prev) => {
        const set = new Set(prev.progress);
        for (const day of plan) {
          if (day.day > clampedThrough) break;
          for (const track of TRACKS) {
            if (!day[track]) continue;
            set.add(scopedProgressKey(templateId, day.day, track, scopeId));
          }
        }
        return { ...prev, progress: [...set] };
      });
    },
    [mutate],
  );

  const isTrackDoneScoped = useCallback(
    (templateId: string, day: number, track: Track, scopeId: string) => {
      return progress.has(scopedProgressKey(templateId, day, track, scopeId));
    },
    [progress],
  );

  const resetProgress = useCallback(() => {
    // Only clears the active plan's progress — other plans you've switched
    // away from keep theirs, matching the per-template progress scoping.
    mutate((prev) => ({
      ...prev,
      progress: prev.progress.filter(
        (key) => !key.startsWith(`${PERSONAL_PROGRESS_SCOPE}::${prev.settings.planTemplateId}::`),
      ),
    }));
  }, [mutate]);

  const updateAnswer = useCallback(
    (key: string, html: string) => {
      mutate((prev) => ({
        ...prev,
        answers: { ...prev.answers, [key]: html },
      }));
    },
    [mutate],
  );

  const addCustomQuestion = useCallback(
    (day: number, text: string) => {
      mutate((prev) => {
        const key = `${prev.settings.planTemplateId}::${day}`;
        const existing = prev.customQuestions?.[key] ?? [];
        return {
          ...prev,
          customQuestions: { ...(prev.customQuestions ?? {}), [key]: [...existing, text] },
        };
      });
    },
    [mutate],
  );

  const removeCustomQuestion = useCallback(
    (day: number, idx: number) => {
      mutate((prev) => {
        const key = `${prev.settings.planTemplateId}::${day}`;
        const existing = [...(prev.customQuestions?.[key] ?? [])];
        existing.splice(idx, 1);
        return {
          ...prev,
          customQuestions: { ...(prev.customQuestions ?? {}), [key]: existing },
        };
      });
    },
    [mutate],
  );

  const adoptSession = useCallback(
    async (token: string, nextUser: User) => {
      setIsAuthTransitioning(true);
      storeSession(token, nextUser);
      setUser(nextUser);
      // Pull-and-reconcile runs via the user effect; merge progress by union so a
      // first sign-in on a second device never loses locally tracked readings.
      try {
        const { data, updatedAt } = await fetchServerState();
        if (data) {
          const migratedData = migrateState(data);
          setState((prev) => {
            const merged: PlanState = {
              settings: updatedAt > prev.updatedAt ? migratedData.settings : prev.settings,
              progress: [...new Set([...prev.progress, ...migratedData.progress])],
              answers: updatedAt > prev.updatedAt ? (data.answers ?? {}) : prev.answers,
              customQuestions: updatedAt > prev.updatedAt ? (data.customQuestions ?? {}) : (prev.customQuestions ?? {}),
              updatedAt: Date.now(),
            };
            pushServerState(merged).catch(() => {});
            return merged;
          });
        }
      } catch {
        // Reconcile effect will retry on next load.
      } finally {
        setIsAuthTransitioning(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (username: string, password: string, birthDate: string) => {
      const { token, user: nextUser } = await apiRegister(username, password, birthDate);
      await adoptSession(token, nextUser);
    },
    [adoptSession],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const { token, user: nextUser } = await apiLogin(username, password);
      await adoptSession(token, nextUser);
    },
    [adoptSession],
  );

  const skipAuth = useCallback(() => {
    localStorage.setItem(SKIP_AUTH_KEY, "1");
    setSkippedAuth(true);
  }, []);

  const openBibleRef = useCallback((bookId: number, chapter: number) => {
    updateSettings({ lastBookId: bookId, lastChapter: chapter });
    window.dispatchEvent(new CustomEvent("navigate-bible"));
  }, [updateSettings]);

  const logout = useCallback(() => {
    clearSession();
    // Signing out returns to the landing page, so clear any earlier "skip" too.
    localStorage.removeItem(SKIP_AUTH_KEY);
    setSkippedAuth(false);
    setIsAuthTransitioning(false);
    setUser(null);
  }, []);

  const value: AppStateValue = {
    plan,
    planLoading,
    settings: state.settings,
    progress,
    answers: state.answers,
    customQuestions: state.customQuestions ?? {},
    user,
    isAuthTransitioning,
    syncError,
    skippedAuth,
    skipAuth,
    updateSettings,
    toggleProgress,
    toggleProgressScoped,
    markProgressThroughDayScoped,
    isTrackDoneScoped,
    updateAnswer,
    addCustomQuestion,
    removeCustomQuestion,
    resetProgress,
    register,
    login,
    logout,
    openBibleRef,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used within AppStateProvider");
  return value;
}
