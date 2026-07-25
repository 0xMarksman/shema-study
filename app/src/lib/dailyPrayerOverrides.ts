const PRAYER_OVERRIDES_KEY = "shema-study:prayer-overrides";

type StoredPrayerOverrides = Record<string, string>;

function overrideKey(templateId: string, day: number) {
  return `${templateId}::${day}`;
}

function planOverrideKey(templateId: string) {
  return `${templateId}::*`;
}

function loadAllOverrides(): StoredPrayerOverrides {
  try {
    const raw = localStorage.getItem(PRAYER_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredPrayerOverrides;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveAllOverrides(overrides: StoredPrayerOverrides) {
  localStorage.setItem(PRAYER_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getPrayerOverride(templateId: string, day: number): string | null {
  const all = loadAllOverrides();
  const value = all[overrideKey(templateId, day)];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function setPrayerOverride(templateId: string, day: number, text: string): string | null {
  const all = loadAllOverrides();
  const key = overrideKey(templateId, day);
  const normalized = text.trim();

  if (!normalized) {
    delete all[key];
    saveAllOverrides(all);
    return null;
  }

  all[key] = normalized;
  saveAllOverrides(all);
  return normalized;
}

export function clearPrayerOverride(templateId: string, day: number) {
  const all = loadAllOverrides();
  delete all[overrideKey(templateId, day)];
  saveAllOverrides(all);
}

export function getPlanPrayerOverride(templateId: string): string | null {
  const all = loadAllOverrides();
  const value = all[planOverrideKey(templateId)];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function setPlanPrayerOverride(templateId: string, text: string): string | null {
  const all = loadAllOverrides();
  const key = planOverrideKey(templateId);
  const normalized = text.trim();

  if (!normalized) {
    delete all[key];
    saveAllOverrides(all);
    return null;
  }

  all[key] = normalized;
  saveAllOverrides(all);
  return normalized;
}

export function clearPlanPrayerOverride(templateId: string) {
  const all = loadAllOverrides();
  delete all[planOverrideKey(templateId)];
  saveAllOverrides(all);
}
