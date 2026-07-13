import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import type { DocumentReviewIndex } from "@/lib/document-review-types";
import { DocumentStorageError, getTripDocumentsDirectory, resolveTripStoragePath } from "@/lib/server/document-storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { documentId } = await request.json() as { documentId?: string };

  if (!documentId) {
    return Response.json({ ok: false, error: "documentId requerido" }, { status: 400 });
  }

  const tripRoot = path.join(process.cwd(), "..", "..", "data", "trips", "europa-2026");
  const reviewPath = path.join(tripRoot, "document-review.json");
  const indexPath = path.join(tripRoot, "document-index.json");

  const review = JSON.parse(await readFile(reviewPath, "utf8")) as DocumentReviewIndex;
  const candidate = review.documents.find((document) => document.id === documentId);

  if (!candidate) {
    return Response.json({ ok: false, error: "Documento no encontrado" }, { status: 404 });
  }

  let index: DocumentIndex = {
    tripSlug: "europa-2026",
    generatedAt: new Date().toISOString(),
    sourceDirectories: ["DOCUMENT_STORAGE/europa-2026/documents"],
    documents: []
  };

  try {
    index = JSON.parse(await readFile(indexPath, "utf8")) as DocumentIndex;
  } catch {
    // Keep empty index.
  }

  const approvedId = candidate.id.replace(/^review-/, "doc-");
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

  await writeFile(indexPath, `${JSON.stringify(nextIndex, null, 2)}\n`, "utf8");
  await writeFile(reviewPath, `${JSON.stringify(nextReview, null, 2)}\n`, "utf8");

  return Response.json({ ok: true, document: approvedDocument });
}

function sanitizeFileName(value: string) {
  return path.basename(value).replace(/[^a-zA-Z0-9._-]+/g, "-");
}
