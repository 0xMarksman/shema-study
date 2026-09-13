import { useEffect, useState, useCallback } from "react";
import type { Group, GroupMember, Thread, PlanDay } from "../types";
import {
  listGroups, getGroup, createGroup, joinGroup, lookupInviteCode,
  updateGroup, deleteGroup, leaveGroup, removeGroupMember, setGroupMemberRole,
  setInviteSettings, regenerateInviteCode,
  uploadPublicKey as _uploadPublicKey, fetchPublicKey,
  uploadGroupKey,
  listThreads, createThread, updateThread, deleteThread,
} from "../lib/api";
import {
  getOrCreateKeyPair, exportPublicKey, generateChannelKey,
  encryptChannelKey, importPublicKey, cacheChannelKey,
} from "../lib/encryption";
import { realtime } from "../lib/realtime";
import { useAppState } from "../state/AppState";
import {
  UsersIcon, PersonAddIcon,
  ChevronRightIcon, CopyIcon, PencilIcon, GearIcon,
  TrashIcon, LogOutIcon, CheckCircleIcon, BookOpenIcon,
} from "./icons";
import { DayNumberInput } from "./DayNumberInput";
import { ReaderOverlay, type ReaderRequest } from "./ReaderOverlay";
import { TRACK_LABELS, TRACKS } from "../types";
import { groupProgressScopeId, isGroupProgressOptedIn, setGroupProgressOptIn } from "../lib/groupPlanProgress";
import { PLAN_TEMPLATES, generatePlan } from "../lib/planTemplates";
import { generateParashaPlan } from "../lib/parashaPlan";

const GROUP_PLAN_TEMPLATES = PLAN_TEMPLATES.filter((template) => template.id !== "custom");

function groupTemplateMeta(templateId: string) {
  return GROUP_PLAN_TEMPLATES.find((template) => template.id === templateId)
    ?? GROUP_PLAN_TEMPLATES.find((template) => template.id === "default")
    ?? GROUP_PLAN_TEMPLATES[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "join" }
  | { kind: "detail"; groupId: string };

// ─── GroupsScreen ─────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const { user } = useAppState();
  const [view, setView] = useState<View>({ kind: "list" });
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const gRes = await listGroups();
      setGroups(gRes.groups);
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { void reload(); }, [reload]);

  // WS: new thread
  useEffect(() => {
    const unsub = realtime.on("thread:new", () => { void reload(); });
    return unsub;
  }, [reload]);

  // WS: group membership changed elsewhere (removed/left/deleted) — keep the list in sync
  useEffect(() => {
    const unsubRemoved = realtime.on("group:removed", () => { void reload(); });
    const unsubDeleted = realtime.on("group:deleted", () => { void reload(); });
    return () => { unsubRemoved(); unsubDeleted(); };
  }, [reload]);

  if (!user) return (
    <div className="groups-empty">
      <p>Sign in to access your groups.</p>
    </div>
  );

  // Sub-view routing
  if (view.kind === "create") {
    return <CreateGroupView onBack={() => setView({ kind: "list" })} onCreate={reload} />;
  }
  if (view.kind === "join") {
    return <JoinGroupView onBack={() => setView({ kind: "list" })} onJoin={reload} />;
  }
  if (view.kind === "detail") {
    return (
      <GroupDetailView
        groupId={view.groupId}
        onBack={() => setView({ kind: "list" })}
        onChanged={reload}
      />
    );
  }

  // Main list view
  return (
    <div className="groups-screen">
      <div className="groups-header">
        <h2 className="groups-title">Groups</h2>
        <div className="groups-header-actions">
          <button className="groups-header-btn" title="Join a group" onClick={() => setView({ kind: "join" })}>
            <PersonAddIcon />
            <span>Join</span>
          </button>
          <button className="groups-header-btn" title="Create group" onClick={() => setView({ kind: "create" })}>
            <UsersIcon />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {loading && !groups.length && <p className="groups-loading">Loading…</p>}

      {groups.length > 0 && (
        <section className="groups-section">
          <h3 className="groups-section-title">Study Groups</h3>
          {groups.map((g) => (
            <button
              key={g.id}
              className="groups-row"
              onClick={() => setView({ kind: "detail", groupId: g.id })}
            >
              <div className="groups-row-avatar">{g.icon || g.name.charAt(0).toUpperCase()}</div>
              <div className="groups-row-info">
                <span className="groups-row-name">{g.name}</span>
                <span className="groups-row-sub">
                  {g.role === "admin" ? "Admin" : "Member"} · {groupTemplateMeta(g.planTemplateId || "default").name}
                </span>
              </div>
              <ChevronRightIcon className="groups-row-chevron" />
            </button>
          ))}
        </section>
      )}

      {groups.length === 0 && !loading && (
        <div className="groups-onboarding">
          <UsersIcon className="groups-onboarding-icon" />
          <p>Join or create a study group to read and discuss together.</p>
          <div className="groups-onboarding-actions">
            <button className="btn-primary" onClick={() => setView({ kind: "create" })}>Create Group</button>
            <button className="btn-secondary" onClick={() => setView({ kind: "join" })}>Join Group</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Group ─────────────────────────────────────────────────────────────

/** Shared icon palette for group and thread pickers — one big list rather than two small, near-duplicate ones. */
const ICON_EMOJIS = [
  "💬", "📖", "🙏", "❤️", "✝️", "✡️", "🕎", "🕊️",
  "⭐", "🌟", "✨", "💡", "🔥", "⚡", "💧", "🌈",
  "📝", "🗣️", "📌", "🎯", "❓", "❗", "✅",
  "🌿", "🌾", "🌸", "🌻", "🌳", "🌊", "☀️", "🌙", "🌅",
  "📜", "📿", "⛪", "🛡️", "👑", "🔑", "🏠", "⛺", "🎁",
  "🍞", "🍇", "🐑", "🐟", "🕯️", "☮️",
  "🎶", "🎵", "📚", "🗓️",
  "🤝", "🙌", "👋", "👥",
  "😀", "😊", "😂", "🤔", "😢", "😮", "🎉", "🥳", "💕",
];

function CreateGroupView({ onBack, onCreate }: { onBack: () => void; onCreate: () => void }) {
  const { settings, user } = useAppState();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("📖");
  const [editingIcon, setEditingIcon] = useState(false);
  const [startDate, setStartDate] = useState(settings.startDate ?? "");
  const [startDay, setStartDay] = useState(settings.startDay);
  const [planTemplateId, setPlanTemplateId] = useState(
    GROUP_PLAN_TEMPLATES.some((template) => template.id === settings.planTemplateId)
      ? settings.planTemplateId
      : "default",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Group name is required."); return; }
    setBusy(true);
    setErr(null);
    try {
      const result = await createGroup(
        name.trim(),
        desc.trim(),
        startDate || undefined,
        startDay,
        icon,
        planTemplateId,
      );
      // Provision group channel key for the creator
      try {
        const pair = await getOrCreateKeyPair();
        const myJwk = await exportPublicKey(pair.publicKey);
        const myPubKey = await importPublicKey(myJwk);
        const channelKey = await generateChannelKey();
        // Encrypt for self (as group admin)
        const encryptedKey = await encryptChannelKey(channelKey, myPubKey);
        const { id: userId } = user!;
        await uploadGroupKey(result.id, userId, encryptedKey);
        cacheChannelKey(result.id, channelKey);
      } catch { /* non-fatal */ }
      onCreate();
      onBack();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create group.");
    }
    setBusy(false);
  }

  return (
    <div className="groups-screen">
      <div className="groups-header">
        <button className="groups-back-btn" onClick={onBack}>&larr; Back</button>
        <h2 className="groups-title">New Group</h2>
      </div>
      <form className="groups-form" onSubmit={(e) => void handleSubmit(e)}>
        <label className="groups-label">
          Group name
          <div className="thread-emoji-row">
            <button type="button" className="thread-emoji-trigger" onClick={() => setEditingIcon((v) => !v)}>
              <span className="thread-emoji-big">{icon}</span>
              <PencilIcon className="thread-emoji-edit-icon" />
            </button>
            {editingIcon && (
              <div className="thread-emoji-picker">
                {ICON_EMOJIS.map((e) => (
                  <button key={e} type="button" className={`thread-emoji-opt ${e === icon ? "selected" : ""}`}
                    onClick={() => { setIcon(e); setEditingIcon(false); }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
            <input className="groups-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Morning Torah Study" style={{ flex: 1 }} />
          </div>
        </label>
        <label className="groups-label">
          Description (optional)
          <textarea className="groups-input groups-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} rows={3} placeholder="What this group is about…" />
        </label>
        <label className="groups-label">
          Plan start date (optional)
          <input className="groups-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="groups-label">
          Group reading plan
          <select className="groups-input" value={planTemplateId} onChange={(e) => setPlanTemplateId(e.target.value)}>
            {GROUP_PLAN_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label className="groups-label">
          Starting from day #{startDay}
          <DayNumberInput
            className="groups-input"
            max={Math.max(1, groupTemplateMeta(planTemplateId)?.days || 365)}
            value={startDay}
            onCommit={setStartDay}
          />
        </label>
        {err && <p className="groups-error">{err}</p>}
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create Group"}
        </button>
      </form>
    </div>
  );
}

// ─── Join Group ───────────────────────────────────────────────────────────────

function JoinGroupView({ onBack, onJoin }: { onBack: () => void; onJoin: () => void }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{ id: string; name: string; description: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 3) return;
    setBusy(true); setErr(null);
    try {
      const res = await lookupInviteCode(code.trim());
      setPreview(res);
    } catch {
      setErr("Invalid invite code. Check and try again.");
      setPreview(null);
    }
    setBusy(false);
  }

  async function handleJoin() {
    if (!preview) return;
    setBusy(true); setErr(null);
    try {
      await joinGroup(code.trim());
      onJoin();
      onBack();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to join.");
    }
    setBusy(false);
  }

  return (
    <div className="groups-screen">
      <div className="groups-header">
        <button className="groups-back-btn" onClick={onBack}>&larr; Back</button>
        <h2 className="groups-title">Join Group</h2>
      </div>
      <form className="groups-form" onSubmit={(e) => void handleLookup(e)}>
        <label className="groups-label">
          Invite code
          <input
            className="groups-input"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setPreview(null); }}
            placeholder="Enter 8-character code"
            maxLength={8}
          />
        </label>
        {err && <p className="groups-error">{err}</p>}
        {!preview && (
          <button className="btn-primary" type="submit" disabled={busy || code.trim().length < 3}>
            {busy ? "Looking up…" : "Look Up"}
          </button>
        )}
      </form>
      {preview && (
        <div className="groups-preview-card">
          <h3 className="groups-preview-name">{preview.name}</h3>
          {preview.description && <p className="groups-preview-desc">{preview.description}</p>}
          {err && <p className="groups-error">{err}</p>}
          <div className="groups-preview-actions">
            <button className="btn-primary" onClick={() => void handleJoin()} disabled={busy}>
              {busy ? "Joining…" : "Join Group"}
            </button>
            <button className="btn-secondary" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group Detail ─────────────────────────────────────────────────────────────

function GroupDetailView({
  groupId, onBack, onChanged,
}: {
  groupId: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { user, isTrackDoneScoped, toggleProgressScoped, markProgressThroughDayScoped } = useAppState();
  const [group, setGroup] = useState<(Group & { members: GroupMember[] }) | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [groupPlan, setGroupPlan] = useState<PlanDay[]>([]);
  const [showNewThread, setShowNewThread] = useState(false);
  const [editingThread, setEditingThread] = useState<Thread | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reader, setReader] = useState<ReaderRequest | null>(null);
  const [groupProgressEnabled, setGroupProgressEnabled] = useState(false);
  const [showGroupPlanDetails, setShowGroupPlanDetails] = useState(false);
  const [catchUpNotice, setCatchUpNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [g, tRes] = await Promise.all([getGroup(groupId), listThreads(groupId)]);
      setGroup(g);
      setThreads(tRes.threads);
    } catch { /* ignore */ }
  }, [groupId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!group) return;
    const templateId = group.planTemplateId || "default";
    let cancelled = false;

    const loadPlan = async () => {
      if (templateId === "default") {
        fetch("/plan.json")
          .then((res) => res.json())
          .then((days: PlanDay[]) => {
            if (!cancelled) setGroupPlan(days);
          })
          .catch(() => {
            if (!cancelled) setGroupPlan([]);
          });
        return;
      }

      if (templateId === "parasha") {
        const anchor = group.planStartDate ? new Date(`${group.planStartDate}T00:00:00`) : new Date();
        try {
          const days = await generateParashaPlan(anchor, 371);
          if (!cancelled) setGroupPlan(days);
        } catch {
          if (!cancelled) setGroupPlan([]);
        }
        return;
      }

      const generated = generatePlan(templateId);
      if (generated) {
        setGroupPlan(generated);
        return;
      }

      fetch("/plan.json")
        .then((res) => res.json())
        .then((days: PlanDay[]) => {
          if (!cancelled) setGroupPlan(days);
        })
        .catch(() => {
          if (!cancelled) setGroupPlan([]);
        });
    };

    void loadPlan();
    return () => { cancelled = true; };
  }, [group]);

  useEffect(() => {
    setGroupProgressEnabled(isGroupProgressOptedIn(groupId));
  }, [groupId]);

  useEffect(() => {
    return realtime.on("group:member_joined", async (data) => {
      const { groupId: gid, userId: newUserId } = data as { groupId: string; userId: string };
      if (gid !== groupId || group?.role !== "admin") return;
      try {
        const pair = await getOrCreateKeyPair();
        const myJwk = await exportPublicKey(pair.publicKey);
        const myPubKey = await importPublicKey(myJwk);
        const channelKey = await generateChannelKey();
        const { publicKeyJwk: newMemberJwk } = await fetchPublicKey(newUserId);
        const newMemberPubKey = await importPublicKey(newMemberJwk);
        const encryptedKey = await encryptChannelKey(channelKey, newMemberPubKey);
        await uploadGroupKey(groupId, newUserId, encryptedKey);
        const myEncKey = await encryptChannelKey(channelKey, myPubKey);
        await uploadGroupKey(groupId, user!.id, myEncKey);
      } catch { /* non-fatal */ }
      await load();
    });
  }, [groupId, group?.role, user, load]);

  useEffect(() => {
    return realtime.on("thread:update", (data) => {
      const { groupId: gid, threadId, name, emoji } = data as { groupId: string; threadId: string; name?: string; emoji?: string };
      if (gid !== groupId) return;
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, name: name ?? t.name, emoji: emoji ?? t.emoji } : t)));
    });
  }, [groupId]);

  useEffect(() => {
    return realtime.on("thread:deleted", (data) => {
      const { groupId: gid, threadId } = data as { groupId: string; threadId: string };
      if (gid !== groupId) return;
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    });
  }, [groupId]);

  // WS: member role changed / removed / left — refresh the member list & my own role
  useEffect(() => {
    const unsubRole = realtime.on("group:member_role_changed", (data) => {
      if ((data as { groupId: string }).groupId === groupId) void load();
    });
    const unsubLeft = realtime.on("group:member_left", (data) => {
      if ((data as { groupId: string }).groupId === groupId) void load();
    });
    const unsubRemoved = realtime.on("group:removed", (data) => {
      if ((data as { groupId: string }).groupId === groupId) onBack();
    });
    const unsubDeleted = realtime.on("group:deleted", (data) => {
      if ((data as { groupId: string }).groupId === groupId) { onChanged(); onBack(); }
    });
    return () => { unsubRole(); unsubLeft(); unsubRemoved(); unsubDeleted(); };
  }, [groupId, load, onBack, onChanged]);

  async function copyCode() {
    if (!group) return;
    await navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!group) return <div className="groups-screen"><p className="groups-loading">Loading…</p></div>;

  const isAdmin = group.role === "admin";
  const selectedTemplate = groupTemplateMeta(group.planTemplateId || "default");
  // Estimate current group plan day
  const groupDay = group.planStartDate
    ? Math.max(1, Math.floor((Date.now() - new Date(group.planStartDate).getTime()) / 86400000) + group.planStartDay)
    : null;
  const effectiveGroupDay = groupDay && groupPlan.length > 0
    ? Math.min(groupDay, groupPlan.length)
    : groupDay;
  const groupScopeId = groupProgressScopeId(group.id, user?.id);
  const groupPlanDay = effectiveGroupDay && groupPlan.length > 0 ? groupPlan[effectiveGroupDay - 1] ?? null : null;
  const currentGroupTracks = groupPlanDay ? TRACKS.filter((track) => Boolean(groupPlanDay[track])) : [];
  const getActiveTracks = (planDay: PlanDay) => TRACKS.filter((track) => Boolean(planDay[track]));

  const groupTotalReadings = groupPlan.reduce(
    (sum, day) => sum + TRACKS.filter((track) => Boolean(day[track])).length,
    0,
  );
  const groupCompletedReadings = groupPlan.reduce(
    (sum, day) => sum + TRACKS.filter((track) => day[track] && isTrackDoneScoped(group.planTemplateId || "default", day.day, track, groupScopeId)).length,
    0,
  );
  const groupCompletedDays = groupPlan.reduce((sum, day) => {
    const activeTracks = TRACKS.filter((track) => Boolean(day[track]));
    if (activeTracks.length === 0) return sum;
    const allDone = activeTracks.every((track) => isTrackDoneScoped(group.planTemplateId || "default", day.day, track, groupScopeId));
    return sum + (allDone ? 1 : 0);
  }, 0);
  const groupProgressPercent = groupTotalReadings > 0 ? Math.round((groupCompletedReadings / groupTotalReadings) * 100) : 0;

  const buildGroupReaderRequest = (dayIndex: number, trackIndex: number): ReaderRequest | null => {
    if (dayIndex < 0 || dayIndex >= groupPlan.length) return null;
    const day = groupPlan[dayIndex];
    const activeTracks = getActiveTracks(day);
    if (trackIndex < 0 || trackIndex >= activeTracks.length) return null;
    const track = activeTracks[trackIndex];
    const reference = day[track];
    if (!reference) return null;

    let globalIndex = 0;
    for (let i = 0; i < dayIndex; i++) {
      globalIndex += getActiveTracks(groupPlan[i]).length;
    }
    globalIndex += trackIndex;

    return {
      reference,
      day: day.day,
      track,
      dayReadingIndex: globalIndex + 1,
      dayReadingCount: groupTotalReadings,
      dayReadingLabel: "Group reading",
      returnLabel: "Back to group",
    };
  };

  const resolveReaderPosition = (currentTrack: (typeof TRACKS)[number]) => {
    if (!reader?.day) return null;
    const dayIndex = groupPlan.findIndex((planDay) => planDay.day === reader.day);
    if (dayIndex < 0) return null;
    const activeTracks = getActiveTracks(groupPlan[dayIndex]);
    const trackIndex = activeTracks.findIndex((track) => track === currentTrack);
    if (trackIndex < 0) return null;
    return { dayIndex, trackIndex };
  };

  const findAdjacentReading = (
    fromDayIndex: number,
    fromTrackIndex: number,
    delta: 1 | -1,
    unreadOnly: boolean,
  ) => {
    if (delta === 1) {
      for (let dayIndex = fromDayIndex; dayIndex < groupPlan.length; dayIndex++) {
        const activeTracks = getActiveTracks(groupPlan[dayIndex]);
        const start = dayIndex === fromDayIndex ? fromTrackIndex + 1 : 0;
        for (let trackIndex = start; trackIndex < activeTracks.length; trackIndex++) {
          const track = activeTracks[trackIndex];
          if (!unreadOnly || !isTrackDoneScoped(group.planTemplateId || "default", groupPlan[dayIndex].day, track, groupScopeId)) {
            return { dayIndex, trackIndex };
          }
        }
      }
      return null;
    }

    for (let dayIndex = fromDayIndex; dayIndex >= 0; dayIndex--) {
      const activeTracks = getActiveTracks(groupPlan[dayIndex]);
      const start = dayIndex === fromDayIndex ? fromTrackIndex - 1 : activeTracks.length - 1;
      for (let trackIndex = start; trackIndex >= 0; trackIndex--) {
        const track = activeTracks[trackIndex];
        if (!unreadOnly || !isTrackDoneScoped(group.planTemplateId || "default", groupPlan[dayIndex].day, track, groupScopeId)) {
          return { dayIndex, trackIndex };
        }
      }
    }
    return null;
  };

  const setGroupProgressTracking = (enabled: boolean) => {
    setGroupProgressEnabled(enabled);
    setGroupProgressOptIn(group.id, enabled);
  };

  const catchMeUpToGroupDay = () => {
    if (!effectiveGroupDay || effectiveGroupDay < 1) return;
    markProgressThroughDayScoped(group.planTemplateId || "default", groupPlan, effectiveGroupDay, groupScopeId);
    setCatchUpNotice(`You're synced to Group Day ${effectiveGroupDay}. This only updated your progress.`);
    window.setTimeout(() => setCatchUpNotice(null), 2600);
  };

  const openCurrentGroupReading = () => {
    if (!groupPlanDay) return;
    if (!effectiveGroupDay) return;
    const request = buildGroupReaderRequest(effectiveGroupDay - 1, 0);
    if (!request) return;
    setReader(request);
  };

  return (
    <div className="groups-screen">
      {/* Header */}
      <div className="groups-header">
        <button className="groups-back-btn" onClick={onBack}>← Back</button>
        <h2 className="groups-title">{group.name}</h2>
        {isAdmin && (
          <button className="groups-icon-btn" onClick={() => setShowSettings(true)} title="Group settings">
            <GearIcon className="q-icon" />
          </button>
        )}
      </div>

      <section className="groups-section">
        <div className="card" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <div className="setting-row" style={{ borderTop: 0, paddingTop: 0 }}>
            <label id="group-progress-toggle-label">Track my group reading progress</label>
            <button
              className={`toggle ${groupProgressEnabled ? "on" : ""}`}
              role="switch"
              aria-checked={groupProgressEnabled}
              aria-labelledby="group-progress-toggle-label"
              onClick={() => setGroupProgressTracking(!groupProgressEnabled)}
            />
          </div>
          <p className="small muted" style={{ margin: "0 0 8px" }}>
            Group progress is tracked separately. Your personal plan progress is unaffected.
          </p>
          <div className="small muted" style={{ margin: "0 0 8px" }}>
            Selected plan: <strong style={{ color: "var(--text-h)" }}>{selectedTemplate.name}</strong>
          </div>
          <div className="small muted" style={{ margin: "0 0 8px" }}>
            Group day: <strong style={{ color: "var(--text-h)" }}>{effectiveGroupDay ?? "Not set"}</strong>
          </div>
          <p className="small muted" style={{ margin: "0 0 8px" }}>
            Admins manage group timing (plan/day) in Group Settings. Catch-up applies only to your own profile progress.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={openCurrentGroupReading}
              type="button"
              disabled={!groupPlanDay || currentGroupTracks.length === 0}
            >
              Read Group Day
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowGroupPlanDetails((value) => !value)}
              type="button"
              disabled={groupPlan.length === 0}
            >
              {showGroupPlanDetails ? "Hide Full Group Plan" : "View Full Group Plan"}
            </button>
          </div>

          {groupProgressEnabled && (
            <>
              <div className="progress-bar" style={{ marginBottom: 8 }}>
                <div style={{ width: `${groupProgressPercent}%` }} />
              </div>
              <div className="small muted" style={{ margin: "0 0 8px" }}>
                {groupCompletedReadings} of {groupTotalReadings} readings complete ({groupProgressPercent}%) · {groupCompletedDays} of {groupPlan.length} days complete
              </div>
              <button
                className="btn btn-secondary"
                onClick={catchMeUpToGroupDay}
                type="button"
                disabled={!effectiveGroupDay || groupPlan.length === 0}
              >
                Catch Me Up to Group Day
              </button>
              {catchUpNotice && (
                <p className="small" style={{ margin: "8px 0 0", color: "var(--success)" }}>
                  {catchUpNotice}
                </p>
              )}
            </>
          )}

          {!groupProgressEnabled && (
            <p className="small muted" style={{ margin: "0 0 8px" }}>
              Enable tracking above to save your personal completion for this group plan.
            </p>
          )}

          {showGroupPlanDetails && groupPlan.length > 0 && (
            <div className="card" style={{ marginTop: 10, padding: "8px 12px", maxHeight: 320, overflowY: "auto" }}>
              {groupPlan.map((day) => {
                const activeTracks = TRACKS.filter((track) => Boolean(day[track]));
                const doneCount = groupProgressEnabled
                  ? activeTracks.filter((track) => isTrackDoneScoped(group.planTemplateId || "default", day.day, track, groupScopeId)).length
                  : 0;
                const done = groupProgressEnabled && activeTracks.length > 0 && doneCount === activeTracks.length;
                return (
                  <div key={`group-plan-summary-${day.day}`} className={`reading-row ${done ? "done" : ""}`} style={{ margin: "0", padding: "8px 0" }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="reading-track">Day {day.day}</span>
                      <br />
                      <span className="small muted">{activeTracks.map((track) => TRACK_LABELS[track]).join(" · ")}</span>
                    </span>
                    <span className="small muted" style={{ whiteSpace: "nowrap" }}>
                      {groupProgressEnabled ? `${doneCount}/${activeTracks.length}` : "Tracking off"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {groupPlanDay && (
            <>
              <div className="small muted" style={{ margin: "6px 0 8px" }}>
                Group Day {effectiveGroupDay} readings
              </div>
              {!groupProgressEnabled && (
                <p className="small muted" style={{ margin: "0 0 8px" }}>
                  Reading is available now. Turn on tracking to mark items complete.
                </p>
              )}
              {currentGroupTracks.map((track) => {
                const done = groupProgressEnabled && isTrackDoneScoped(group.planTemplateId || "default", groupPlanDay.day, track, groupScopeId);
                return (
                  <div className={`reading-row ${done ? "done" : ""}`} key={`group-${track}`}>
                    <button
                      className="reading-main"
                      onClick={() => {
                        if (!effectiveGroupDay) return;
                        const trackIndex = currentGroupTracks.findIndex((candidate) => candidate === track);
                        if (trackIndex < 0) return;
                        const request = buildGroupReaderRequest(effectiveGroupDay - 1, trackIndex);
                        if (!request) return;
                        setReader(request);
                      }}
                      title={`Read ${groupPlanDay[track]}`}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span className="reading-track">{TRACK_LABELS[track]}</span>
                        <br />
                        <span className="reading-ref">{groupPlanDay[track]}</span>
                      </span>
                    </button>
                    {groupProgressEnabled ? (
                      <button
                        className={`check-btn ${done ? "done" : ""}`}
                        onClick={() => toggleProgressScoped(group.planTemplateId || "default", groupPlanDay.day, track, groupScopeId)}
                        aria-label={`Mark group ${TRACK_LABELS[track]} ${done ? "unread" : "read"}`}
                        aria-pressed={done}
                      >
                        <CheckCircleIcon filled={done} />
                      </button>
                    ) : (
                      <span className="small muted" style={{ whiteSpace: "nowrap", paddingRight: 4 }}>
                        Tracking off
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {!groupPlanDay && (
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              Group plan day is not available yet. Ask an admin to set the group plan start date.
            </p>
          )}
        </div>
      </section>

      {/* Hero card */}
      <div className="group-hero-card">
        <div className="group-hero-avatar">{group.icon || group.name.charAt(0).toUpperCase()}</div>
        <div className="group-hero-body">
          <h3 className="group-hero-name">{group.name}</h3>
          {group.description
            ? <p className="group-hero-desc">{group.description}</p>
            : isAdmin && <p className="group-hero-desc group-hero-desc-empty">Add a description in group settings</p>}
        </div>
      </div>

      {/* Stats bar */}
      <div className="group-stats-bar">
        <div className="group-stat">
          <span className="group-stat-num">{group.members.length}</span>
          <span className="group-stat-label">Members</span>
        </div>
        <div className="group-stat">
          <span className="group-stat-num">{threads.length}</span>
          <span className="group-stat-label">Threads</span>
        </div>
        <div className="group-stat">
          <span className="group-stat-num">{effectiveGroupDay ?? "—"}</span>
          <span className="group-stat-label">Plan Day</span>
        </div>
        <div className="group-stat" style={{ cursor: "pointer" }} onClick={() => void copyCode()}>
          <span className="group-stat-num" style={{ fontSize: "0.72rem", letterSpacing: "0.08em" }}>{group.inviteCode}</span>
          <span className="group-stat-label">{copied ? "Copied!" : "Invite Code"}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="group-actions-grid">
        <button className="group-action-btn" onClick={() => setShowNewThread(true)}>
          <PencilIcon className="q-icon" />
          <span>New Thread</span>
        </button>
        <button className="group-action-btn" onClick={() => void copyCode()}>
          <CopyIcon className="q-icon" />
          <span>{copied ? "Copied!" : "Invite"}</span>
        </button>
        <button
          className="group-action-btn"
          onClick={() => {
            setShowGroupPlanDetails(true);
            openCurrentGroupReading();
          }}
        >
          <BookOpenIcon className="q-icon" />
          <span>Read Plan</span>
        </button>
        {isAdmin && (
          <button className="group-action-btn" onClick={() => setShowSettings(true)}>
            <GearIcon className="q-icon" />
            <span>Settings</span>
          </button>
        )}
      </div>

      {/* Threads */}
      <section className="groups-section">
        <div className="groups-section-header">
          <h3 className="groups-section-title">Threads</h3>
          <button className="groups-text-btn" onClick={() => setShowNewThread(true)}>+ New Thread</button>
        </div>
        {threads.length === 0 && (
          <p className="groups-empty-text">No threads yet — create one to start a focused discussion.</p>
        )}
        {threads.map((t) => (
          <div key={t.id} className="groups-row thread-row">
            <div className="thread-row-main">
              <div className="thread-emoji-badge">{t.emoji}</div>
              <div className="groups-row-info">
                <span className="groups-row-name">{t.name}</span>
                {t.lastMessageAt && <span className="groups-row-sub">{formatRelativeTime(t.lastMessageAt)}</span>}
              </div>
            </div>
            <button className="thread-edit-btn" onClick={() => setEditingThread(t)} aria-label={`Edit ${t.name}`} title="Rename or change icon">
              <PencilIcon className="q-icon" />
            </button>
          </div>
        ))}
        {showNewThread && (
          <ThreadModal
            groupId={groupId}
            onClose={() => setShowNewThread(false)}
            onSaved={(thread) => { setThreads((prev) => [...prev, thread]); setShowNewThread(false); }}
          />
        )}
        {editingThread && (
          <ThreadModal
            groupId={groupId}
            thread={editingThread}
            onClose={() => setEditingThread(null)}
            onSaved={(updated) => {
              setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
              setEditingThread(null);
            }}
            onDeleted={() => {
              setThreads((prev) => prev.filter((t) => t.id !== editingThread.id));
              setEditingThread(null);
            }}
          />
        )}
      </section>

      {/* Members */}
      <section className="groups-section">
        <h3 className="groups-section-title">Members ({group.members.length})</h3>
        {group.members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            isMe={m.id === user?.id}
            viewerIsAdmin={isAdmin}
            groupId={groupId}
            onChanged={load}
          />
        ))}
      </section>

      {/* Leave group */}
      <section className="groups-section">
        <LeaveGroupControl
          groupId={groupId}
          onLeft={() => { onChanged(); onBack(); }}
        />
      </section>

      {/* Admin settings sheet */}
      {showSettings && (
        <GroupSettingsSheet
          group={group}
          onClose={() => setShowSettings(false)}
          onSaved={() => { void load(); onChanged(); setShowSettings(false); }}
          onDeleted={() => { onChanged(); onBack(); }}
        />
      )}
      {reader && (
        <ReaderOverlay
          request={reader}
          onClose={() => setReader(null)}
          onAdvanceToNextReading={(currentTrack) => {
            const position = resolveReaderPosition(currentTrack);
            if (!position) return false;
            const next = findAdjacentReading(position.dayIndex, position.trackIndex, 1, true);
            if (!next) return false;
            const request = buildGroupReaderRequest(next.dayIndex, next.trackIndex);
            if (!request) return false;
            setReader(request);
            return true;
          }}
          onGoToPreviousReading={(currentTrack) => {
            const position = resolveReaderPosition(currentTrack);
            if (!position) return false;
            const previous = findAdjacentReading(position.dayIndex, position.trackIndex, -1, false);
            if (!previous) return false;
            const request = buildGroupReaderRequest(previous.dayIndex, previous.trackIndex);
            if (!request) return false;
            setReader(request);
            return true;
          }}
          onGoToNextReading={(currentTrack) => {
            const position = resolveReaderPosition(currentTrack);
            if (!position) return false;
            const next = findAdjacentReading(position.dayIndex, position.trackIndex, 1, false);
            if (!next) return false;
            const request = buildGroupReaderRequest(next.dayIndex, next.trackIndex);
            if (!request) return false;
            setReader(request);
            return true;
          }}
        />
      )}
    </div>
  );
}

// ─── Member row (promote/demote/remove) ───────────────────────────────────────

function MemberRow({
  member, isMe, viewerIsAdmin, groupId, onChanged,
}: {
  member: GroupMember;
  isMe: boolean;
  viewerIsAdmin: boolean;
  groupId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canManage = viewerIsAdmin && !isMe;

  async function toggleRole() {
    setBusy(true); setErr(null);
    try {
      await setGroupMemberRole(groupId, member.id, member.role === "admin" ? "member" : "admin");
      onChanged();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to change role.");
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true); setErr(null);
    try {
      await removeGroupMember(groupId, member.id);
      onChanged();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to remove member.");
      setConfirmingRemove(false);
    }
    setBusy(false);
  }

  return (
    <div className="groups-member-row" style={{ flexWrap: "wrap" }}>
      <div className="groups-row-avatar">{member.username.charAt(0).toUpperCase()}</div>
      <span className="groups-member-name">{member.username}</span>
      <div style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center" }}>
        {isMe && <span className="groups-member-badge">You</span>}
        {member.role === "admin" && <span className="groups-member-badge groups-admin-badge">Admin</span>}
        {canManage && !confirmingRemove && (
          <>
            <button className="groups-text-btn" disabled={busy} onClick={() => void toggleRole()}>
              {member.role === "admin" ? "Demote" : "Make Admin"}
            </button>
            {member.role !== "admin" && (
              <button className="groups-text-btn groups-text-btn-danger" disabled={busy} onClick={() => setConfirmingRemove(true)}>
                Remove
              </button>
            )}
          </>
        )}
        {canManage && confirmingRemove && (
          <>
            <span className="small muted">Remove {member.username}?</span>
            <button className="groups-text-btn groups-text-btn-danger" disabled={busy} onClick={() => void remove()}>
              Confirm
            </button>
            <button className="groups-text-btn" disabled={busy} onClick={() => setConfirmingRemove(false)}>
              Cancel
            </button>
          </>
        )}
      </div>
      {err && <p className="groups-error" style={{ width: "100%", margin: "4px 0 0" }}>{err}</p>}
    </div>
  );
}

// ─── Leave group ───────────────────────────────────────────────────────────────

function LeaveGroupControl({ groupId, onLeft }: { groupId: string; onLeft: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleLeave() {
    setBusy(true); setErr(null);
    try {
      await leaveGroup(groupId);
      onLeft();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to leave group.");
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="small">Leave this group? You'll need a new invite to rejoin.</span>
        {err && <p className="groups-error" style={{ margin: 0 }}>{err}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-danger" disabled={busy} onClick={() => void handleLeave()}>
            {busy ? "Leaving…" : "Leave Group"}
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <button className="group-action-btn" style={{ color: "var(--danger)" }} onClick={() => setConfirming(true)}>
      <LogOutIcon className="q-icon" />
      <span>Leave Group</span>
    </button>
  );
}

function GroupSettingsSheet({
  group, onClose, onSaved, onDeleted,
}: {
  group: Group & { members: GroupMember[] };
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [icon, setIcon] = useState(group.icon ?? "📖");
  const [editingIcon, setEditingIcon] = useState(false);
  const [desc, setDesc] = useState(group.description ?? "");
  const [startDate, setStartDate] = useState(group.planStartDate ?? "");
  const [startDay, setStartDay] = useState(group.planStartDay);
  const [planTemplateId, setPlanTemplateId] = useState(group.planTemplateId || "default");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState(group.inviteCode);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(group.inviteExpiresAt ?? null);
  const [expirySelection, setExpirySelection] = useState(group.inviteExpiresAt ? "custom" : "never");
  const [inviteMaxUses, setInviteMaxUses] = useState(group.inviteMaxUses ?? null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await updateGroup(group.id, {
        name: name.trim() || undefined,
        description: desc,
        icon,
        planStartDate: startDate || undefined,
        planStartDay: startDay,
        planTemplateId,
      });
      onSaved();
    } catch {
      setErr("Failed to save settings.");
    }
    setBusy(false);
  }

  async function handleRegenerate() {
    setInviteBusy(true); setInviteMsg(null);
    try {
      const { inviteCode: newCode } = await regenerateInviteCode(group.id);
      setInviteCode(newCode);
      setInviteMsg("New invite code generated — the old one no longer works.");
    } catch {
      setInviteMsg("Failed to regenerate the invite code.");
    }
    setInviteBusy(false);
  }

  async function handleInviteSettingsChange(expiresInMs: number | null, maxUses: number | null) {
    setInviteBusy(true); setInviteMsg(null);
    try {
      const result = await setInviteSettings(group.id, expiresInMs, maxUses);
      setInviteExpiresAt(result.inviteExpiresAt);
      setInviteMaxUses(result.inviteMaxUses);
    } catch {
      setInviteMsg("Failed to update invite settings.");
    }
    setInviteBusy(false);
  }

  async function handleDelete() {
    setDeleteBusy(true);
    try {
      await deleteGroup(group.id);
      onDeleted();
    } catch {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Group Settings">
        <div className="sheet-handle" />
        <h3 style={{ margin: "0 0 16px", fontWeight: 700, color: "var(--text-h)" }}>Group Settings</h3>
        <form onSubmit={(e) => void handleSave(e)}>
          <label className="groups-label">
            Group name
            <div className="thread-emoji-row">
              <button type="button" className="thread-emoji-trigger" onClick={() => setEditingIcon((v) => !v)}>
                <span className="thread-emoji-big">{icon}</span>
                <PencilIcon className="thread-emoji-edit-icon" />
              </button>
              {editingIcon && (
                <div className="thread-emoji-picker">
                  {ICON_EMOJIS.map((e) => (
                    <button key={e} type="button" className={`thread-emoji-opt ${e === icon ? "selected" : ""}`}
                      onClick={() => { setIcon(e); setEditingIcon(false); }}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <input className="groups-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} style={{ flex: 1 }} />
            </div>
          </label>
          <label className="groups-label" style={{ marginTop: 12 }}>
            Description
            <textarea className="groups-input groups-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} rows={2} placeholder="What this group is about…" />
          </label>
          <div style={{ marginTop: 12 }}>
            <label className="groups-label" style={{ marginBottom: 4 }}>Group reading plan</label>
            <select className="groups-input" value={planTemplateId} onChange={(e) => setPlanTemplateId(e.target.value)}>
              {GROUP_PLAN_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="groups-label" style={{ marginBottom: 4 }}>Plan start</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" className="groups-input" style={{ flex: 1 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <DayNumberInput
                className="groups-input"
                style={{ width: 72 }}
                max={Math.max(1, groupTemplateMeta(planTemplateId)?.days || 365)}
                value={startDay}
                placeholder="Day"
                onCommit={setStartDay}
              />
            </div>
          </div>
          {err && <p className="groups-error">{err}</p>}
          <button className="btn btn-block" type="submit" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </form>

        <div className="settings-divider" />

        <h4 style={{ margin: "0 0 8px", fontWeight: 700, color: "var(--text-h)", fontSize: "0.9rem" }}>Invite Link</h4>
        <div className="groups-invite-code-row">
          <span className="groups-invite-code">{inviteCode}</span>
          <button type="button" className="groups-text-btn" disabled={inviteBusy} onClick={() => void handleRegenerate()}>
            Regenerate
          </button>
        </div>
        <label className="groups-label" style={{ marginTop: 10 }}>
          Expires
          <select
            className="groups-input"
            disabled={inviteBusy}
            value={expirySelection}
            onChange={(e) => {
              const v = e.target.value;
              setExpirySelection(v);
              const ms = v === "never" ? null : Number(v);
              void handleInviteSettingsChange(ms, inviteMaxUses);
            }}
          >
            <option value="never">Never</option>
            {expirySelection === "custom" && <option value="custom">Custom (already set)</option>}
            <option value={60 * 60 * 1000}>In 1 hour</option>
            <option value={24 * 60 * 60 * 1000}>In 1 day</option>
            <option value={7 * 24 * 60 * 60 * 1000}>In 7 days</option>
            <option value={30 * 24 * 60 * 60 * 1000}>In 30 days</option>
          </select>
        </label>
        {inviteExpiresAt && (
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            Expires {new Date(inviteExpiresAt).toLocaleString()}
          </p>
        )}
        <label className="groups-label" style={{ marginTop: 10 }}>
          Max uses
          <select
            className="groups-input"
            disabled={inviteBusy}
            value={inviteMaxUses ?? "unlimited"}
            onChange={(e) => {
              const v = e.target.value;
              void handleInviteSettingsChange(inviteExpiresAt, v === "unlimited" ? null : Number(v));
            }}
          >
            <option value="unlimited">Unlimited</option>
            <option value={1}>1 use</option>
            <option value={5}>5 uses</option>
            <option value={10}>10 uses</option>
            <option value={25}>25 uses</option>
          </select>
        </label>
        {inviteMaxUses != null && (
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            Used {group.inviteUseCount ?? 0} of {inviteMaxUses}
          </p>
        )}
        {inviteMsg && <p className="small" style={{ margin: "6px 0 0", color: "var(--accent)" }}>{inviteMsg}</p>}

        <div className="settings-divider" />

        <h4 style={{ margin: "0 0 8px", fontWeight: 700, color: "var(--danger)", fontSize: "0.9rem" }}>Danger Zone</h4>
        {confirmDelete ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="small">Delete "{group.name}" permanently? All messages, threads, and membership are lost for everyone. This cannot be undone.</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-danger" disabled={deleteBusy} onClick={() => void handleDelete()}>
                {deleteBusy ? "Deleting…" : "Delete Group"}
              </button>
              <button className="btn btn-secondary" disabled={deleteBusy} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmDelete(true)}>
            <TrashIcon className="q-icon" /> Delete Group
          </button>
        )}

        <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Thread Modal (create or edit) ────────────────────────────────────────────


function ThreadModal({ groupId, thread, onClose, onSaved, onDeleted }: {
  groupId: string;
  /** Omit to create a new thread; pass an existing thread to rename/re-icon it. */
  thread?: Thread;
  onClose: () => void;
  onSaved: (thread: Thread) => void;
  onDeleted?: () => void;
}) {
  const isEdit = !!thread;
  const [name, setName] = useState(thread?.name ?? "");
  const [emoji, setEmoji] = useState(thread?.emoji ?? "💬");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingEmoji, setEditingEmoji] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Thread name is required."); return; }
    setBusy(true);
    try {
      if (thread) {
        await updateThread(thread.id, { name: name.trim(), emoji });
        onSaved({ ...thread, name: name.trim(), emoji });
      } else {
        const { id, channelId } = await createThread(groupId, name.trim(), emoji);
        onSaved({ id, groupId, channelId, name: name.trim(), emoji, createdBy: "", createdAt: Date.now(), lastMessageAt: null });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : `Failed to ${isEdit ? "update" : "create"} thread.`);
    }
    setBusy(false);
  }

  async function handleDelete() {
    if (!thread) return;
    setBusy(true);
    try {
      await deleteThread(thread.id);
      onDeleted?.();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to delete thread.");
      setBusy(false);
    }
  }

  return (
    <div className="thread-modal-backdrop" onClick={onClose}>
      <div className="thread-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="thread-modal-title">{isEdit ? "Edit Thread" : "New Thread"}</h3>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="thread-emoji-row">
            <button type="button" className="thread-emoji-trigger" onClick={() => setEditingEmoji((v) => !v)}>
              <span className="thread-emoji-big">{emoji}</span>
              <PencilIcon className="thread-emoji-edit-icon" />
            </button>
            {editingEmoji && (
              <div className="thread-emoji-picker">
                {ICON_EMOJIS.map((e) => (
                  <button key={e} type="button" className={`thread-emoji-opt ${e === emoji ? "selected" : ""}`}
                    onClick={() => { setEmoji(e); setEditingEmoji(false); }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
            <input
              className="groups-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Thread name…"
              maxLength={80}
              autoFocus
              style={{ flex: 1 }}
            />
          </div>
          {err && <p className="groups-error">{err}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn-primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Create Thread")}
            </button>
            <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
        {isEdit && (
          confirmDelete ? (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="small">Delete this thread and all its messages? This cannot be undone.</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void handleDelete()}>
                  {busy ? "Deleting…" : "Delete Thread"}
                </button>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="groups-text-btn groups-text-btn-danger"
              style={{ marginTop: 14 }}
              onClick={() => setConfirmDelete(true)}
            >
              <TrashIcon className="q-icon" /> Delete Thread
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ms: number): string {
  const diffMs = Date.now() - ms;
  const diffDays = Math.floor(diffMs / 86400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ms).toLocaleDateString();
}
