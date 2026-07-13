"use client";

import { useState } from "react";
import { useTripContext } from "@/hooks/useTripContext";
import { getDocumentFileUrl, getOfflineDocuments } from "@/lib/documents";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { RiskConfirmationDialog } from "./RiskConfirmationDialog";

export function OfflineScreen() {
  const context = useTripContext();
  const documents = getOfflineDocuments(context.activeDay.day);
  const [lastSync, setLastSync] = useState<string>("Nunca");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const saveAll = async () => {
    setSaving(true);
    setErrors([]);

    try {
      const cache = await caches.open("vagaciones-documents-v1");
      const failures: string[] = [];

      for (const document of documents) {
        try {
          await cache.add(getDocumentFileUrl(document));
        } catch {
          failures.push(document.visibleName);
        }
      }

      setErrors(failures);
      setLastSync(new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date()));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="grid gap-3">
        <RiskConfirmationDialog
          action="Guardar documentos offline"
          dataShared={`${documents.length} documento(s) no altamente sensibles`}
          destination="Cache local del navegador"
          consequence="Los archivos quedaran disponibles en este dispositivo sin conexion."
          onConfirm={saveAll}
        >
          {(open) => (
            <button className="rounded-lg bg-sea px-5 py-5 text-lg font-black text-white shadow-sm disabled:opacity-60" disabled={saving} onClick={open} type="button">
              {saving ? "Guardando..." : "Guardar todo el viaje offline"}
            </button>
          )}
        </RiskConfirmationDialog>

        <SectionCard title="Estado offline">
          <div className="grid gap-2">
            <p className="rounded-md bg-mist px-3 py-3 font-black text-ink">Ultima sincronizacion: {lastSync}</p>
            <p className="rounded-md bg-mist px-3 py-3 font-black text-ink">Documentos disponibles: {documents.length}</p>
            <p className="rounded-md bg-mist px-3 py-3 font-black text-ink">Errores de descarga: {errors.length}</p>
          </div>
        </SectionCard>

        <SectionCard title="Documentos conservados">
          <div className="grid gap-2">
            {documents.length > 0 ? documents.map((document) => (
              <div className="rounded-md border border-black/10 px-3 py-3" key={document.id}>
                <p className="font-black text-ink">{document.visibleName}</p>
                <p className="text-sm font-semibold text-ink/60">{document.category} · {document.availableOffline ? "offline" : "online"}</p>
              </div>
            )) : (
              <p className="rounded-md bg-mist px-3 py-3 font-black text-ink/70">No hay documentos reales para guardar todavia.</p>
            )}
          </div>
        </SectionCard>

        {errors.length > 0 ? (
          <SectionCard title="Errores">
            <ul className="grid gap-2">
              {errors.map((error) => (
                <li className="rounded-md bg-red-50 px-3 py-3 font-black text-red-700" key={error}>{error}</li>
              ))}
            </ul>
          </SectionCard>
        ) : null}
      </div>
    </AppShell>
  );
}
