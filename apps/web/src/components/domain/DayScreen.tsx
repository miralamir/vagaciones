"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getDocumentsForDay, getTripGlobalDocuments, getViewerUrl } from "@/lib/documents";
import { getFlightDocumentStatuses } from "@/lib/flight-document-status";
import { getPlacesForDay } from "@/lib/places";
import { getPersonalPlaces, type PersonalPlace } from "@/lib/personal-places";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { getStatusLabel, getTripDay, reservations, trip } from "@/lib/trip-data";
import { getTimeRecommendation } from "@/lib/trip-today";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { openExternalUrl, openUberToDestination, RiskConfirmationDialog } from "./RiskConfirmationDialog";
import { FlightDocumentStatusCard } from "./FlightDocumentStatusCard";
import { Checklist, type ChecklistItem } from "./Checklist";
import { PlaceCard } from "./PlaceCard";
import { AccordionSection } from "./AccordionSection";
import checklists from "../../../../../data/trips/europa-2026/checklists.json";

export function DayScreen({ initialDay }: { initialDay: number }) {
  const router = useRouter();
  const isPreparation = initialDay === 0;
  const day = getTripDay(initialDay);
  const checklistItems = (checklists.byDay[String(initialDay) as keyof typeof checklists.byDay] ?? []) as ChecklistItem[];
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [approvedDocuments, setApprovedDocuments] = useState<IndexedDocument[]>([]);
  const [personalPlaces, setPersonalPlaces] = useState<PersonalPlace[]>([]);

  const previousDay = Math.max(day.day - 1, 1);
  const nextDay = isPreparation ? 1 : Math.min(day.day + 1, trip.totalDays);
  const canGoPrevious = !isPreparation && day.day > 1;
  const canGoNext = isPreparation || day.day < trip.totalDays;

  const navigateToDay = (targetDay: number) => {
    router.push(`/trips/europa-2026/days/${targetDay}`);
  };

  const documentList = useMemo(() => getDocumentsForDay(day.day, approvedDocuments), [approvedDocuments, day.day]);
  const globalDocumentList = useMemo(() => getTripGlobalDocuments(approvedDocuments), [approvedDocuments]);
  const flightStatuses = getFlightDocumentStatuses(day, approvedDocuments);
  const dayPlaces = useMemo(() => [...getPlacesForDay(day.day), ...personalPlaces.filter((place) => place.relatedDays.includes(day.day))], [day.day, personalPlaces]);
  const contractedTransfers = reservations.filter((reservation) => reservation.transferMode === "contracted_transfer" && day.reservationIds.includes(reservation.id));
  const trainReservations = reservations.filter((reservation) => reservation.type === "tren" && day.reservationIds.includes(reservation.id));
  const relatedReservations = reservations.filter((reservation) => day.reservationIds.includes(reservation.id));
  const hasPlannedHotelTransfer = contractedTransfers.length > 0 || day.day === 3;
  const timeRecommendation = getTimeRecommendation(day);

  useEffect(() => {
    void fetch("/api/documents/index", { cache: "no-store" })
      .then((response) => response.json())
      .then((index: DocumentIndex) => setApprovedDocuments([...index.documents]))
      .catch(() => setApprovedDocuments([]));
  }, []);

  useEffect(() => { setPersonalPlaces(getPersonalPlaces()); }, []);

  return (
    <AppShell>
      <section
        className="grid gap-3 overflow-hidden"
        onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
        onTouchMove={(event) => {
          if (touchStart === null) return;
          const delta = event.touches[0].clientX - touchStart;
          setDragOffset(Math.max(Math.min(delta, 80), -80));
        }}
        onTouchEnd={(event) => {
          if (touchStart === null) return;
          const delta = touchStart - event.changedTouches[0].clientX;
          if (delta > 60 && canGoNext) navigateToDay(nextDay);
          if (delta < -60 && canGoPrevious) navigateToDay(previousDay);
          setTouchStart(null);
          setDragOffset(0);
        }}
      >
        <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <button
              className="rounded-md border border-black/10 px-3 py-4 text-sm font-black text-ink disabled:opacity-35"
              disabled={!canGoPrevious}
              onClick={() => navigateToDay(previousDay)}
              type="button"
            >
              {"<"} Dia
            </button>
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-wide text-sea">Día {isPreparation ? 0 : day.day} de {trip.totalDays}</p>
              <h2 className="text-xl font-black leading-tight text-ink">{isPreparation ? `Preparacion previa - ${day.date}` : day.date}</h2>
              <p className="text-sm font-semibold text-ink/65">{day.city}</p>
            </div>
            <button
              className="rounded-md border border-black/10 px-3 py-4 text-sm font-black text-ink disabled:opacity-35"
              disabled={!canGoNext}
              onClick={() => navigateToDay(nextDay)}
              type="button"
            >
              Dia {">"}
            </button>
          </div>
        </div>

        <div
          className="grid gap-3 transition-transform duration-200 ease-out lg:grid-cols-2"
          style={{ transform: `translateX(${dragOffset}px)` }}
        >
          <SectionCard title="Estado del dia">
            <div className="grid gap-3">
              <p className="rounded-md bg-mist px-3 py-3 text-lg font-black text-ink">{getStatusLabel(day.status)}</p>
              {isPreparation ? <p className="text-sm font-semibold text-ink/70">Preparacion previa: deja lo esencial resuelto antes de descansar.</p> : <RiskConfirmationDialog
                action="Abrir ubicacion"
                dataShared={day.transfer.destination}
                destination="Google Maps"
                consequence="Se abrira una aplicacion externa con ubicacion o destino."
                onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
              >
                {(open) => <button className="rounded-md bg-sea px-4 py-4 text-center font-black text-white" onClick={open} type="button">Llevame</button>}
              </RiskConfirmationDialog>}
            </div>
          </SectionCard>

          <AccordionSection defaultOpen={isPreparation || isVeniceDay(day.day) || day.transport.length > 0 || contractedTransfers.length > 0} title="Transporte">
            <div className="grid gap-2">
              {isPreparation ? <p className="rounded-md bg-mist px-3 py-3 text-sm font-bold text-ink/70">Sin traslados urgentes ahora.</p> : isVeniceDay(day.day) ? <p className="rounded-md bg-mist px-3 py-3 text-sm font-bold text-ink/70">Movilidad recomendada: caminar.</p> : <List items={day.transport.length > 0 ? day.transport : ["Sin transporte programado"]} />}
              {contractedTransfers.map((transfer) => <div className="rounded-md border border-black/10 bg-mist p-3" key={transfer.id}><p className="text-xs font-black uppercase text-sea">Traslado contratado</p><p className="mt-1 font-black text-ink">{transfer.title}</p><p className="mt-2 text-sm font-semibold text-ink/70">{transfer.meetingPoint ?? "Punto de encuentro pendiente"}</p><p className="mt-1 text-sm font-semibold text-ink/70">Voucher pendiente de asociar</p><p className="mt-2 text-sm font-bold text-ink">Buscar chofer / cartel / punto de encuentro. Tener voucher a mano.</p></div>)}
              {day.reservationIds.includes("transfer-home-eze") ? <div className="rounded-md bg-mist px-3 py-3 text-sm font-bold text-ink">Casa → Aeropuerto Ezeiza. Configurar dirección de casa para pedir Uber.</div> : null}
              {day.flight ? <FlightDetails flight={day.flight} documents={approvedDocuments} /> : null}
              {trainReservations.map((train) => <TrainDetails key={train.id} train={train} />)}
              {!isPreparation ? <RiskConfirmationDialog
                action="Abrir traslado"
                dataShared={day.transfer.destination}
                destination="Google Maps"
                consequence="Se abrira una aplicacion externa con ubicacion o destino."
                onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
              >
                {(open) => <button className="rounded-md bg-ink px-4 py-4 text-center font-black text-white" onClick={open} type="button">Llevame</button>}
              </RiskConfirmationDialog> : null}
            </div>
          </AccordionSection>

          {timeRecommendation ? <SectionCard title="Recomendacion de tiempo">
            <div className="grid gap-2">
              {timeRecommendation.transportDepartureTime ? <p className="font-black text-ink">Salida del transporte: {timeRecommendation.transportDepartureTime}</p> : null}
              {timeRecommendation.recommendedArrival ? <p className="font-black text-sea">{timeRecommendation.recommendedArrival}</p> : null}
              {timeRecommendation.idealDepartureTime && timeRecommendation.comfortableDepartureTime && timeRecommendation.latestDepartureTime ? <div className="grid grid-cols-3 gap-2 text-center"><TimeRecommendation label="Ideal" value={timeRecommendation.idealDepartureTime} /><TimeRecommendation label="Comoda" value={timeRecommendation.comfortableDepartureTime} /><TimeRecommendation label="Limite" value={timeRecommendation.latestDepartureTime} /></div> : null}
              <p className={timeRecommendation.pending ? "font-bold text-coral" : "text-sm font-semibold text-ink/70"}>{timeRecommendation.note}</p>
            </div>
          </SectionCard> : null}

          {!isPreparation ? <AccordionSection title="Alojamiento">
            {day.hotel ? (
              <div>
                <p className="font-bold text-ink">{day.hotel.name}</p>
                <p className="mt-1 text-sm text-ink/65">{day.hotel.address}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <RiskConfirmationDialog
                    action="Abrir hotel"
                    dataShared={day.hotel.address}
                    destination="Google Maps"
                    consequence="Se abrira una aplicacion externa con la ubicacion."
                    onConfirm={() => openExternalUrl(day.hotel!.mapUrl)}
                  >
                    {(open) => <button className="rounded-md bg-sea px-3 py-4 text-center text-sm font-black text-white" onClick={open} type="button">Llevame</button>}
                  </RiskConfirmationDialog>
                  {hasUsableAddress(day.hotel.address) && !isVeniceDay(day.day) && !hasPlannedHotelTransfer ? <RiskConfirmationDialog
                    action="Pedir Uber al hotel"
                    dataShared={day.hotel.address}
                    destination="Uber"
                    consequence="Vas a abrir Uber con este destino. Revisa dirección, horario y tarifa antes de confirmar el viaje."
                    onConfirm={() => openUberToDestination(day.hotel!.address)}
                  >
                    {(open) => <button className="rounded-md bg-ink px-3 py-4 text-center text-sm font-black text-white" onClick={open} type="button">Pedir Uber</button>}
                  </RiskConfirmationDialog> : null}
                  <RiskConfirmationDialog
                    action="Llamar al hotel"
                    dataShared={day.hotel.phone}
                    destination="Telefono"
                    consequence="Se iniciara una llamada desde el dispositivo."
                    onConfirm={() => { window.location.href = `tel:${day.hotel!.phone}`; }}
                  >
                    {(open) => <button className="rounded-md bg-coral px-3 py-4 text-center text-sm font-black text-white" onClick={open} type="button">Llamar</button>}
                  </RiskConfirmationDialog>
                </div>
              </div>
            ) : (
              <p className="text-ink/65">Sin hotel asignado para este dia.</p>
            )}
          </AccordionSection> : null}

          <AccordionSection title="Actividades">
            <div className="grid gap-2">
              <List items={day.activities.length > 0 ? day.activities : ["Preparacion previa: documentos fisicos, valija y cargadores."]} />
              {!isPreparation ? <RiskConfirmationDialog
                action="Abrir actividad"
                dataShared={day.nextEvent}
                destination="Google Maps"
                consequence="Se abrira una aplicacion externa con ubicacion o destino."
                onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
              >
                {(open) => <button className="rounded-md bg-sea px-4 py-4 text-center font-black text-white" onClick={open} type="button">Llevame</button>}
              </RiskConfirmationDialog> : null}
            </div>
          </AccordionSection>

          <AccordionSection badge={dayPlaces.length || undefined} title="Lugares utiles">
            {dayPlaces.length > 0 ? <div className="grid gap-3">{dayPlaces.map((place) => <PlaceCard key={place.id} place={place} />)}</div> : <p className="text-ink/65">Lugares pendientes de cargar.</p>}
          </AccordionSection>

          <div id="checklist"><AccordionSection badge={checklistItems.length || undefined} defaultOpen={checklistItems.some((item) => item.priority === "high")} title="Checklist">
            <Checklist day={initialDay} items={checklistItems.length ? checklistItems : day.checklist.map((label, index) => ({ id: `day-${day.day}-${index}`, label, priority: "medium" }))} />
          </AccordionSection></div>

          <AccordionSection badge={day.pending.length || undefined} defaultOpen={day.pending.length > 0} title="Notas y pendientes">
            <List items={day.pending.length > 0 ? day.pending : ["Sin pendientes cargados."]} />
          </AccordionSection>

          {day.reminders.length > day.pending.length ? <AccordionSection title="Notas practicas">
            <List items={day.reminders.slice(0, day.reminders.length - day.pending.length)} />
          </AccordionSection> : null}

          <AccordionSection title="Consejo">
            <p className="text-ink/75">{day.conciergeTip}</p>
          </AccordionSection>

          <AccordionSection badge={documentList.length + flightStatuses.length || undefined} defaultOpen={flightStatuses.length > 0 || documentList.length > 0} title="Documentos del dia">
            <div className="grid gap-2">
              {flightStatuses.map((status) => <FlightDocumentStatusCard key={status.flightLabel} status={status} />)}
              {documentList.length > 0 ? (
                documentList.map((document) => (
                  <DocumentDayLink document={document} key={document.id} onOpen={() => router.push(getViewerUrl(document))} />
                ))
              ) : (
                <div className="rounded-md border border-black/10 px-3 py-4 font-black text-ink/60">No hay documentos reales asociados a este dia.</div>
              )}
              {globalDocumentList.length > 0 ? <div className="mt-2 grid gap-2"><p className="text-xs font-black uppercase tracking-wide text-sea">Documentos globales del viaje</p>{globalDocumentList.map((document) => <DocumentDayLink document={document} key={document.id} onOpen={() => router.push(getViewerUrl(document))} />)}</div> : null}
            </div>
          </AccordionSection>

          {relatedReservations.length ? <AccordionSection badge={relatedReservations.length} title="Reservas relacionadas"><ul className="grid gap-2">{relatedReservations.map((reservation) => <li className="rounded-md bg-mist px-3 py-3" key={reservation.id}><p className="font-black text-ink">{reservation.title}</p><p className="text-sm font-semibold text-ink/65">{reservation.locator ? `Localizador: ${reservation.locator}` : reservation.date}</p></li>)}</ul></AccordionSection> : null}
        </div>
      </section>
    </AppShell>
  );
}

function FlightDetails({ flight, documents }: { flight: NonNullable<ReturnType<typeof getTripDay>["flight"]>; documents: IndexedDocument[] }) {
  const document = documents.find((item) => item.linkedReservation && flight.reservations.includes(item.linkedReservation));
  return <div className="rounded-md bg-mist p-3"><p className="text-[10px] font-black uppercase tracking-wide text-sea">Vuelo</p><p className="font-black text-ink">{flight.airline} {flight.flightNumber}</p><p className="mt-1 text-sm font-bold text-ink/70">{flight.origin} a {flight.destination}</p><p className="mt-1 text-sm font-semibold text-ink/70">Sale {flight.departure} · Llega {flight.arrival}</p><p className="mt-2 text-sm font-bold text-ink">Reserva: {flight.reservations.join(" / ")}</p><div className="mt-3 flex items-center justify-between rounded-md bg-white px-3 py-2"><span className="font-bold text-ink">Reserva / e-ticket</span>{document ? <a className="rounded-md bg-sea px-3 py-2 text-sm font-black text-white" href={getViewerUrl(document)}>Mostrar reserva</a> : <span className="text-sm font-black text-ink/60">Reserva PDF pendiente de asociar</span>}</div></div>;
}

function TrainDetails({ train }: { train: (typeof reservations)[number] }) {
  return <div className="rounded-md bg-mist p-3"><p className="text-[10px] font-black uppercase tracking-wide text-sea">Tren</p><p className="font-black text-ink">{train.provider ?? "Operador pendiente"}</p><p className="mt-1 text-sm font-bold text-ink/70">{train.title}</p><p className="mt-1 text-sm font-semibold text-ink/70">{train.date === "Fecha pendiente" ? "Horario pendiente" : `Salida: ${train.date}`}</p>{train.locator ? <p className="mt-2 text-sm font-bold text-ink">Referencia: {train.locator}</p> : null}{train.seats.length > 0 ? <p className="mt-1 text-sm font-bold text-ink">{train.seats.join(" · ")}</p> : null}{train.pending.length > 0 ? <p className="mt-2 text-sm font-semibold text-coral">{train.pending.join(" ")}</p> : null}</div>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li className="rounded-md bg-mist px-3 py-3 text-sm font-semibold text-ink/80" key={item}>{item}</li>
      ))}
    </ul>
  );
}

function TimeRecommendation({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-mist px-2 py-3"><p className="text-[10px] font-black uppercase text-sea">{label}</p><p className="mt-1 font-black text-ink">{value}</p></div>;
}

function DocumentDayLink({ document, onOpen }: { document: IndexedDocument; onOpen: () => void }) {
  const label = <span className="rounded-md border border-black/10 px-3 py-4 font-black text-ink">{document.visibleName}<span className="ml-2 text-xs font-black text-sea">{document.category}</span></span>;
  if (document.sensitivity === "highly_sensitive" || document.requiresConfirmation) {
    return <RiskConfirmationDialog action="Abrir documento protegido" dataShared={document.visibleName} destination="Visor de VAGACIONES" consequence="Se mostrara un documento con datos personales o sensibles." onConfirm={onOpen}>{(open) => <button className="text-left" onClick={open} type="button">{label}</button>}</RiskConfirmationDialog>;
  }
  return <button className="text-left" onClick={onOpen} type="button">{label}</button>;
}

function hasUsableAddress(value: string) {
  return Boolean(value) && !/pendiente/i.test(value);
}

function isVeniceDay(day: number) {
  return day === 11 || day === 12;
}
