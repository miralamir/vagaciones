"use client";

import { useEffect, useMemo, useState } from "react";
import { useTripContext } from "@/hooks/useTripContext";
import { createPersonalPlace, getPersonalPlaces, savePersonalPlaces, type PersonalPlace } from "@/lib/personal-places";
import { places, type Place, type PlaceType } from "@/lib/places";
import { trip } from "@/lib/trip-data";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { AccordionSection } from "./AccordionSection";
import { PlaceCard } from "./PlaceCard";

type Filter = "all" | "today" | "hotel" | "airport" | "station" | "activity" | "food" | "kids" | "nadia" | "emergency";
const filters: Array<{ id: Filter; label: string }> = [{ id: "all", label: "Todos" }, { id: "today", label: "Hoy" }, { id: "hotel", label: "Hoteles" }, { id: "airport", label: "Aeropuertos" }, { id: "station", label: "Estaciones" }, { id: "activity", label: "Actividades" }, { id: "food", label: "Comida" }, { id: "kids", label: "Ninos / LEGO" }, { id: "nadia", label: "Nadia" }, { id: "emergency", label: "Emergencia" }];
const personalTypes: Array<{ value: PlaceType; label: string }> = [{ value: "other", label: "Otro" }, { value: "restaurant", label: "Comida" }, { value: "pharmacy", label: "Farmacia" }, { value: "supermarket", label: "Supermercado" }, { value: "toy_store", label: "Jugueteria" }, { value: "activity", label: "Actividad" }];

export function MapScreen() {
  const context = useTripContext();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [personalPlaces, setPersonalPlaces] = useState<PersonalPlace[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(""); const [city, setCity] = useState(""); const [day, setDay] = useState(""); const [type, setType] = useState<PlaceType>("other"); const [notes, setNotes] = useState(""); const [address, setAddress] = useState("");

  useEffect(() => setPersonalPlaces(getPersonalPlaces()), []);
  const allPlaces = useMemo(() => [...places, ...personalPlaces], [personalPlaces]);
  const visiblePlaces = useMemo(() => allPlaces.filter((place) => matchesFilter(place, filter, context.activeDay.day) && `${place.name} ${place.city} ${place.notes}`.toLowerCase().includes(query.trim().toLowerCase())), [allPlaces, context.activeDay.day, filter, query]);
  const addPlace = () => {
    if (!name.trim()) return;
    const next = [...personalPlaces, createPersonalPlace({ name, city, day: day ? Number(day) : undefined, type, notes, address })];
    setPersonalPlaces(next); savePersonalPlaces(next); setName(""); setCity(""); setDay(""); setNotes(""); setAddress(""); setShowForm(false);
  };
  const removePlace = (id: string) => { const next = personalPlaces.filter((place) => place.id !== id); setPersonalPlaces(next); savePersonalPlaces(next); };

  return <AppShell><section className="grid gap-3">
    <div className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-sea">Mapa</p><h1 className="mt-1 text-2xl font-black text-ink">Mapa y lugares utiles</h1><p className="mt-2 text-sm font-semibold text-ink/65">Lugares curados y personales guardados en este dispositivo.</p><input aria-label="Buscar lugar" className="mt-4 w-full rounded-md border border-black/10 px-3 py-3 font-semibold text-ink" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar hotel, aeropuerto o actividad" value={query} /></div>
    <button className="justify-self-start rounded-md bg-sea px-4 py-3 font-black text-white" onClick={() => setShowForm((value) => !value)} type="button">Agregar lugar</button>
    {showForm ? <SectionCard title="Lugar personal"><div className="grid gap-2"><input className="rounded-md border border-black/10 px-3 py-3 font-semibold text-ink" onChange={(event) => setName(event.target.value)} placeholder="Nombre" value={name} /><div className="grid grid-cols-2 gap-2"><input className="rounded-md border border-black/10 px-3 py-3 font-semibold text-ink" onChange={(event) => setCity(event.target.value)} placeholder="Ciudad opcional" value={city} /><select className="rounded-md border border-black/10 bg-white px-3 py-3 font-semibold text-ink" onChange={(event) => setDay(event.target.value)} value={day}><option value="">Dia opcional</option>{Array.from({ length: trip.totalDays }, (_, index) => <option key={index + 1} value={index + 1}>Dia {index + 1}</option>)}</select></div><select className="rounded-md border border-black/10 bg-white px-3 py-3 font-semibold text-ink" onChange={(event) => setType(event.target.value as PlaceType)} value={type}>{personalTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input className="rounded-md border border-black/10 px-3 py-3 font-semibold text-ink" onChange={(event) => setAddress(event.target.value)} placeholder="Direccion concreta opcional (solo local)" value={address} /><textarea className="rounded-md border border-black/10 px-3 py-3 font-semibold text-ink" onChange={(event) => setNotes(event.target.value)} placeholder="Notas opcionales" value={notes} /><button className="rounded-md bg-ink px-4 py-3 font-black text-white" onClick={addPlace} type="button">Guardar lugar</button></div></SectionCard> : null}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{filters.map((item) => <button className={filter === item.id ? "rounded-md bg-sea px-3 py-3 text-sm font-black text-white" : "rounded-md bg-white px-3 py-3 text-sm font-black text-ink"} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>)}</div>
    <AccordionSection badge={visiblePlaces.length || undefined} defaultOpen={filter === "today"} title={filter === "today" ? `Lugares del Dia ${context.activeDay.day}` : "Lugares utiles"}>{visiblePlaces.length ? <div className="grid gap-3">{visiblePlaces.map((place) => <PlaceCard key={place.id} onDelete={"manual" in place ? () => removePlace(place.id) : undefined} place={place} />)}</div> : <p className="rounded-md bg-mist px-3 py-3 font-bold text-ink/65">No hay lugares para este filtro todavia.</p>}</AccordionSection>
  </section></AppShell>;
}

function matchesFilter(place: Place, filter: Filter, day: number) { if (filter === "all") return true; if (filter === "today") return place.relatedDays.includes(day); if (filter === "hotel") return place.type === "hotel"; if (filter === "airport") return place.type === "airport"; if (filter === "station") return place.type === "train_station"; if (filter === "activity") return place.type === "activity" || place.type === "viewpoint" || place.type === "walking_area"; if (filter === "food") return place.type === "restaurant" || place.type === "supermarket"; if (filter === "kids") return place.type === "lego" || place.type === "toy_store"; if (filter === "nadia") return place.type === "perfume" || place.type === "design_store"; return place.type === "emergency" || place.type === "pharmacy"; }
