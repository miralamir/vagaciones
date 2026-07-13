import path from "node:path";

export class DocumentStorageError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
    this.name = "DocumentStorageError";
  }
}

export function getDocumentStorageRoot() {
  const configured = process.env.DOCUMENT_STORAGE;

  if (!configured || configured.trim().length === 0) {
    throw new DocumentStorageError("DOCUMENT_STORAGE no esta configurada.", 503);
  }

  return path.resolve(configured);
}

export function assertSafeSegment(value: string, label: string) {
  if (!value || value.includes("..") || value.includes("/") || value.includes("\\") || path.isAbsolute(value)) {
    throw new DocumentStorageError(`${label} invalido.`, 400);
  }

  return value;
}

export function resolveInsideDocumentStorage(...segments: string[]) {
  const root = getDocumentStorageRoot();
  const resolved = path.resolve(root, ...segments);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new DocumentStorageError("Ruta fuera de DOCUMENT_STORAGE.", 400);
  }

  return resolved;
}

export function resolveTripStoragePath(tripSlug: string, relativePath: string) {
  assertSafeSegment(tripSlug, "trip");

  if (!relativePath || relativePath.includes("..") || path.isAbsolute(relativePath)) {
    throw new DocumentStorageError("Ruta de documento invalida.", 400);
  }

  return resolveInsideDocumentStorage(tripSlug, ...relativePath.split(/[\\/]+/));
}

export function getTripIncomingDirectory(tripSlug: string) {
  assertSafeSegment(tripSlug, "trip");
  return resolveInsideDocumentStorage(tripSlug, "incoming");
}

export function getTripDocumentsDirectory(tripSlug: string) {
  assertSafeSegment(tripSlug, "trip");
  return resolveInsideDocumentStorage(tripSlug, "documents");
}
