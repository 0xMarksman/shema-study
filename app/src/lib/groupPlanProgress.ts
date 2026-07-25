const GROUP_PROGRESS_OPT_IN_KEY = "shema-study:group-progress-optin";

type StoredOptIns = Record<string, boolean>;

function loadOptIns(): StoredOptIns {
  try {
    const raw = localStorage.getItem(GROUP_PROGRESS_OPT_IN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredOptIns;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveOptIns(data: StoredOptIns) {
  localStorage.setItem(GROUP_PROGRESS_OPT_IN_KEY, JSON.stringify(data));
}

export function isGroupProgressOptedIn(groupId: string): boolean {
  return Boolean(loadOptIns()[groupId]);
}

export function setGroupProgressOptIn(groupId: string, enabled: boolean) {
  const current = loadOptIns();
  if (enabled) current[groupId] = true;
  else delete current[groupId];
  saveOptIns(current);
}

export function groupProgressScopeId(groupId: string, userId?: string | null): string {
  return `group:${groupId}:user:${userId ?? "anonymous"}`;
}
