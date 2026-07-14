import placesData from "../../../../data/trips/europa-2026/places.json";

export type PlaceType = "hotel" | "airport" | "train_station" | "port" | "activity" | "restaurant" | "pharmacy" | "supermarket" | "toy_store" | "lego" | "perfume" | "design_store" | "viewpoint" | "walking_area" | "emergency" | "other";

export type Place = {
  id: string;
  name: string;
  type: PlaceType;
  city: string;
  country: string | null;
  address: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  privateLocationKey?: string;
  relatedDays: number[];
  relatedReservationIds: string[];
  priority: "essential" | "useful" | "optional";
  actions: { maps: boolean; uber: boolean; call: boolean };
  phone?: string;
  walkingOnly?: boolean;
  contractedTransfer?: boolean;
  notes: string;
};

export const places = placesData as Place[];

export function getPlacesForDay(day: number) {
  return places.filter((place) => place.relatedDays.includes(day));
}

export function getPlaceMapsUrl(place: Place) {
  if (place.coordinates) return `https://maps.google.com/?q=${place.coordinates.latitude},${place.coordinates.longitude}`;
  return `https://maps.google.com/?q=${encodeURIComponent([place.name, place.address, place.city, place.country].filter(Boolean).join(", "))}`;
}

export function canRequestUber(place: Place) {
  return place.actions.uber && Boolean(place.address || place.coordinates) && !place.walkingOnly && !place.contractedTransfer && !place.privateLocationKey && !/venecia/i.test(place.city);
}
