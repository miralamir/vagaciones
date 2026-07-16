"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import checklists from "../../../../../data/trips/europa-2026/checklists.json";
import { getDocumentsForDay, getViewerUrl } from "@/lib/documents";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { canRequestUber, getPlaceMapsUrl, getPlacesForDay, type Place } from "@/lib/places";
import { getPersonalChecklistItems, PERSONAL_CHECKLISTS_CHANGED, type PersonalChecklistItem } from "@/lib/personal-checklists";
import { getNextTransfer, getTripToday } from "@/lib/trip-today";
import { getStatusLabel, reservations } from "@/lib/trip-data";
import { getRailPlansForDay, railPlanLabel } from "@/lib/rail-plans";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { AccordionSection } from "./AccordionSection";
import { openExternalUrl, openUberToDestination, RiskConfirmationDialog } from "./RiskConfirmationDialog";
import { DocumentUpload } from "./DocumentUpload";

type ChecklistItem = { id: string; label: string; priority: "high" | "medium" | "low" };

export function TodayScreen() {
  const searchParams = useSearchParams();
  const override = Number(searchParams.get("day"));
  const [now, setNow] = useState(() => new Date());
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [completedChecklist, setCompletedChecklist] = useState<string[]>([]);
  const [personalChecklist, setPersonalChecklist] = useState<PersonalChecklistItem[]>([]);
  const today = getTripToday(now, Number.isInteger(override) && override >= 0 ? override : undefined);
  const day = today.activeDay;
  const nextTransfer = getNextTransfer(day, today.departurePlan);
  const quickDocuments = useMemo(() => sortDocuments(getDocumentsForDay(day.day, documents)).slice(0, 5), [day.day, documents]);
  const urgentChecklist = useMemo(() => getUrgentChecklist(day.day, completedChecklist, personalChecklist), [completedChecklist, day.day, personalChecklist]);
  const usefulPlaces = useMemo(() => getPlacesForDay(day.day).sort((a, b) => placeRank(a, day.reservationIds) - placeRank(b, day.reservationIds)).slice(0, 4), [day.day, day.reservationIds]);
  const relatedReservations = useMemo(() => reservations.filter((reservation) => day.reservationIds.includes(reservation.id)), [day.reservationIds]);
  const railPlans = useMemo(() => getRailPlansForDay(day.day), [day.day]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetch("/api/documents/index", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((index: DocumentIndex) => setDocuments([...index.documents]))
      .catch(() => setDocuments([]));
  }, []);

  useEffect(() => {
    try {
      setCompletedChecklist(JSON.parse(window.localStorage.getItem(`vagaciones:europa-2026:checklist:${day.day}`) ?? "[]") as string[]);
    } catch {
      setCompletedChecklist([]);
    }
    setPersonalChecklist(getPersonalChecklistItems(day.day));
  }, [day.day]);

  useEffect(() => {
    const refreshPersonalChecklist = () => setPersonalChecklist(getPersonalChecklistItems(day.day));
    window.addEventListener(PERSONAL_CHECKLISTS_CHANGED, refreshPersonalChecklist);
    return () => window.removeEventListener(PERSONAL_CHECKLISTS_CHANGED, refreshPersonalChecklist);
  }, [day.day]);

  if (today.tripPhase === "before_trip") return <BeforeTrip daysUntilStart={today.daysUntilStart} />;
  if (today.tripPhase === "after_trip") return <AfterTrip />;

  return <AppShell><section className="grid gap-3">
    <div className="rounded-lg bg-ink p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-white/60">Modo Hoy</p><h2 className="mt-1 text-2xl font-black">Hoy: Dia {day.day} - {day.date}</h2><p className="mt-1 text-lg font-bold text-white/80">{day.city}</p><p className="mt-3 inline-flex rounded-md bg-white/15 px-3 py-2 text-sm font-black">{getStatusLabel(day.status)}</p><p className="mt-3 text-sm font-semibold text-white/75">{day.nextEvent}</p></div>

    {nextTransfer.type !== "pendiente" || today.departurePlan ? <SectionCard title="Proximo traslado"><div className="grid gap-2"><p className="text-lg font-black text-ink">{nextTransfer.title}</p><p className="text-sm font-black uppercase tracking-wide text-sea">{nextTransfer.type} - {nextTransfer.status}</p><p className="text-sm font-semibold text-ink/70">Hora: {nextTransfer.time}</p>{today.departurePlan?.transportDepartureTime ? <p className="text-sm font-bold text-ink">Salida del transporte: {today.departurePlan.transportDepartureTime}</p> : null}{today.departurePlan?.recommendedArrival ? <p className="text-sm font-bold text-sea">{today.departurePlan.recommendedArrival}</p> : null}{nextTransfer.reservation?.locator ? <p className="text-sm font-semibold text-ink/70">Reserva: {nextTransfer.reservation.locator}</p> : null}</div></SectionCard> : <p className="rounded-md bg-mist px-3 py-3 text-sm font-bold text-ink/70">Sin traslados urgentes ahora.</p>}

    {today.departurePlan ? <SectionCard title="Salir"><div className="grid grid-cols-3 gap-2 text-center"><Time label="Ideal" value={today.departurePlan.idealDepartureTime} /><Time label="Comoda" value={today.departurePlan.comfortableDepartureTime} /><Time label="Limite" value={today.departurePlan.latestDepartureTime} /></div>{today.departurePlan.recommendedArrival ? <p className="mt-3 text-sm font-black text-sea">{today.departurePlan.recommendedArrival}</p> : null}<p className="mt-2 text-sm font-semibold text-ink/70">{today.departurePlan.notes}</p></SectionCard> : null}

    <QuickLinks day={day.day} />
    <DocumentUpload compact />
    <AccordionSection badge={quickDocuments.length || undefined} defaultOpen={quickDocuments.length > 0} title="Documentos rapidos">{quickDocuments.length ? <div className="grid gap-2">{quickDocuments.map((document) => <QuickDocument document={document} key={document.id} />)}</div> : <p className="text-sm font-semibold text-ink/65">No hay documentos reales asociados a este dia.</p>}</AccordionSection>
    <AccordionSection badge={urgentChecklist.length || undefined} defaultOpen={urgentChecklist.some((item) => item.priority === "high")} title="Checklist urgente">{urgentChecklist.length ? <ul className="grid gap-2">{urgentChecklist.map((item) => <li className="flex items-center justify-between gap-3 rounded-md bg-mist px-3 py-3" key={item.id}><span className="font-semibold text-ink">{item.label}</span><span className="text-xs font-black uppercase text-sea">{priorityLabel(item.priority)}</span></li>)}</ul> : <p className="text-sm font-semibold text-ink/65">No hay checklist urgente cargada para este dia.</p>}</AccordionSection>
    <AccordionSection badge={usefulPlaces.length || undefined} title="Lugares utiles">{usefulPlaces.length ? <div className="grid gap-2">{usefulPlaces.map((place) => <QuickPlace place={place} key={place.id} />)}</div> : <p className="text-sm font-semibold text-ink/65">Lugares pendientes de cargar.</p>}</AccordionSection>
    {relatedReservations.length ? <AccordionSection badge={relatedReservations.length} title="Proximas reservas"><ul className="grid gap-2">{relatedReservations.map((reservation) => <li className="rounded-md bg-mist px-3 py-3" key={reservation.id}><p className="font-black text-ink">{reservation.title}</p><p className="text-sm font-semibold text-ink/65">{reservation.date}</p></li>)}</ul></AccordionSection> : null}
    {railPlans.length ? <AccordionSection badge={railPlans.length} title="Conexion ferroviaria"><div className="grid gap-2">{railPlans.map((plan) => <div className="rounded-md bg-mist px-3 py-3" key={plan.id}><p className="text-xs font-black uppercase text-sea">{railPlanLabel(plan.kind)}</p><p className="mt-1 font-black text-ink">{plan.title}</p><p className="mt-1 text-sm font-semibold text-ink/70">{plan.summary}</p></div>)}</div></AccordionSection> : null}
    {day.pending.length ? <AccordionSection badge={day.pending.length} defaultOpen title="Pendientes"> <ul className="grid gap-2">{day.pending.map((item) => <li className="rounded-md bg-mist px-3 py-3 font-semibold text-ink" key={item}>{item}</li>)}</ul></AccordionSection> : null}
  </section></AppShell>;
}

function BeforeTrip({ daysUntilStart }: { daysUntilStart: number }) {
  const checklist = getUrgentChecklist(0, []);
  return <AppShell><section className="grid gap-3"><div className="rounded-lg bg-ink p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-white/60">Modo Viaje</p><h2 className="mt-1 text-2xl font-black">Faltan {daysUntilStart} dias para el viaje</h2><p className="mt-3 text-sm font-semibold text-white/75">Proximo hito: Dia 1 - salida a Iguazu / Foz.</p></div><DocumentUpload compact /><SectionCard title="Checklist pre-viaje"><ul className="grid gap-2">{checklist.map((item) => <li className="rounded-md bg-mist px-3 py-3 font-semibold text-ink" key={item.id}>{item.label}</li>)}</ul></SectionCard><div className="grid grid-cols-2 gap-2"><Link className="rounded-md bg-sea px-4 py-4 text-center font-black text-white" href="/trips/europa-2026/days/0#checklist">Ver checklist previa</Link><Link className="rounded-md bg-ink px-4 py-4 text-center font-black text-white" href="/trips/europa-2026/days/0">Ver Dia 0</Link><Link className="rounded-md bg-white px-4 py-4 text-center font-black text-ink" href="/trips/europa-2026/days/1">Ver Dia 1</Link><Link className="rounded-md bg-white px-4 py-4 text-center font-black text-ink" href="/trips/europa-2026/documentos">Documentos</Link><Link className="rounded-md bg-white px-4 py-4 text-center font-black text-ink" href="/trips/europa-2026/mapa">Mapa</Link></div></section></AppShell>;
}

function AfterTrip() {
  return <AppShell><section className="grid gap-3"><div className="rounded-lg bg-ink p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-white/60">Modo Viaje</p><h2 className="mt-1 text-2xl font-black">Viaje finalizado</h2><p className="mt-3 text-sm font-semibold text-white/75">Las reservas y documentos siguen disponibles para consultar.</p></div><div className="grid grid-cols-2 gap-2"><Link className="rounded-md bg-sea px-4 py-4 text-center font-black text-white" href="/trips/europa-2026/documentos">Documentos</Link><Link className="rounded-md bg-white px-4 py-4 text-center font-black text-ink" href="/trips/europa-2026/reservas">Reservas</Link></div></section></AppShell>;
}

function QuickLinks({ day }: { day: number }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Link className="rounded-md bg-sea px-3 py-4 text-center text-sm font-black text-white" href={`/trips/europa-2026/days/${day}`}>Ver dia completo</Link><Link className="rounded-md bg-white px-3 py-4 text-center text-sm font-black text-ink" href="/trips/europa-2026/documentos">Documentos</Link><Link className="rounded-md bg-white px-3 py-4 text-center text-sm font-black text-ink" href="/trips/europa-2026/mapa">Mapa</Link><Link className="rounded-md bg-white px-3 py-4 text-center text-sm font-black text-ink" href="/trips/europa-2026/offline">Offline</Link></div>;
}

function QuickDocument({ document }: { document: IndexedDocument }) {
  const protectedDocument = document.sensitivity === "highly_sensitive" || document.requiresConfirmation;
  const button = <Link className="rounded-md bg-sea px-3 py-2 text-sm font-black text-white" href={getViewerUrl(document)}>Abrir</Link>;
  return <div className="flex items-center justify-between gap-3 rounded-md bg-mist px-3 py-3"><div><p className="font-bold text-ink">{document.visibleName}</p><p className="text-xs font-black uppercase text-sea">{document.category}</p></div>{protectedDocument ? <RiskConfirmationDialog action="Abrir documento protegido" dataShared={document.visibleName} destination="Visor de VAGACIONES" consequence="Se mostrara un documento sensible." onConfirm={() => { window.location.href = getViewerUrl(document); }}>{(open) => <button className="rounded-md bg-sea px-3 py-2 text-sm font-black text-white" onClick={open} type="button">Abrir</button>}</RiskConfirmationDialog> : button}</div>;
}

function QuickPlace({ place }: { place: Place }) {
  const destination = place.address ?? `${place.name}, ${place.city}`;
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-mist px-3 py-3"><div><p className="font-bold text-ink">{place.name}</p><p className="text-xs font-black uppercase text-sea">{place.type}</p></div><div className="flex gap-2">{place.actions.maps && !place.privateLocationKey ? <RiskConfirmationDialog action="Abrir lugar" dataShared={destination} destination="Google Maps" consequence="Se abrira una aplicacion externa con este lugar." onConfirm={() => openExternalUrl(getPlaceMapsUrl(place))}>{(open) => <button className="rounded-md bg-white px-3 py-2 text-sm font-black text-ink" onClick={open} type="button">Maps</button>}</RiskConfirmationDialog> : null}{canRequestUber(place) ? <RiskConfirmationDialog action="Pedir Uber" dataShared={destination} destination="Uber" consequence="Vas a abrir Uber con este destino. Revisa direccion, horario y tarifa antes de confirmar el viaje." onConfirm={() => openUberToDestination(destination)}>{(open) => <button className="rounded-md bg-ink px-3 py-2 text-sm font-black text-white" onClick={open} type="button">Uber</button>}</RiskConfirmationDialog> : null}{place.actions.call && place.phone ? <RiskConfirmationDialog action="Llamar" dataShared={place.phone} destination="Telefono" consequence="Se iniciara una llamada desde el dispositivo." onConfirm={() => { window.location.href = `tel:${place.phone}`; }}>{(open) => <button className="rounded-md bg-coral px-3 py-2 text-sm font-black text-white" onClick={open} type="button">Llamar</button>}</RiskConfirmationDialog> : null}</div></div>;
}

function Time({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-mist px-2 py-3"><p className="text-[10px] font-black uppercase text-sea">{label}</p><p className="mt-1 font-black text-ink">{value}</p></div>; }

function getUrgentChecklist(day: number, completed: string[], personalItems: ChecklistItem[] = []) {
  const source = (checklists.byDay[String(day) as keyof typeof checklists.byDay] ?? []) as ChecklistItem[];
  return [...source, ...personalItems].filter((item) => !completed.includes(item.id)).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 5);
}

function sortDocuments(documents: IndexedDocument[]) { return [...documents].sort((a, b) => documentRank(a) - documentRank(b)); }
function documentRank(document: IndexedDocument) { if (document.flightDocumentKind === "boarding_pass" || document.flightDocumentKind === "qr") return 0; if (document.category === "vuelos") return 1; if (document.category === "hoteles") return 2; if (document.category === "entradas") return 3; if (document.category === "traslados") return 4; if (document.category === "crucero") return 5; return 6; }
function placeRank(place: Place, reservationIds: string[]) { const directlyRelated = place.relatedReservationIds.some((id) => reservationIds.includes(id)); return (directlyRelated ? 0 : 10) + (place.priority === "essential" ? 0 : place.priority === "useful" ? 1 : 2); }
function priorityRank(priority: ChecklistItem["priority"]) { return priority === "high" ? 0 : priority === "medium" ? 1 : 2; }
function priorityLabel(priority: ChecklistItem["priority"]) { return priority === "high" ? "Alta" : priority === "medium" ? "Media" : "Baja"; }
