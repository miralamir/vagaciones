"use client";

import { useEffect, useMemo, useState } from "react";
import type { DetectionConfidence, DocumentCategory } from "@/lib/document-types";
import type { DocumentReviewIndex, ReviewDocument } from "@/lib/document-review-types";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";

const categories: DocumentCategory[] = ["vuelos", "hoteles", "trenes", "crucero", "entradas", "seguro", "traslados", "identidad", "otros"];

export function DocumentReviewScreen() {
  const [review, setReview] = useState<DocumentReviewIndex>(emptyReview());
  const [loadError, setLoadError] = useState<"unauthorized" | "unavailable" | null>(null);
  const [confidence, setConfidence] = useState<"all" | DetectionConfidence>("all");
  const [category, setCategory] = useState<"all" | DocumentCategory>("all");
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [onlyReview, setOnlyReview] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/documents/review", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as unknown;
        if (!response.ok) {
          setLoadError(response.status === 401 || response.status === 403 ? "unauthorized" : "unavailable");
          return;
        }
        setReview(normalizeReview(data));
        setLoadError(null);
      })
      .catch(() => setLoadError("unavailable"));
  }, []);

  const documents = useMemo(() => review.documents.filter((document) => {
    if (confidence !== "all" && document.overallConfidence !== confidence) return false;
    if (category !== "all" && document.category !== category) return false;
    if (onlyUnlinked && document.linkedReservation) return false;
    if (onlyReview && document.overallConfidence === "high" && document.extractionStatus === "extracted") return false;
    return true;
  }), [review.documents, confidence, category, onlyUnlinked, onlyReview]);

  const approveDocument = async (documentId: string) => {
    setSaving(documentId);
    const response = await fetch("/api/documents/review/approve", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId })
    });
    if (response.ok) updateDocument(documentId, { reviewStatus: "approved" });
    setSaving(null);
  };

  const approveHighConfidence = async () => {
    const candidates = review.documents.filter((document) => document.overallConfidence === "high" && document.sensitivity !== "highly_sensitive" && document.reviewStatus === "pending");
    for (const document of candidates) await approveDocument(document.id);
  };
  const setStatus = async (documentId: string, status: "ignored" | "rejected") => {
    setSaving(documentId);
    const response = await fetch("/api/documents/review/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, status }) });
    if (response.ok) updateDocument(documentId, { reviewStatus: status });
    setSaving(null);
  };

  const saveCorrection = async (document: ReviewDocument, form: HTMLFormElement) => {
    const data = new FormData(form);
    setSaving(document.id);
    const response = await fetch("/api/documents/review/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: document.id,
        patch: {
          category: data.get("category"),
          linkedReservation: data.get("linkedReservation"),
          city: data.get("city"),
          associatedDays: String(data.get("associatedDays") ?? "").split(",").map((value) => Number(value.trim())).filter(Boolean)
        }
      })
    });
    const payload = await response.json() as { document?: ReviewDocument };
    if (response.ok && payload.document) {
      updateDocument(document.id, payload.document);
      setEditing(null);
    }
    setSaving(null);
  };

  const updateDocument = (id: string, patch: Partial<ReviewDocument>) => setReview((current) => ({
    ...current,
    documents: current.documents.map((document) => document.id === id ? { ...document, ...patch } : document)
  }));
  const highCount = review.documents.filter((document) => document.overallConfidence === "high" && document.sensitivity !== "highly_sensitive" && document.reviewStatus === "pending").length;

  return <AppShell><div className="grid gap-3">
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-sea">Ingesta privada</p>
      <h2 className="mt-1 text-2xl font-black text-ink">Revision de documentos</h2>
      <p className="mt-1 text-sm font-semibold text-ink/60">{review.privateIncomingDirectory}</p>
    </div>

    {loadError === "unauthorized" ? <SectionCard title="Acceso requerido"><p className="text-sm font-semibold text-ink/70">Inicia sesion para revisar documentos privados.</p><a className="mt-3 inline-flex rounded-md bg-sea px-3 py-2 font-black text-white" href="/trips/europa-2026/documentos/acceso">Ir al acceso</a></SectionCard> : null}
    {loadError === "unavailable" ? <SectionCard title="Revision no disponible"><p className="text-sm font-semibold text-ink/70">No se pudo cargar la revision ahora. Volve a intentar en unos minutos.</p></SectionCard> : null}

    <SectionCard title="Acciones rapidas">
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="rounded-md bg-mist px-3 py-3 text-sm font-bold text-ink">{review.documents.length} detectados · {highCount} listos para aprobar</p>
        <button className="rounded-md bg-sea px-3 py-3 font-black text-white disabled:opacity-50" disabled={highCount === 0 || saving !== null} onClick={() => { void approveHighConfidence(); }} type="button">Aprobar todos los de alta confianza</button>
      </div>
    </SectionCard>

    <SectionCard title="Filtros">
      <div className="grid gap-2 sm:grid-cols-4">
        <select aria-label="Confianza" className="rounded-md border border-black/10 bg-white px-3 py-3 font-bold text-ink" onChange={(event) => setConfidence(event.target.value as "all" | DetectionConfidence)} value={confidence}><option value="all">Toda confianza</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select>
        <select aria-label="Categoria" className="rounded-md border border-black/10 bg-white px-3 py-3 font-bold text-ink" onChange={(event) => setCategory(event.target.value as "all" | DocumentCategory)} value={category}><option value="all">Todas las categorias</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <button className={`rounded-md px-3 py-3 font-black ${onlyUnlinked ? "bg-ink text-white" : "bg-mist text-ink"}`} onClick={() => setOnlyUnlinked((value) => !value)} type="button">Sin asociar</button>
        <button className={`rounded-md px-3 py-3 font-black ${onlyReview ? "bg-ink text-white" : "bg-mist text-ink"}`} onClick={() => setOnlyReview((value) => !value)} type="button">Requiere revision</button>
      </div>
    </SectionCard>

    {review.warnings.length > 0 ? <SectionCard title="Advertencias"><ul className="grid gap-2">{review.warnings.map((warning) => <li className="rounded-md bg-red-50 px-3 py-3 font-black text-red-700" key={warning}>{warning}</li>)}</ul></SectionCard> : null}

    <SectionCard title={`Detectados (${documents.length})`}>
      <div className="grid gap-3">
        {documents.map((document) => <article className="rounded-md border border-black/10 p-3" key={document.id}>
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{document.visibleName}</h3><p className="text-sm font-semibold text-ink/60">{document.category} · {document.sensitivity} · <Confidence value={document.overallConfidence ?? "low"} /></p><p className="text-xs font-semibold text-ink/50">{document.originalFileName}</p></div><span className="rounded-full bg-mist px-2 py-1 text-xs font-black text-sea">{document.reviewStatus}</span></div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><Meta label="Proveedor" value={document.detections?.provider.value ?? "Sin detectar"} confidence={document.detections?.provider.confidence} /><Meta label="Reserva / localizador" value={document.linkedReservation ?? "Sin asociar"} confidence={document.detections?.confirmationCode.confidence} /><Meta label="Fecha" value={document.date ?? "Sin detectar"} confidence={document.detections?.dates[0]?.confidence} source={document.detections?.dates[0]?.source} /><Meta label="Dias" value={document.associatedDays.length ? document.associatedDays.join(", ") : "Sin asociar"} confidence={document.detections?.association.confidence} /><Meta label="Pasajeros" value={document.passengers.length ? document.passengers.join(", ") : "Sin detectar"} confidence={document.detections?.passengers[0]?.confidence} /><Meta label="Texto" value={document.extractionStatus === "extracted" ? "Extraido" : "Requiere OCR"} confidence={document.extractionStatus === "extracted" ? "high" : "low"} /></dl>
          {document.detections?.segments?.length ? <div className="mt-3 grid gap-2">{document.detections.segments.map((segment) => <div className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm" key={`${segment.flightNumber}-${segment.origin}-${segment.destination}`}><p className="font-black text-ink">{segment.flightNumber ?? "Tramo"}: {segment.origin} {segment.originCity} → {segment.destination} {segment.destinationCity}</p><p className="font-bold text-ink/60">{segment.departureDate ?? "Fecha sin detectar"}{segment.arrivalDate ? ` → ${segment.arrivalDate}` : ""} · Dias {segment.associatedDays.join(", ") || "sin asociar"} · <Confidence value={segment.confidence} />{segment.dateSource === "inferred" ? " · inferido desde itinerario" : ""}</p></div>)}</div> : document.detections?.flightNumbers.length ? <p className="mt-2 text-sm font-bold text-ink">Vuelo: {document.detections.flightNumbers.map((item) => item.value).join(", ")}</p> : null}
          {document.detections?.ignoredDates?.length ? <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm"><p className="font-black text-amber-800">Fechas secundarias ignoradas</p>{document.detections.ignoredDates.map((date) => <p className="mt-1 font-semibold text-amber-800" key={`${date.value}-${date.classification}`}>{date.value} · {date.classification} · {date.reason}</p>)}</div> : null}
          {document.detections?.reviewReason ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Requiere revision: {document.detections.reviewReason}</p> : null}
          {document.warnings.length ? <ul className="mt-3 grid gap-1">{document.warnings.map((warning) => <li className="rounded-md bg-red-50 px-2 py-2 text-sm font-bold text-red-700" key={warning}>{warning}</li>)}</ul> : null}
          {editing === document.id ? <CorrectionForm document={document} disabled={saving === document.id} onCancel={() => setEditing(null)} onSave={(form) => { void saveCorrection(document, form); }} /> : <div className="mt-3 grid grid-cols-4 gap-2"><button className="rounded-md bg-sea px-3 py-3 font-black text-white disabled:opacity-50" disabled={saving === document.id || document.reviewStatus === "approved"} onClick={() => { void approveDocument(document.id); }} type="button">Aprobar</button><button className="rounded-md bg-mist px-3 py-3 font-black text-ink" onClick={() => setEditing(document.id)} type="button">Corregir</button><button className="rounded-md bg-ink px-3 py-3 font-black text-white" onClick={() => { void setStatus(document.id, "ignored"); }} type="button">Ignorar</button><button className="rounded-md bg-red-50 px-3 py-3 font-black text-red-700" onClick={() => { void setStatus(document.id, "rejected"); }} type="button">Rechazar</button></div>}
        </article>)}
        {documents.length === 0 ? <p className="rounded-md bg-mist px-3 py-3 font-black text-ink/70">No hay documentos para este filtro.</p> : null}
      </div>
    </SectionCard>
  </div></AppShell>;
}

function CorrectionForm({ document, disabled, onCancel, onSave }: { document: ReviewDocument; disabled: boolean; onCancel: () => void; onSave: (form: HTMLFormElement) => void }) { return <form className="mt-3 grid gap-2 rounded-md bg-mist p-3" onSubmit={(event) => { event.preventDefault(); onSave(event.currentTarget); }}><select defaultValue={document.category} name="category" className="rounded-md border border-black/10 bg-white px-3 py-2 font-bold">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><input className="rounded-md border border-black/10 bg-white px-3 py-2 font-bold" defaultValue={document.linkedReservation ?? ""} name="linkedReservation" placeholder="Reserva o asociacion" /><input className="rounded-md border border-black/10 bg-white px-3 py-2 font-bold" defaultValue={document.city ?? ""} name="city" placeholder="Ciudad" /><input className="rounded-md border border-black/10 bg-white px-3 py-2 font-bold" defaultValue={document.associatedDays.join(", ")} name="associatedDays" placeholder="Dias, por ejemplo: 3, 4" /><div className="grid grid-cols-2 gap-2"><button className="rounded-md bg-sea px-3 py-2 font-black text-white disabled:opacity-50" disabled={disabled} type="submit">Guardar</button><button className="rounded-md bg-white px-3 py-2 font-black text-ink" onClick={onCancel} type="button">Cancelar</button></div></form>; }
function Meta({ label, value, confidence, source }: { label: string; value: string; confidence?: DetectionConfidence; source?: "extracted" | "inferred" | "inferred_from_itinerary" }) { return <div className="rounded-md bg-mist px-3 py-2"><dt className="text-[10px] font-black uppercase tracking-wide text-sea">{label}</dt><dd className="mt-1 font-bold text-ink">{value} {confidence ? <Confidence value={confidence} /> : null}{source === "inferred" || source === "inferred_from_itinerary" ? " · inferido desde itinerario" : null}</dd></div>; }
function Confidence({ value }: { value: DetectionConfidence }) { return <span className={value === "high" ? "text-emerald-700" : value === "medium" ? "text-amber-700" : "text-red-700"}>{value}</span>; }
function emptyReview(): DocumentReviewIndex { return { tripSlug: "europa-2026", generatedAt: new Date(0).toISOString(), privateIncomingDirectory: "DOCUMENT_STORAGE/europa-2026/incoming", documents: [], duplicates: [], warnings: [] }; }

function normalizeReview(value: unknown): DocumentReviewIndex {
  const fallback = emptyReview();
  if (!value || typeof value !== "object") return fallback;
  const review = value as Partial<DocumentReviewIndex>;
  return {
    ...fallback,
    ...review,
    documents: Array.isArray(review.documents) ? review.documents : [],
    duplicates: Array.isArray(review.duplicates) ? review.duplicates : [],
    warnings: Array.isArray(review.warnings) ? review.warnings : []
  };
}
