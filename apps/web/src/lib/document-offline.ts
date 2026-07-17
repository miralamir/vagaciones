import { getDocumentFileUrl } from "./documents";
import type { IndexedDocument } from "./document-types";

const CACHE_NAME = "vagaciones-documents-v1";
const STATE_KEY = "vagaciones-offline-documents";
const SYNC_KEY = "vagaciones-offline-last-sync";
const METADATA_KEY = "vagaciones-offline-document-metadata";

export function getSavedDocumentIds() {
  if (typeof window === "undefined") return [] as string[];
  try {
    return JSON.parse(window.localStorage.getItem(STATE_KEY) ?? "[]") as string[];
  } catch {
    return [] as string[];
  }
}

export function getOfflineLastSync() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SYNC_KEY);
}

export function getSavedOfflineDocuments(): IndexedDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(METADATA_KEY) ?? "[]");
    return Array.isArray(value) ? value as IndexedDocument[] : [];
  } catch {
    return [];
  }
}

export async function saveDocumentOffline(document: IndexedDocument) {
  const response = await fetch(getDocumentFileUrl(document), { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error("El archivo original no esta disponible.");

  const cache = await caches.open(CACHE_NAME);
  await cache.put(getDocumentFileUrl(document), response.clone());

  const savedIds = new Set(getSavedDocumentIds());
  savedIds.add(document.id);
  window.localStorage.setItem(STATE_KEY, JSON.stringify([...savedIds]));
  const metadata = getSavedOfflineDocuments().filter((item) => item.id !== document.id);
  metadata.push({ ...document, availableOffline: true });
  window.localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  window.localStorage.setItem(SYNC_KEY, new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date()));
}

export async function clearOfflineDocuments() {
  if (typeof window === "undefined") return;
  await caches.delete(CACHE_NAME);
  window.localStorage.removeItem(STATE_KEY);
  window.localStorage.removeItem(METADATA_KEY);
  window.localStorage.removeItem(SYNC_KEY);
}
