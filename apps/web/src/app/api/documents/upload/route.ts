import { chmod, link, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { allowDocumentUpload, requireDocumentAccess } from "@/lib/server/document-auth";
import { readPrivateIndex, readPrivateReview, writePrivateReview } from "@/lib/server/document-index";
import { getTripIncomingDirectory } from "@/lib/server/document-storage";
import { safeStoredUploadName, validateUpload } from "@/lib/server/document-upload-core.mjs";
import type { DocumentCategory, IndexedDocument } from "@/lib/document-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const tripSlug = "europa-2026";
const uploadQueues = new Map<string, Promise<void>>();

type DeclaredKind = "boarding_pass" | "ticket" | "reservation" | "other";
type UploadFields = { kind: DeclaredKind; category: DocumentCategory; passenger: string; reservation: string; date: string; day: number | null; city: string; segment: string };

function noStore(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function cleanText(value: FormDataEntryValue | null, max = 120) {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001f]/g, "").slice(0, max) : "";
}

function fieldsFrom(form: FormData): UploadFields {
  const kind = cleanText(form.get("kind"), 24) as DeclaredKind;
  const category = cleanText(form.get("category"), 24) as DocumentCategory;
  const dayValue = cleanText(form.get("day"), 3);
  const day = /^\d{1,2}$/.test(dayValue) && Number(dayValue) >= 0 && Number(dayValue) <= 26 ? Number(dayValue) : null;
  return {
    kind: ["boarding_pass", "ticket", "reservation", "other"].includes(kind) ? kind : "other",
    category: ["vuelos", "hoteles", "trenes", "crucero", "entradas", "seguro", "traslados", "identidad", "otros"].includes(category) ? category : "otros",
    passenger: cleanText(form.get("passenger")), reservation: cleanText(form.get("reservation")),
    date: /^2026-\d{2}-\d{2}$/.test(cleanText(form.get("date"), 10)) ? cleanText(form.get("date"), 10) : "",
    day, city: cleanText(form.get("city")), segment: cleanText(form.get("segment"))
  };
}

function categoryFor(fields: UploadFields): DocumentCategory {
  if (fields.kind === "boarding_pass") return "vuelos";
  if (fields.kind === "ticket" && fields.category === "otros") return "entradas";
  return fields.category;
}

function visibleName(fields: UploadFields) {
  const labels: Record<DeclaredKind, string> = { boarding_pass: "Boarding pass", ticket: "Ticket", reservation: "Reserva", other: "Documento" };
  return `${labels[fields.kind]} cargado desde el celular`;
}

async function serialized<T>(key: string, task: () => Promise<T>) {
  const previous = uploadQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  uploadQueues.set(key, queued);
  await previous;
  try { return await task(); } finally { release(); if (uploadQueues.get(key) === queued) uploadQueues.delete(key); }
}

async function saveCandidate(file: File, fields: UploadFields) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const validation = validateUpload({ name: file.name, mimeType: file.type, bytes });
  if (!validation.ok) return { error: validation.error, status: validation.status };

  return serialized(tripSlug, async () => {
    const [review, index] = await Promise.all([readPrivateReview(tripSlug), readPrivateIndex(tripSlug)]);
    const known = [...review.documents, ...index.documents].find((document) => document.sha256 === validation.sha256);
    if (known) return { result: "duplicate", documentId: known.id, duplicate: true, status: known.reviewStatus };

    const incoming = getTripIncomingDirectory(tripSlug);
    await mkdir(incoming, { recursive: true, mode: 0o700 });
    await chmod(incoming, 0o700);
    const storageName = safeStoredUploadName(validation.sha256, validation.extension);
    const target = path.join(incoming, storageName);
    const temporary = path.join(incoming, `.${storageName}.${crypto.randomUUID()}.tmp`);
    try {
      const handle = await open(temporary, "wx", 0o600);
      await handle.writeFile(bytes);
      await handle.close();
      await chmod(temporary, 0o600);
      try { await link(temporary, target); } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          await unlink(temporary).catch(() => undefined);
          return { result: "duplicate", duplicate: true, status: "pending" };
        }
        throw error;
      }
      await unlink(temporary);
      await chmod(target, 0o600);
    } catch {
      await unlink(temporary).catch(() => undefined);
      return { error: "No se pudo guardar el archivo de forma segura.", status: 500 };
    }

    const candidateId = `review-${tripSlug}-${validation.sha256.slice(0, 16)}`;
    const candidate: IndexedDocument = {
      id: candidateId, visibleName: visibleName(fields), category: categoryFor(fields), provider: null,
      reservationCode: fields.reservation || null, date: fields.date || null, associatedDays: fields.day === null ? [] : [fields.day],
      city: fields.city || null, linkedReservation: null, passengers: fields.passenger ? [fields.passenger] : [],
      originalFileName: "Archivo cargado desde el celular", originalRelativePath: `incoming/${storageName}`,
      mimeType: validation.mimeType, availableOffline: false, storageAvailable: false, containsQR: fields.kind === "boarding_pass",
      sensitivity: "private", requiresConfirmation: true, offlinePolicy: "userApproved", retentionPolicy: "trip",
      containsPersonalData: true, containsFinancialData: false, containsLocationData: Boolean(fields.city || fields.segment),
      observations: "Carga movil pendiente de revision humana.", sizeBytes: bytes.length, sha256: validation.sha256,
      reviewStatus: "pending", warnings: ["Carga movil: verificar datos antes de aprobar."], extractionStatus: "requires_ocr",
      overallConfidence: "low", flightDocumentKind: fields.kind === "boarding_pass" ? "boarding_pass" : undefined,
      declaredDocumentKind: fields.kind, declaredTripSegment: fields.segment || null
    };
    await writePrivateReview(tripSlug, { ...review, generatedAt: new Date().toISOString(), documents: [...review.documents, candidate] });
    return { result: "pending", documentId: candidateId, duplicate: false, status: "pending" };
  });
}

export async function POST(request: Request) {
  const denied = await requireDocumentAccess(request);
  if (denied) return denied;
  if (!allowDocumentUpload(request)) return noStore({ result: "error", errors: ["Demasiadas cargas. Intenta nuevamente en un minuto."] }, 429);
  const form = await request.formData().catch(() => null);
  if (!form) return noStore({ result: "error", errors: ["Solicitud de carga invalida."] }, 400);
  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return noStore({ result: "error", errors: ["Selecciona al menos un archivo."] }, 400);
  if (files.some((file) => file.size > 20 * 1024 * 1024)) return noStore({ result: "error", errors: ["Cada archivo debe pesar como maximo 20 MB."] }, 413);
  const fields = fieldsFrom(form);
  const results = await Promise.all(files.map((file) => saveCandidate(file, fields)));
  const failed = results.find((result): result is { error: string; status: number } => "error" in result);
  return noStore({ result: failed ? "partial" : "ok", results }, failed ? failed.status : 201);
}
