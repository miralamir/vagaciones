"use client";

import Link from "next/link";
import { trip } from "@/lib/trip-data";
import { getDocumentFileUrl, getQuickDocumentsForDay, getViewerUrl } from "@/lib/documents";
import { useEffect, useState } from "react";
import { useTripContext } from "@/hooks/useTripContext";
import { getFlightDocumentStatuses } from "@/lib/flight-document-status";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { AppShell } from "./AppShell";
import { openExternalUrl, RiskConfirmationDialog } from "./RiskConfirmationDialog";
import { StressMode } from "./StressMode";
import { FlightDocumentStatusCard } from "./FlightDocumentStatusCard";

export function TodayScreen() {
  const context = useTripContext();
  const day = context.activeDay;
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const nextTransport = day.transport[0] ?? "Sin transporte programado";
  const quickDocs = getQuickDocumentsForDay(day.day);
  const flightStatuses = getFlightDocumentStatuses(day, documents, context.now);

  useEffect(() => {
    void fetch("/api/documents/index", { cache: "no-store" })
      .then((response) => response.json())
      .then((index: DocumentIndex) => setDocuments([...index.documents]))
      .catch(() => setDocuments([]));
  }, []);

  return (
    <AppShell>
      <section className="grid h-[calc(100dvh-150px)] gap-2 overflow-hidden sm:h-auto sm:overflow-visible">
        <div className="rounded-lg bg-ink p-4 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/55">Dia {day.day} de {trip.totalDays}</p>
              <h2 className="text-3xl font-black leading-none">{day.city}</h2>
              <p className="mt-1 text-sm font-semibold text-white/70">{day.date}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-ink">{context.statusLabel}</span>
          </div>
        </div>

        <div className="rounded-lg border-2 border-coral bg-white p-3 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-coral">Proximo traslado</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black leading-tight text-ink">{day.transfer.title}</h3>
              <p className="text-sm font-semibold text-ink/60">{day.transfer.estimatedTravelTime} de viaje · {context.countdown}</p>
            </div>
            <RiskConfirmationDialog
              action="Pedir Uber"
              dataShared={day.transfer.destination}
              destination="Uber"
              consequence="Se abrira una aplicacion externa con el destino."
              onConfirm={() => openExternalUrl(day.transfer.uberUrl)}
            >
              {(open) => <button className="shrink-0 rounded-md bg-coral px-4 py-3 text-center text-sm font-black text-white" onClick={open} type="button">Pedir Uber</button>}
            </RiskConfirmationDialog>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <TimeBox label="Ideal" value={day.transfer.idealLeaveTime} />
            <TimeBox label="Comoda" value={day.transfer.comfortableLeaveTime} />
            <TimeBox label="Limite" value={day.transfer.limitLeaveTime} strong />
          </div>
          <RiskConfirmationDialog
            action="Abrir Google Maps"
            dataShared={day.transfer.destination}
            destination="Google Maps"
            consequence="Se abrira una aplicacion externa con ubicacion o destino."
            onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
          >
            {(open) => <button className="mt-2 block w-full rounded-md bg-sea px-4 py-3 text-center text-sm font-black text-white" onClick={open} type="button">Abrir Google Maps</button>}
          </RiskConfirmationDialog>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {quickDocs.qr ? (
            <a className="rounded-lg bg-white px-2 py-4 text-center text-sm font-black text-ink shadow-sm" href={getViewerUrl(quickDocs.qr)}>Mostrar QR</a>
          ) : (
            <div className="rounded-lg bg-white px-2 py-4 text-center text-sm font-black text-ink/60 shadow-sm">Disponible despues del check-in</div>
          )}
          {quickDocs.hotel ? (
            <a className="rounded-lg bg-white px-2 py-4 text-center text-sm font-black text-ink shadow-sm" href={getViewerUrl(quickDocs.hotel)}>Mostrar Reserva</a>
          ) : (
            <div className="rounded-lg bg-white px-2 py-4 text-center text-sm font-black text-ink/60 shadow-sm">Sin reserva cargada</div>
          )}
          <Link className="rounded-lg bg-white px-2 py-4 text-center text-sm font-black text-ink shadow-sm" href="/trips/europa-2026/documentos">Identidad</Link>
        </div>

        {flightStatuses.map((status) => <FlightDocumentStatusCard key={status.flightLabel} status={status} />)}

        <div className="grid min-h-0 grid-cols-2 gap-2">
          <QuickCard label="Estoy en" value={context.inferredLocation} />
          <QuickCard label="Proximo evento" value={context.nextEvent} />
          <QuickCard label="Vuelo o tren" value={nextTransport} />
          <QuickCard
            label="Billete"
            value={flightStatuses[0]?.message ?? (quickDocs.boarding ? quickDocs.boarding.visibleName : "Sin vuelo programado")}
            href={quickDocs.boarding ? getDocumentFileUrl(quickDocs.boarding) : undefined}
          />
          <QuickCard label="Documentos pendientes" value={context.pendingDocuments.length > 0 ? context.pendingDocuments.join(", ") : "Todo listo"} href="/trips/europa-2026/documentos" />
          <QuickCard label="Check-in" value={context.shouldCheckIn ? "Hacer check-in hoy" : "Sin check-in ahora"} href="/trips/europa-2026/hotel" />
          <QuickCard label="Consejo" value={day.conciergeTip} />
        </div>
      </section>
      <StressMode day={day} />
    </AppShell>
  );
}

function TimeBox({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "rounded-md bg-red-50 p-2 text-red-700" : "rounded-md bg-mist p-2 text-ink"}>
      <p className="text-[10px] font-black uppercase tracking-wide opacity-65">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function QuickCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <>
      <p className="text-[10px] font-black uppercase tracking-wide text-sea">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black leading-tight text-ink">{value}</p>
    </>
  );

  if (href) {
    return <Link className="rounded-lg bg-white p-3 shadow-sm active:bg-mist" href={href}>{content}</Link>;
  }

  return <div className="rounded-lg bg-white p-3 shadow-sm">{content}</div>;
}
