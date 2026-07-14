import type { Place, PlaceType } from "./places";

export type PersonalPlace = Place & { manual: true };

const STORAGE_KEY = "vagaciones:europa-2026:personal-places";

export function getPersonalPlaces() {
  if (typeof window === "undefined") return [] as PersonalPlace[];
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as PersonalPlace[]; } catch { return [] as PersonalPlace[]; }
}

export function savePersonalPlaces(places: PersonalPlace[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
}

export function createPersonalPlace(input: { name: string; city?: string; day?: number; type: PlaceType; notes?: string; address?: string }): PersonalPlace {
  const address = input.address?.trim() || null;
  return { id: `personal-${Date.now()}`, manual: true, name: input.name.trim(), type: input.type, city: input.city?.trim() || "Lugar personal", country: null, address, coordinates: null, relatedDays: input.day ? [input.day] : [], relatedReservationIds: [], priority: "useful", actions: { maps: true, uber: Boolean(address), call: false }, notes: input.notes?.trim() || "Agregado por mi." };
}
