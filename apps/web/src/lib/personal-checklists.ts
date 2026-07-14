export type ChecklistPriority = "high" | "medium" | "low";

export type PersonalChecklistItem = {
  id: string;
  label: string;
  priority: ChecklistPriority;
  category?: string;
  createdAt: string;
};

const STORAGE_KEY = "vagaciones:europa-2026:personal-checklists";
const LEGACY_KEY_PREFIX = "vagaciones:europa-2026:personal-checklist:";
export const PERSONAL_CHECKLISTS_CHANGED = "vagaciones:personal-checklists-changed";

type PersonalChecklistStore = Record<string, PersonalChecklistItem[]>;

function legacyKeyForDay(day: number) {
  return `${LEGACY_KEY_PREFIX}${day}`;
}

function readStore(): PersonalChecklistStore {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as PersonalChecklistStore;
  } catch {
    // A malformed local value should not prevent the curated checklist from rendering.
  }
  return {};
}

export function getPersonalChecklistItems(day: number) {
  if (typeof window === "undefined") return [] as PersonalChecklistItem[];
  const store = readStore();
  if (Array.isArray(store[String(day)])) return store[String(day)];

  try {
    return JSON.parse(window.localStorage.getItem(legacyKeyForDay(day)) ?? "[]") as PersonalChecklistItem[];
  } catch {
    return [] as PersonalChecklistItem[];
  }
}

export function savePersonalChecklistItems(day: number, items: PersonalChecklistItem[]) {
  if (typeof window === "undefined") return false;

  const store = readStore();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...store, [String(day)]: items }));
    window.dispatchEvent(new Event(PERSONAL_CHECKLISTS_CHANGED));
    return true;
  } catch {
    return false;
  }
}
