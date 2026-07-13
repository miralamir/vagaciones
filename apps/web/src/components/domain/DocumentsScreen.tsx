"use client";

import { useEffect, useState } from "react";
import { useTripContext } from "@/hooks/useTripContext";
import { getViewerUrl } from "@/lib/documents";
import { getFlightDocumentStatuses } from "@/lib/flight-document-status";
import type { DocumentCategory, DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { FlightDocumentStatusCard } from "./FlightDocumentStatusCard";

const categories: Array<{ id: DocumentCategory; label: string }> = [
  { id: "vuelos", label: "Vuelos" },
  { id: "hoteles", label: "Hoteles" },
  { id: "trenes", label: "Trenes" },
  { id: "crucero", label: "Crucero" },
  { id: "entradas", label: "Entradas" },
  { id: "seguro", label: "Seguro" },
  { id: "traslados", label: "Traslados" },
  { id: "identidad", label: "Identidad" },
  { id: "otros", label: "Otros" }
];

export function DocumentsScreen() {
  const context = useTripContext();
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const flightStatuses = getFlightDocumentStatuses(context.activeDay, documents, context.now);

  useEffect(() => {
    void fetch("/api/documents/index", { cache: "no-store" })
      .then((response) => response.json())
      .then((index: DocumentIndex) => setDocuments([...index.documents]))
      .catch(() => setDocuments([]));
  }, []);

  return (
    <AppShell>
      <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-sea">Pendientes de hoy</p>
        <p className="mt-1 text-lg font-black text-ink">
          {context.pendingDocuments.length > 0 ? context.pendingDocuments.join(", ") : "Todo listo"}
        </p>
      </div>

      <div className="grid gap-3">
        {flightStatuses.length > 0 ? <SectionCard title="Documentacion de vuelo">{flightStatuses.map((status) => <FlightDocumentStatusCard key={status.flightLabel} status={status} />)}</SectionCard> : null}
        {categories.map((category) => {
          const items = documents.filter((document) => document.category === category.id);
          const isIdentity = category.id === "identidad";

          return (
            <SectionCard title={category.label} key={category.id}>
              {isIdentity && !identityConfirmed ? (
                <div className="grid gap-3">
                  <p className="text-sm font-semibold text-ink/70">Los documentos de identidad no se muestran completos en listados.</p>
                  <button className="rounded-md bg-ink px-4 py-4 font-black text-white" onClick={() => setIdentityConfirmed(true)} type="button">
                    Confirmar para ver identidad
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {items.length > 0 ? items.map((document) => (
                    <a className="grid gap-1 rounded-md border border-black/10 p-3 transition hover:bg-mist" href={getViewerUrl(document)} key={document.id}>
                      <span className="font-bold text-ink">{document.visibleName}</span>
                      <span className="text-sm text-ink/60">
                        {document.associatedDays.length > 0 ? `Dia ${document.associatedDays.join(", ")}` : "Sin dia asociado"} - {document.availableOffline ? "offline" : "online"}
                      </span>
                    </a>
                  )) : (
                    <p className="rounded-md bg-mist px-3 py-3 font-black text-ink/60">Sin documentos reales cargados.</p>
                  )}
                </div>
              )}
            </SectionCard>
          );
        })}
      </div>
    </AppShell>
  );
}
