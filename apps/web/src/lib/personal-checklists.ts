export type ChecklistPriority = "high" | "medium" | "low";

export type PersonalChecklistItem = {
  id: string;
  label: string;
  priority: ChecklistPriority;
  category?: string;
  createdAt: string;
};

const keyForDay = (day: number) => `vagaciones:europa-2026:personal-checklist:${day}`;

export function getPersonalChecklistItems(day: number) {
  if (typeof window === "undefined") return [] as PersonalChecklistItem[];
  try { return JSON.parse(window.localStorage.getItem(keyForDay(day)) ?? "[]") as PersonalChecklistItem[]; } catch { return [] as PersonalChecklistItem[]; }
}

export function savePersonalChecklistItems(day: number, items: PersonalChecklistItem[]) {
  window.localStorage.setItem(keyForDay(day), JSON.stringify(items));
}
