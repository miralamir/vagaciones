"use client";

import { useEffect, useMemo, useState } from "react";
import { useTripContext } from "@/hooks/useTripContext";
import { getOfflineDocuments } from "@/lib/documents";
import { getOfflineLastSync, getSavedDocumentIds, getSavedOfflineDocuments, saveDocumentOffline } from "@/lib/document-offline";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { RiskConfirmationDialog } from "./RiskConfirmationDialog";

export function OfflineScreen() {
  const context = useTripContext();
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSavedIds(getSavedDocumentIds());
    setLastSync(getOfflineLastSync());
    void fetch("/api/documents/index", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((index: DocumentIndex) => setDocuments([...index.documents]))
      .catch(() => setDocuments(getSavedOfflineDocuments()));
  }, []);

  const essential = useMemo(() => getOfflineDocuments(context.activeDay.day, documents).filter((document) => document.storageAvailable !== false), [context.activeDay.day, documents]);
  const saved = essential.filter((document) => savedIds.includes(document.id));
  const pending = essential.filter((document) => !savedIds.includes(document.id));
  const confirmationRequired = documents.filter((document) => document.storageAvailable !== false && (document.sensitivity === "highly_sensitive" || document.requiresConfirmation));

  const saveEssential = async () => {
    setSaving(true);
    setErrors([]);
    const failures: string[] = [];
    for (const document of pending) {
      try {
        await saveDocumentOffline(document);
      } catch {
        failures.push(document.visibleName);
      }
    }
    setErrors(failures);
    setSavedIds(getSavedDocumentIds());
    setLastSync(getOfflineLastSync());
    setSaving(false);
  };

  return <AppShell><section className="grid gap-3">
    <div className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-sea">Offline</p><h1 className="mt-1 text-2xl font-black text-ink">Documentos listos para cuando no haya senal</h1></div>
    <RiskConfirmationDialog action="Guardar documentos esenciales offline" dataShared={`${pending.length} documento(s) esenciales no sensibles`} destination="Cache local del navegador" consequence="Los archivos quedaran disponibles en este dispositivo sin conexion." onConfirm={() => { void saveEssential(); }}>
      {(open) => <button className="rounded-lg bg-sea px-5 py-5 text-lg font-black text-white shadow-sm disabled:opacity-60" disabled={saving || pending.length === 0} onClick={open} type="button">{saving ? "Guardando..." : "Guardar documentos esenciales offline"}</button>}
    </RiskConfirmationDialog>
    <SectionCard title="Estado offline"><div className="grid gap-2"><p className="rounded-md bg-mist px-3 py-3 font-black text-ink">Guardados offline: {saved.length}</p><p className="rounded-md bg-mist px-3 py-3 font-black text-ink">Pendientes de guardar: {pending.length}</p><p className="rounded-md bg-mist px-3 py-3 font-black text-ink">Requieren confirmacion: {confirmationRequired.length}</p><p className="rounded-md bg-mist px-3 py-3 font-black text-ink">Ultima actualizacion: {lastSync ?? "Nunca"}</p></div></SectionCard>
    <DocumentList title="Guardados offline" documents={saved} empty="Todavia no hay documentos guardados en este dispositivo." />
    <DocumentList title="Pendientes de guardar" documents={pending} empty="No hay documentos esenciales pendientes." />
    <DocumentList title="No se guardan sin confirmacion" documents={confirmationRequired} empty="No hay documentos que requieran aprobacion adicional." />
    {errors.length ? <SectionCard title="Errores de descarga"><ul className="grid gap-2">{errors.map((error) => <li className="rounded-md bg-red-50 px-3 py-3 font-black text-red-700" key={error}>{error}</li>)}</ul></SectionCard> : null}
  </section></AppShell>;
}

function DocumentList({ title, documents, empty }: { title: string; documents: IndexedDocument[]; empty: string }) {
  return <SectionCard title={title}>{documents.length ? <div className="grid gap-2">{documents.map((document) => <div className="rounded-md border border-black/10 px-3 py-3" key={document.id}><p className="font-black text-ink">{document.visibleName}</p><p className="text-sm font-semibold text-ink/60">{document.category} - {document.associatedDays.length ? `Dias ${document.associatedDays.join(", ")}` : "Documento global"}</p></div>)}</div> : <p className="rounded-md bg-mist px-3 py-3 font-bold text-ink/65">{empty}</p>}</SectionCard>;
}
