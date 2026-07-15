import { constants } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import type { DocumentReviewIndex } from "@/lib/document-review-types";
import { DocumentStorageError, getTripDocumentsDirectory, resolveTripStoragePath } from "@/lib/server/document-storage";
import { requireDocumentAccess } from "@/lib/server/document-auth";
import { readPrivateIndex, readPrivateReview, writePrivateIndex, writePrivateReview } from "@/lib/server/document-index";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await requireDocumentAccess(request); if (denied) return denied;
  const { documentId } = await request.json() as { documentId?: string };

  if (!documentId) {
    return Response.json({ ok: false, error: "documentId requerido" }, { status: 400 });
  }

  const review = await readPrivateReview("europa-2026");
  const candidate = review.documents.find((document) => document.id === documentId);

  if (!candidate) {
    return Response.json({ ok: false, error: "Documento no encontrado" }, { status: 404 });
  }

  const index = await readPrivateIndex("europa-2026");

  const approvedId = `doc-${candidate.sha256.slice(0, 24)}`;
  const safeFileName = sanitizeFileName(candidate.originalFileName);
  const storageRelativePath = `documents/${candidate.sha256.slice(0, 16)}-${safeFileName}`;

  try {
    const sourcePath = resolveTripStoragePath("europa-2026", candidate.originalRelativePath);
    const documentsDirectory = getTripDocumentsDirectory("europa-2026");
    const destinationPath = resolveTripStoragePath("europa-2026", storageRelativePath);

    await mkdir(documentsDirectory, { recursive: true });
    await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      return Response.json({ ok: false, error: error.message }, { status: error.status });
    }

    return Response.json({ ok: false, error: "No se pudo guardar el documento aprobado." }, { status: 500 });
  }

  const approvedDocument: IndexedDocument = {
    ...candidate,
    id: approvedId,
    storageRelativePath,
    reviewStatus: "approved"
  };

  const documents = [
    ...index.documents.filter((document) => document.sha256 !== approvedDocument.sha256),
    approvedDocument
  ];

  const nextIndex: DocumentIndex = {
    ...index,
    generatedAt: new Date().toISOString(),
    documents
  };

  const nextReview: DocumentReviewIndex = {
    ...review,
    documents: review.documents.map((document) =>
      document.id === documentId ? { ...document, reviewStatus: "approved" } : document
    )
  };

  await writePrivateIndex("europa-2026", nextIndex);
  await writePrivateReview("europa-2026", nextReview);

  return Response.json({ ok: true, document: approvedDocument });
}

function sanitizeFileName(value: string) {
  return path.basename(value).replace(/[^a-zA-Z0-9._-]+/g, "-");
}
