"use client";

import { useMemo, useState } from "react";
import { useTripContext } from "@/hooks/useTripContext";
import { places, type Place } from "@/lib/places";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { PlaceCard } from "./PlaceCard";

type Filter = "all" | "today" | "hotel" | "airport" | "station" | "activity" | "food" | "kids" | "nadia" | "emergency";

const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Todos" }, { id: "today", label: "Hoy" }, { id: "hotel", label: "Hoteles" }, { id: "airport", label: "Aeropuertos" }, { id: "station", label: "Estaciones" }, { id: "activity", label: "Actividades" }, { id: "food", label: "Comida" }, { id: "kids", label: "Ninos / LEGO" }, { id: "nadia", label: "Nadia" }, { id: "emergency", label: "Emergencia" }
];

export function MapScreen() {
  const context = useTripContext();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const visiblePlaces = useMemo(() => places.filter((place) => matchesFilter(place, filter, context.activeDay.day) && `${place.name} ${place.city} ${place.notes}`.toLowerCase().includes(query.trim().toLowerCase())), [context.activeDay.day, filter, query]);

  return <AppShell><section className="grid gap-3">
    <div className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-sea">Mapa</p><h1 className="mt-1 text-2xl font-black text-ink">Mapa y lugares utiles</h1><p className="mt-2 text-sm font-semibold text-ink/65">Lugares curados para el viaje. No es un mapa interactivo.</p><input aria-label="Buscar lugar" className="mt-4 w-full rounded-md border border-black/10 px-3 py-3 font-semibold text-ink" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar hotel, aeropuerto o actividad" value={query} /></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{filters.map((item) => <button className={filter === item.id ? "rounded-md bg-sea px-3 py-3 text-sm font-black text-white" : "rounded-md bg-white px-3 py-3 text-sm font-black text-ink"} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>)}</div>
    <SectionCard title={filter === "today" ? `Lugares del Dia ${context.activeDay.day}` : "Lugares utiles"}>{visiblePlaces.length ? <div className="grid gap-3">{visiblePlaces.map((place) => <PlaceCard key={place.id} place={place} />)}</div> : <p className="rounded-md bg-mist px-3 py-3 font-bold text-ink/65">No hay lugares curados para este filtro todavia.</p>}</SectionCard>
  </section></AppShell>;
}

function matchesFilter(place: Place, filter: Filter, day: number) {
  if (filter === "all") return true;
  if (filter === "today") return place.relatedDays.includes(day);
  if (filter === "hotel") return place.type === "hotel";
  if (filter === "airport") return place.type === "airport";
  if (filter === "station") return place.type === "train_station";
  if (filter === "activity") return place.type === "activity" || place.type === "viewpoint" || place.type === "walking_area";
  if (filter === "food") return place.type === "restaurant" || place.type === "supermarket";
  if (filter === "kids") return place.type === "lego" || place.type === "toy_store";
  if (filter === "nadia") return place.type === "perfume" || place.type === "design_store";
  return place.type === "emergency" || place.type === "pharmacy";
}
