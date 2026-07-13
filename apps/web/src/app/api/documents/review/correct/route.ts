import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentCategory } from "@/lib/document-types";
import type { DocumentReviewIndex } from "@/lib/document-review-types";

export const dynamic = "force-dynamic";

const categories: DocumentCategory[] = ["vuelos", "hoteles", "trenes", "crucero", "entradas", "seguro", "traslados", "identidad", "otros"];

export async function POST(request: Request) {
  const body = await request.json() as {
    documentId?: string;
    patch?: { category?: DocumentCategory; linkedReservation?: string; city?: string; associatedDays?: number[] };
  };

  if (!body.documentId || !body.patch) {
    return Response.json({ ok: false, error: "Datos de correccion incompletos." }, { status: 400 });
  }

  if (body.patch.category && !categories.includes(body.patch.category)) {
    return Response.json({ ok: false, error: "Categoria invalida." }, { status: 400 });
  }

  const days = body.patch.associatedDays ?? [];
  if (!days.every((day) => Number.isInteger(day) && day >= 1 && day <= 365)) {
    return Response.json({ ok: false, error: "Dias asociados invalidos." }, { status: 400 });
  }

  const reviewPath = path.join(process.cwd(), "..", "..", "data", "trips", "europa-2026", "document-review.json");
  const review = JSON.parse(await readFile(reviewPath, "utf8")) as DocumentReviewIndex;
  const document = review.documents.find((entry) => entry.id === body.documentId);

  if (!document) {
    return Response.json({ ok: false, error: "Documento no encontrado." }, { status: 404 });
  }

  const nextDocument = {
    ...document,
    category: body.patch.category ?? document.category,
    linkedReservation: normalizeText(body.patch.linkedReservation) ?? document.linkedReservation,
    city: normalizeText(body.patch.city) ?? document.city,
    associatedDays: days.length > 0 ? [...new Set(days)].sort((a, b) => a - b) : document.associatedDays,
    overallConfidence: "medium" as const,
    warnings: document.warnings.filter((warning) => warning !== "Requiere revision manual.")
  };

  const nextReview: DocumentReviewIndex = {
    ...review,
    documents: review.documents.map((entry) => entry.id === body.documentId ? nextDocument : entry)
  };

  await writeFile(reviewPath, `${JSON.stringify(nextReview, null, 2)}\n`, "utf8");
  return Response.json({ ok: true, document: nextDocument });
}

function normalizeText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 160) : null;
}
