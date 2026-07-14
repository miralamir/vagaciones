"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/hooks/useTripContext";
import { getDocumentsForDay, getViewerUrl } from "@/lib/documents";
import { getSavedDocumentIds, saveDocumentOffline } from "@/lib/document-offline";
import { getFlightDocumentStatuses } from "@/lib/flight-document-status";
import type { DocumentCategory, DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { FlightDocumentStatusCard } from "./FlightDocumentStatusCard";
import { RiskConfirmationDialog } from "./RiskConfirmationDialog";

const categories: Array<{ id: DocumentCategory; label: string }> = [
  { id: "vuelos", label: "Vuelos" },
  { id: "hoteles", label: "Hoteles" },
  { id: "trenes", label: "Trenes" },
  { id: "crucero", label: "Crucero" },
  { id: "entradas", label: "Entradas" },
  { id: "traslados", label: "Traslados" },
  { id: "seguro", label: "Seguros" },
  { id: "identidad", label: "Documentos personales" },
  { id: "otros", label: "Otros" }
];

export function DocumentsScreen() {
  const context = useTripContext();
  const router = useRouter();
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [query, setQuery] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [view, setView] = useState<"day" | "type">("day");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const flightStatuses = getFlightDocumentStatuses(context.activeDay, documents, context.now);

  useEffect(() => {
    setSavedIds(getSavedDocumentIds());
    void fetch("/api/documents/index", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((index: DocumentIndex) => setDocuments([...index.documents]))
      .catch(() => setDocuments([]));
  }, []);

  const filtered = useMemo(() => documents.filter((document) => {
    const haystack = [document.visibleName, document.provider, document.reservationCode, ...document.passengers].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = haystack.includes(query.trim().toLowerCase());
    const matchesDay = dayFilter === "all" || (dayFilter === "today" ? getDocumentsForDay(context.activeDay.day, [document]).length > 0 : document.associatedDays.includes(Number(dayFilter)));
    return matchesSearch && matchesDay;
  }), [context.activeDay.day, documents, dayFilter, query]);

  const associated = filtered.filter((document) => document.associatedDays.length > 0 || (document.relatedReservationIds?.length ?? 0) > 0);
  const unassociated = filtered.filter((document) => !document.associatedDays.length && !(document.relatedReservationIds?.length ?? 0));
  const days = [...new Set(associated.flatMap((document) => document.associatedDays))].sort((a, b) => a - b);

  const save = async (document: IndexedDocument) => {
    try {
      await saveDocumentOffline(document);
      setSavedIds(getSavedDocumentIds());
      setMessage(`${document.visibleName} esta disponible offline en este dispositivo.`);
    } catch {
      setMessage(`No se pudo guardar ${document.visibleName}. Verifica que el archivo original este disponible.`);
    }
  };

  return (
    <AppShell>
      <section className="grid gap-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-sea">Documentos</p>
          <h1 className="mt-1 text-2xl font-black text-ink">Todo lo importante, a un toque</h1>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input aria-label="Buscar documento" className="rounded-md border border-black/10 px-3 py-3 font-semibold text-ink" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar documento, proveedor o localizador" value={query} />
            <select aria-label="Filtrar por dia" className="rounded-md border border-black/10 bg-white px-3 py-3 font-bold text-ink" onChange={(event) => setDayFilter(event.target.value)} value={dayFilter}>
              <option value="all">Todos los dias</option>
              <option value="today">Hoy: Dia {context.activeDay.day}</option>
              {days.map((day) => <option key={day} value={day}>Dia {day}</option>)}
            </select>
            <div className="grid grid-cols-2 rounded-md border border-black/10 p-1 text-sm font-black">
              <button className={view === "day" ? "rounded bg-sea px-3 text-white" : "rounded px-3 text-ink"} onClick={() => setView("day")} type="button">Por dia</button>
              <button className={view === "type" ? "rounded bg-sea px-3 text-white" : "rounded px-3 text-ink"} onClick={() => setView("type")} type="button">Por tipo</button>
            </div>
          </div>
          {message ? <p className="mt-3 rounded-md bg-mist px-3 py-3 text-sm font-bold text-ink">{message}</p> : null}
        </div>

        {flightStatuses.length > 0 ? <SectionCard title="Estado de vuelos">{flightStatuses.map((status) => <FlightDocumentStatusCard key={status.flightLabel} status={status} />)}</SectionCard> : null}

        {getDocumentsForDay(context.activeDay.day, filtered).length > 0 ? <SectionCard title={`Hoy - Dia ${context.activeDay.day}`}>
          <div className="grid gap-3">{getDocumentsForDay(context.activeDay.day, filtered).map((document) => <DocumentCard document={document} key={document.id} onOpen={() => router.push(getViewerUrl(document))} onSave={save} saved={savedIds.includes(document.id)} />)}</div>
        </SectionCard> : null}

        {view === "day" ? days.map((day) => {
          const items = associated.filter((document) => document.associatedDays.includes(day));
          return items.length > 0 ? <SectionCard key={day} title={`Dia ${day}`}>{items.map((document) => <DocumentCard document={document} key={document.id} onOpen={() => router.push(getViewerUrl(document))} onSave={save} saved={savedIds.includes(document.id)} />)}</SectionCard> : null;
        }) : categories.map((category) => {
          const items = associated.filter((document) => document.category === category.id);
          return items.length > 0 ? <SectionCard key={category.id} title={category.label}>{items.map((document) => <DocumentCard document={document} key={document.id} onOpen={() => router.push(getViewerUrl(document))} onSave={save} saved={savedIds.includes(document.id)} />)}</SectionCard> : null;
        })}

        <SectionCard title="Documentos sin asociar">
          {unassociated.length > 0 ? <div className="grid gap-3">{unassociated.map((document) => <DocumentCard document={document} key={document.id} onOpen={() => router.push(getViewerUrl(document))} onSave={save} saved={savedIds.includes(document.id)} />)}</div> : <p className="rounded-md bg-mist px-3 py-3 font-bold text-ink/65">No hay documentos sin asociar para este filtro.</p>}
        </SectionCard>
      </section>
    </AppShell>
  );
}

function DocumentCard({ document, onOpen, onSave, saved }: { document: IndexedDocument; onOpen: () => void; onSave: (document: IndexedDocument) => Promise<void>; saved: boolean }) {
  const protectedDocument = document.sensitivity === "highly_sensitive" || document.requiresConfirmation;
  const state = !document.associatedDays.length && !(document.relatedReservationIds?.length ?? 0) ? "Sin asociar" : document.flightDocumentKind === "boarding_pass" || document.flightDocumentKind === "qr" ? "Futuro esperado" : document.storageAvailable === false ? "Archivo pendiente de cargar" : "Disponible";
  const saveButton = document.storageAvailable === false ? <span className="rounded-md bg-mist px-3 py-3 text-center text-sm font-black text-ink/60">Archivo no disponible</span> : protectedDocument ? <RiskConfirmationDialog action="Guardar documento protegido offline" dataShared={document.visibleName} destination="Cache local del dispositivo" consequence="El documento quedara disponible sin conexion en este dispositivo." onConfirm={() => { void onSave(document); }}>{(open) => <button className="rounded-md bg-ink px-3 py-3 text-sm font-black text-white" onClick={open} type="button">Guardar offline</button>}</RiskConfirmationDialog> : <button className="rounded-md bg-ink px-3 py-3 text-sm font-black text-white" onClick={() => { void onSave(document); }} type="button">{saved ? "Guardado offline" : "Guardar offline"}</button>;

  return <div className="grid gap-3 rounded-md border border-black/10 p-3">
    <div className="grid gap-1"><p className="font-black text-ink">{document.visibleName}</p><p className="text-sm font-semibold text-ink/65">{document.category} {document.provider ? `- ${document.provider}` : ""}</p><p className="text-sm font-semibold text-ink/65">{document.reservationCode ? `Localizador: ${document.reservationCode}` : "Localizador pendiente"} {document.associatedDays.length ? `- Dias: ${document.associatedDays.join(", ")}` : ""}</p>{document.relatedReservationIds?.length ? <p className="text-sm font-semibold text-ink/65">Reserva: {document.relatedReservationIds.join(", ")}</p> : null}{document.passengers.length ? <p className="text-sm font-semibold text-ink/65">Pasajero: {document.passengers.join(", ")}</p> : null}<p className="text-xs font-black uppercase tracking-wide text-sea">{state} - {document.sensitivity}</p>{document.observations ? <p className="text-sm font-semibold text-ink/65">{document.observations}</p> : null}</div>
    <div className="grid grid-cols-2 gap-2">{protectedDocument ? <RiskConfirmationDialog action="Abrir documento protegido" dataShared={document.visibleName} destination="Visor de VAGACIONES" consequence="Se mostrara un documento con datos personales o sensibles." onConfirm={onOpen}>{(open) => <button className="rounded-md bg-sea px-3 py-3 text-sm font-black text-white" onClick={open} type="button">Abrir documento</button>}</RiskConfirmationDialog> : <button className="rounded-md bg-sea px-3 py-3 text-sm font-black text-white" onClick={onOpen} type="button">Abrir documento</button>}{saveButton}</div>
  </div>;
}
