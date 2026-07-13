"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getDocumentsForDay, getViewerUrl } from "@/lib/documents";
import { getFlightDocumentStatuses } from "@/lib/flight-document-status";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { getStatusLabel, getTripDay, trip } from "@/lib/trip-data";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { openExternalUrl, openUberToDestination, RiskConfirmationDialog } from "./RiskConfirmationDialog";
import { FlightDocumentStatusCard } from "./FlightDocumentStatusCard";

export function DayScreen({ initialDay }: { initialDay: number }) {
  const router = useRouter();
  const day = getTripDay(initialDay);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [approvedDocuments, setApprovedDocuments] = useState<IndexedDocument[]>([]);

  const previousDay = Math.max(day.day - 1, 1);
  const nextDay = Math.min(day.day + 1, trip.totalDays);
  const canGoPrevious = day.day > 1;
  const canGoNext = day.day < trip.totalDays;

  const navigateToDay = (targetDay: number) => {
    router.push(`/trips/europa-2026/days/${targetDay}`);
  };

  const documentList = useMemo(() => getDocumentsForDay(day.day, approvedDocuments), [approvedDocuments, day.day]);
  const flightStatuses = getFlightDocumentStatuses(day, approvedDocuments);

  useEffect(() => {
    void fetch("/api/documents/index", { cache: "no-store" })
      .then((response) => response.json())
      .then((index: DocumentIndex) => setApprovedDocuments([...index.documents]))
      .catch(() => setApprovedDocuments([]));
  }, []);

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
              <p className="text-xs font-black uppercase tracking-wide text-sea">Dia {day.day} de {trip.totalDays}</p>
              <h2 className="text-xl font-black leading-tight text-ink">{day.date}</h2>
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
              <RiskConfirmationDialog
                action="Abrir ubicacion"
                dataShared={day.transfer.destination}
                destination="Google Maps"
                consequence="Se abrira una aplicacion externa con ubicacion o destino."
                onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
              >
                {(open) => <button className="rounded-md bg-sea px-4 py-4 text-center font-black text-white" onClick={open} type="button">Llevame</button>}
              </RiskConfirmationDialog>
            </div>
          </SectionCard>

          <SectionCard title="Transporte">
            <div className="grid gap-2">
              <List items={day.transport.length > 0 ? day.transport : ["Sin transporte programado"]} />
              {day.reservationIds.includes("transfer-home-eze") ? <div className="rounded-md bg-mist px-3 py-3 text-sm font-bold text-ink">Casa → Aeropuerto Ezeiza. Configurar dirección de casa para pedir Uber.</div> : null}
              {day.flight ? <FlightDetails flight={day.flight} documents={approvedDocuments} /> : null}
              <RiskConfirmationDialog
                action="Abrir traslado"
                dataShared={day.transfer.destination}
                destination="Google Maps"
                consequence="Se abrira una aplicacion externa con ubicacion o destino."
                onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
              >
                {(open) => <button className="rounded-md bg-ink px-4 py-4 text-center font-black text-white" onClick={open} type="button">Llevame</button>}
              </RiskConfirmationDialog>
            </div>
          </SectionCard>

          <SectionCard title="Hotel">
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
                  {hasUsableAddress(day.hotel.address) ? <RiskConfirmationDialog
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
          </SectionCard>

          <SectionCard title="Actividades">
            <div className="grid gap-2">
              <List items={day.activities} />
              <RiskConfirmationDialog
                action="Abrir actividad"
                dataShared={day.nextEvent}
                destination="Google Maps"
                consequence="Se abrira una aplicacion externa con ubicacion o destino."
                onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
              >
                {(open) => <button className="rounded-md bg-sea px-4 py-4 text-center font-black text-white" onClick={open} type="button">Llevame</button>}
              </RiskConfirmationDialog>
            </div>
          </SectionCard>

          <SectionCard title="Checklist">
            <List items={day.checklist} />
          </SectionCard>

          <SectionCard title="Pendientes">
            <List items={day.pending.length > 0 ? day.pending : ["Sin pendientes cargados."]} />
          </SectionCard>

          <SectionCard title="Consejo">
            <p className="text-ink/75">{day.conciergeTip}</p>
          </SectionCard>

          <SectionCard title="Documentos del dia">
            <div className="grid gap-2">
              {flightStatuses.map((status) => <FlightDocumentStatusCard key={status.flightLabel} status={status} />)}
              {documentList.length > 0 ? (
                documentList.map((document) => (
                  <a className="rounded-md border border-black/10 px-3 py-4 font-black text-ink" href={getViewerUrl(document)} key={document.id}>
                    {document.visibleName}
                    <span className="ml-2 text-xs font-black text-sea">{document.category}</span>
                  </a>
                ))
              ) : (
                <div className="rounded-md border border-black/10 px-3 py-4 font-black text-ink/60">No hay documentos reales asociados a este dia.</div>
              )}
            </div>
          </SectionCard>
        </div>
      </section>
    </AppShell>
  );
}

function FlightDetails({ flight, documents }: { flight: NonNullable<ReturnType<typeof getTripDay>["flight"]>; documents: IndexedDocument[] }) {
  const document = documents.find((item) => item.linkedReservation && flight.reservations.includes(item.linkedReservation));
  return <div className="rounded-md bg-mist p-3"><p className="text-[10px] font-black uppercase tracking-wide text-sea">Vuelo</p><p className="font-black text-ink">{flight.airline} {flight.flightNumber}</p><p className="mt-1 text-sm font-bold text-ink/70">{flight.origin} a {flight.destination}</p><p className="mt-1 text-sm font-semibold text-ink/70">Sale {flight.departure} · Llega {flight.arrival}</p><p className="mt-2 text-sm font-bold text-ink">Reserva: {flight.reservations.join(" / ")}</p><div className="mt-3 flex items-center justify-between rounded-md bg-white px-3 py-2"><span className="font-bold text-ink">Reserva / e-ticket</span>{document ? <a className="rounded-md bg-sea px-3 py-2 text-sm font-black text-white" href={getViewerUrl(document)}>Mostrar reserva</a> : <span className="text-sm font-black text-ink/60">Reserva PDF pendiente de asociar</span>}</div></div>;
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

function hasUsableAddress(value: string) {
  return Boolean(value) && !/pendiente/i.test(value);
}
