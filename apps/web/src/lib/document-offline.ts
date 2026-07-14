import { getDocumentFileUrl } from "./documents";
import type { IndexedDocument } from "./document-types";

const CACHE_NAME = "vagaciones-documents-v1";
const STATE_KEY = "vagaciones-offline-documents";
const SYNC_KEY = "vagaciones-offline-last-sync";

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

export async function saveDocumentOffline(document: IndexedDocument) {
  const response = await fetch(getDocumentFileUrl(document), { cache: "no-store" });
  if (!response.ok) throw new Error("El archivo original no esta disponible.");

  const cache = await caches.open(CACHE_NAME);
  await cache.put(getDocumentFileUrl(document), response.clone());

  const savedIds = new Set(getSavedDocumentIds());
  savedIds.add(document.id);
  window.localStorage.setItem(STATE_KEY, JSON.stringify([...savedIds]));
  window.localStorage.setItem(SYNC_KEY, new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date()));
}
