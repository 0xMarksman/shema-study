import crypto from "node:crypto";
import webpush from "web-push";
import { db } from "./db.js";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@example.com";

const WEB_PUSH_ENABLED = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (WEB_PUSH_ENABLED) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn("[Push] VAPID keys not configured; Web Push reminders are disabled.");
}

function isReminderDay(dayOfWeek, frequency) {
  if (frequency === "daily") return true;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  return frequency === "weekdays" ? isWeekday : !isWeekday;
}

function parseTime(reminderTime) {
  const [rawHour, rawMinute] = String(reminderTime ?? "08:00").split(":");
  const hour = Number.isFinite(Number(rawHour)) ? Number(rawHour) : 8;
  const minute = Number.isFinite(Number(rawMinute)) ? Number(rawMinute) : 0;
  return {
    hour: Math.min(23, Math.max(0, hour)),
    minute: Math.min(59, Math.max(0, minute)),
  };
}

function getLocalDateParts(now, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });

  const entries = Object.create(null);
  for (const part of dtf.formatToParts(now)) {
    if (part.type !== "literal") entries[part.type] = part.value;
  }

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekday = String(entries.weekday ?? "Sun");

  return {
    year: String(entries.year ?? "1970"),
    month: String(entries.month ?? "01"),
    day: String(entries.day ?? "01"),
    hour: Number(entries.hour ?? 0),
    minute: Number(entries.minute ?? 0),
    dayOfWeek: weekdayMap[weekday] ?? 0,
  };
}

function toSlotKey(parts, reminderTime) {
  return `${parts.year}-${parts.month}-${parts.day}|${String(reminderTime ?? "08:00")}`;
}

function shouldSendNow(settings, now, timeZone) {
  if (!settings?.reminderEnabled) return { due: false, slotKey: null };
  const frequency = settings.reminderFrequency;
  if (!["daily", "weekdays", "weekends"].includes(frequency)) {
    return { due: false, slotKey: null };
  }

  const parts = getLocalDateParts(now, timeZone);
  const { hour, minute } = parseTime(settings.reminderTime);
  if (parts.hour !== hour || parts.minute !== minute) {
    return { due: false, slotKey: null };
  }
  if (!isReminderDay(parts.dayOfWeek, frequency)) {
    return { due: false, slotKey: null };
  }
  return {
    due: true,
    slotKey: toSlotKey(parts, settings.reminderTime),
  };
}

export function getPushConfig() {
  return {
    enabled: WEB_PUSH_ENABLED,
    publicKey: WEB_PUSH_ENABLED ? VAPID_PUBLIC_KEY : null,
  };
}

export async function upsertPushSubscription({ userId, endpoint, p256dh, auth, timezone, userAgent }) {
  const now = Date.now();
  const existing = await db.execute({
    sql: "SELECT id FROM push_subscriptions WHERE endpoint = ?",
    args: [endpoint],
  });

  const id = existing.rows[0]?.id ? String(existing.rows[0].id) : crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, timezone, user_agent, disabled, last_error, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET
            user_id = excluded.user_id,
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            timezone = excluded.timezone,
            user_agent = excluded.user_agent,
            disabled = 0,
            last_error = NULL,
            updated_at = excluded.updated_at`,
    args: [id, userId, endpoint, p256dh, auth, timezone ?? null, userAgent ?? null, now, now],
  });
}

export async function deletePushSubscriptionByEndpoint(userId, endpoint) {
  await db.execute({
    sql: "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
    args: [userId, endpoint],
  });
}

export async function sendPushNow(userId, payload) {
  if (!WEB_PUSH_ENABLED) return { attempted: 0, sent: 0 };

  const { rows } = await db.execute({
    sql: "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND disabled = 0",
    args: [userId],
  });

  let sent = 0;
  for (const row of rows) {
    const subId = String(row.id);
    const subscription = {
      endpoint: String(row.endpoint),
      keys: {
        p256dh: String(row.p256dh),
        auth: String(row.auth),
      },
    };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      sent += 1;
      await db.execute({
        sql: "UPDATE push_subscriptions SET last_success_at = ?, last_error = NULL WHERE id = ?",
        args: [Date.now(), subId],
      });
    } catch (err) {
      const statusCode = Number(err?.statusCode ?? 0);
      const message = String(err?.message ?? "Push send failed").slice(0, 400);
      const disabled = statusCode === 404 || statusCode === 410 ? 1 : 0;
      await db.execute({
        sql: "UPDATE push_subscriptions SET disabled = CASE WHEN ? = 1 THEN 1 ELSE disabled END, last_error = ?, updated_at = ? WHERE id = ?",
        args: [disabled, message, Date.now(), subId],
      });
    }
  }

  return { attempted: rows.length, sent };
}

async function runReminderTick() {
  if (!WEB_PUSH_ENABLED) return;

  const now = new Date();
  const { rows } = await db.execute({
    sql: "SELECT user_id, data FROM plan_states",
    args: [],
  });

  for (const row of rows) {
    const userId = String(row.user_id);
    let settings = null;
    try {
      const parsed = JSON.parse(String(row.data));
      settings = parsed?.settings ?? null;
    } catch {
      continue;
    }

    const tzRows = await db.execute({
      sql: "SELECT timezone FROM push_subscriptions WHERE user_id = ? AND disabled = 0 ORDER BY updated_at DESC LIMIT 1",
      args: [userId],
    });
    if (!tzRows.rows[0]) continue;

    const timezone = String(tzRows.rows[0].timezone || "UTC");
    const { due, slotKey } = shouldSendNow(settings, now, timezone);
    if (!due || !slotKey) continue;

    const insertResult = await db.execute({
      sql: `INSERT INTO reminder_push_log (user_id, slot_key, sent_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, slot_key) DO NOTHING`,
      args: [userId, slotKey, Date.now()],
    });

    if ((insertResult.rowsAffected ?? 0) === 0) continue;

    await sendPushNow(userId, {
      title: "Time to read! 📖",
      body: "Your daily Bible reading is waiting for you.",
      url: "/",
      tag: `daily-reading-reminder:${slotKey}`,
      sentAt: Date.now(),
    });
  }
}

export function startPushReminderScheduler() {
  if (!WEB_PUSH_ENABLED) return;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runReminderTick();
    } catch (err) {
      console.error("[Push reminders] tick failed", err);
    } finally {
      running = false;
    }
  };

  // Kick once shortly after boot, then once per minute.
  setTimeout(() => { void tick(); }, 1500);
  setInterval(() => { void tick(); }, 60_000);
}
