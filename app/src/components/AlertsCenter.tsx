import { useCallback, useEffect, useState } from "react";
import type { AppNotification } from "../types";
import { listNotifications, markNotificationsRead } from "../lib/api";
import { realtime } from "../lib/realtime";
import { BellIcon } from "./icons";

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AlertsCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      setNotifications((await listNotifications()).notifications);
    } catch { /* alerts are non-blocking */ }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => realtime.on("notification:new", () => { void reload(); }), [reload]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const visibleNotifications = [
    ...notifications.filter((notification) => !notification.read),
    ...notifications.filter((notification) => notification.read).slice(0, 5),
  ];

  return (
    <div className="alerts-center">
      <button
        className="alerts-trigger"
        aria-label={unreadCount ? `${unreadCount} unread alerts` : "Alerts"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel alerts-panel">
          <div className="notif-panel-header">
            <span>Alerts</span>
            <div className="notif-panel-actions">
              {unreadCount > 0 && (
                <button className="link-btn small" onClick={async () => {
                  await markNotificationsRead().catch(() => {});
                  setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
                }}>Mark all read</button>
              )}
              <button className="link-btn small" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
          {visibleNotifications.length === 0 && <p className="notif-empty">No alerts yet.</p>}
          {visibleNotifications.map((notification) => {
            const canNavigate = Boolean(notification.channelId && ["message", "reaction", "thread_new"].includes(notification.type));
            const channelTitle = notification.data.channelTitle
              ? String(notification.data.channelTitle)
              : `@${String(notification.data.fromUsername ?? "")}`;
            return (
              <div
                key={notification.id}
                className={`notif-item ${notification.read ? "" : "notif-unread"}${canNavigate ? " notif-item-nav" : ""}`}
                role={canNavigate ? "button" : undefined}
                tabIndex={canNavigate ? 0 : undefined}
                onClick={() => {
                  if (!canNavigate) return;
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent("navigate-messages", {
                    detail: { channelId: notification.channelId, title: channelTitle, isGroup: Boolean(notification.data.isGroup) },
                  }));
                }}
              >
                <span className="notif-icon">{notification.type === "reaction" ? "❤️" : notification.type === "group_join" ? "👥" : "💬"}</span>
                <div className="notif-body">
                  {notification.type === "reaction" && <span><b>{String(notification.data.fromUsername ?? "Someone")}</b> reacted {String(notification.data.emoji ?? "")}</span>}
                  {notification.type === "message" && <span><b>{String(notification.data.fromUsername ?? "Someone")}</b>{notification.data.channelTitle ? <> in <b>{String(notification.data.channelTitle)}</b></> : " sent a message"}</span>}
                  {notification.type === "group_join" && <span>Someone joined your group</span>}
                  {notification.type === "thread_new" && <span>A new group thread is available</span>}
                  <span className="notif-time">{formatRelativeTime(notification.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}