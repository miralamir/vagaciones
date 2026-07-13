import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";

export const dynamic = "force-dynamic";

type DocumentLink = {
  id: string;
  fileName: string;
  title: string;
  type: string;
  reservationCode?: string;
  passenger?: string;
  associatedDays: number[];
  sensitivity: IndexedDocument["sensitivity"];
  requiresConfirmation: boolean;
  notes?: string;
};

export async function GET() {
  const linksPath = path.join(process.cwd(), "..", "..", "data", "trips", "europa-2026", "document-links.json");
  try {
    const links = JSON.parse(await readFile(linksPath, "utf8")) as DocumentLink[];
    const documents: IndexedDocument[] = links.map((link) => ({
      id: link.id,
      visibleName: link.title,
      category: link.type.includes("flight") ? "vuelos" : "otros",
      date: null,
      associatedDays: link.associatedDays,
      city: null,
      linkedReservation: link.reservationCode ?? null,
      passengers: link.passenger ? [link.passenger] : [],
      originalFileName: link.fileName,
      originalRelativePath: `incoming/${link.fileName}`,
      storageRelativePath: `incoming/${link.fileName}`,
      mimeType: "application/pdf",
      availableOffline: false,
      containsQR: false,
      sensitivity: link.sensitivity,
      requiresConfirmation: link.requiresConfirmation,
      offlinePolicy: link.sensitivity === "highly_sensitive" ? "userApproved" : "currentTrip",
      retentionPolicy: "keepUntilTripArchived",
      containsPersonalData: link.sensitivity !== "public",
      containsFinancialData: false,
      containsLocationData: true,
      observations: link.notes ?? "",
      sizeBytes: 0,
      sha256: "manual-link",
      reviewStatus: "approved",
      warnings: link.requiresConfirmation ? ["Requiere confirmacion antes de abrir o cachear."] : [],
      flightDocumentKind: link.type.includes("flight") ? "reservation" : undefined
    }));
    const index: DocumentIndex = { tripSlug: "europa-2026", generatedAt: new Date().toISOString(), sourceDirectories: ["DOCUMENT_STORAGE/europa-2026/incoming"], documents };
    return Response.json(index, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  } catch {
    return Response.json({ tripSlug: "europa-2026", generatedAt: new Date().toISOString(), sourceDirectories: [], documents: [] } satisfies DocumentIndex, { status: 500 });
  }
}
