import { documentIndex } from "./document-index.generated";
import type { DocumentCategory, IndexedDocument } from "./document-types";
import { getTripDay } from "./trip-data";

export function getDocumentIndex() {
  return documentIndex;
}

export function getIndexedDocuments(): IndexedDocument[] {
  return [...documentIndex.documents];
}

export function getDocumentById(id: string) {
  return getIndexedDocuments().find((document) => document.id === id);
}

export function getDocumentsForDay(day: number, source = getIndexedDocuments()) {
  const reservationIds = new Set(getTripDay(day).reservationIds);
  return source.filter((document) => document.associatedDays.includes(day) || (document.relatedReservationIds ?? []).some((id) => reservationIds.has(id)));
}

export function getQuickDocumentsForDay(day: number) {
  const docs = getDocumentsForDay(day);

  return {
    boarding: docs.find((document) => document.category === "vuelos" || document.category === "trenes"),
    hotel: docs.find((document) => document.category === "hoteles"),
    entry: docs.find((document) => document.category === "entradas"),
    insurance: getIndexedDocuments().find((document) => document.category === "seguro"),
    qr: docs.find((document) => document.containsQR)
  };
}

export function getDocumentsByCategory(category: DocumentCategory) {
  return getIndexedDocuments().filter((document) => document.category === category);
}

export function getDocumentFileUrl(document: IndexedDocument) {
  return `/api/documents/${document.id}`;
}

export function getViewerUrl(document: IndexedDocument) {
  return `/trips/europa-2026/documentos/${document.id}`;
}

export function getOfflineDocuments(today: number) {
  return getIndexedDocuments().filter((document) => {
    if (document.offlinePolicy === "never") return false;
    if (document.sensitivity === "highly_sensitive") return false;
    if (document.offlinePolicy === "userApproved") return false;
    if (document.category === "seguro") return true;
    if (document.category === "otros" && /emerg/i.test(document.visibleName)) return true;
    if (document.associatedDays.some((day) => day >= today && day <= today + 2)) return true;
    return document.availableOffline && document.requiresConfirmation === false;
  });
}
