import { useCallback, useEffect, useState } from "react";
import type { DmChannel, Group } from "../types";
import { listDMs, listGroups } from "../lib/api";
import { realtime } from "../lib/realtime";
import { useAppState } from "../state/AppState";
import { ChatIcon, ChevronRightIcon, UsersIcon } from "./icons";
import ChatView from "./ChatView";

type View =
  | { kind: "list" }
  | { kind: "chat"; channelId: string; title: string; groupId?: string };

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function MessagesScreen() {
  const { user } = useAppState();
  const [view, setView] = useState<View>({ kind: "list" });
  const [dms, setDms] = useState<DmChannel[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [dmResult, groupResult] = await Promise.all([listDMs(), listGroups()]);
      setDms(dmResult.dms);
      setGroups(groupResult.groups);
    } catch { /* keep the last loaded list */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => realtime.on("message:new", () => { void reload(); }), [reload]);
  useEffect(() => {
    const unsubRemoved = realtime.on("group:removed", () => { void reload(); });
    const unsubDeleted = realtime.on("group:deleted", () => { void reload(); });
    return () => { unsubRemoved(); unsubDeleted(); };
  }, [reload]);

  if (!user) return <div className="groups-empty"><p>Sign in to see your messages.</p></div>;

  if (view.kind === "chat") {
    return (
      <ChatView
        channelId={view.channelId}
        title={view.title}
        isGroup={Boolean(view.groupId)}
        groupId={view.groupId}
        isGroupAdmin={groups.find((group) => group.id === view.groupId)?.role === "admin"}
        onBack={() => setView({ kind: "list" })}
      />
    );
  }

  const chatGroups = groups.filter((group) => group.channelId);
  return (
    <div className="groups-screen messages-screen">
      <div className="groups-header">
        <h2 className="groups-title">Messages</h2>
      </div>

      {loading && <p className="groups-loading">Loading...</p>}

      <section className="groups-section">
        <h3 className="groups-section-title">Direct Messages</h3>
        {!loading && dms.length === 0 && <p className="groups-empty-text">No direct messages yet.</p>}
        {dms.map((dm) => (
          <button key={dm.channelId} className="groups-row" onClick={() => setView({ kind: "chat", channelId: dm.channelId, title: `@${dm.otherUser.username}` })}>
            <div className="groups-row-avatar">{dm.otherUser.username.charAt(0).toUpperCase()}</div>
            <div className="groups-row-info">
              <span className="groups-row-name">@{dm.otherUser.username}</span>
              {dm.lastMessageAt && <span className="groups-row-sub">{formatRelativeTime(dm.lastMessageAt)}</span>}
            </div>
            <ChevronRightIcon className="groups-row-chevron" />
          </button>
        ))}
      </section>

      <section className="groups-section">
        <h3 className="groups-section-title">Group Chats</h3>
        {!loading && chatGroups.length === 0 && <p className="groups-empty-text">You are not part of any group chats yet.</p>}
        {chatGroups.map((group) => (
          <button key={group.id} className="groups-row" onClick={() => setView({ kind: "chat", channelId: group.channelId!, title: group.name, groupId: group.id })}>
            <div className="groups-row-avatar">{group.icon || group.name.charAt(0).toUpperCase()}</div>
            <div className="groups-row-info">
              <span className="groups-row-name">{group.name}</span>
              <span className="groups-row-sub">{group.role === "admin" ? "Admin" : "Member"} · Group chat</span>
            </div>
            <ChevronRightIcon className="groups-row-chevron" />
          </button>
        ))}
      </section>

      {!loading && !dms.length && !chatGroups.length && (
        <div className="groups-onboarding">
          <ChatIcon className="groups-onboarding-icon" />
          <p>Your conversations will appear here.</p>
          <button className="btn-secondary" onClick={() => window.dispatchEvent(new Event("navigate-groups"))}><UsersIcon /> Browse Groups</button>
        </div>
      )}
    </div>
  );
}