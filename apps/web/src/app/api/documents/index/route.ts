import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { resolveTripStoragePath } from "@/lib/server/document-storage";

export const dynamic = "force-dynamic";

type DocumentLink = {
  id: string;
  fileName: string;
  title: string;
  type: string;
  provider?: string;
  documentKind?: "reservation" | "e_ticket" | "boarding_pass" | "qr";
  reservationCode?: string;
  passenger?: string;
  relatedReservationIds?: string[];
  associatedDays: number[];
  mimeType?: string;
  containsQr?: boolean;
  availableOffline?: boolean;
  scope?: "day" | "trip_global";
  sensitivity: IndexedDocument["sensitivity"];
  requiresConfirmation: boolean;
  notes?: string;
};

export async function GET() {
  const linksPath = path.join(process.cwd(), "..", "..", "data", "trips", "europa-2026", "document-links.json");
  try {
    const links = JSON.parse(await readFile(linksPath, "utf8")) as DocumentLink[];
    const documents: IndexedDocument[] = await Promise.all(links.map(async (link) => ({
      id: link.id,
      visibleName: link.title,
      category: categoryFromLinkType(link.type),
      provider: link.provider ?? null,
      reservationCode: link.reservationCode ?? null,
      date: null,
      associatedDays: link.associatedDays,
      city: null,
      linkedReservation: link.reservationCode ?? null,
      relatedReservationIds: link.relatedReservationIds ?? [],
      passengers: link.passenger ? [link.passenger] : [],
      originalFileName: link.fileName,
      originalRelativePath: `incoming/${link.fileName}`,
      storageRelativePath: `incoming/${link.fileName}`,
      mimeType: link.mimeType ?? "application/pdf",
      availableOffline: link.availableOffline ?? false,
      storageAvailable: await isStoredDocumentAvailable(link.fileName),
      scope: link.scope ?? "day",
      containsQR: link.containsQr ?? false,
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
      flightDocumentKind: link.type.includes("flight") ? (link.documentKind ?? "reservation") : undefined
    })));
    const index: DocumentIndex = { tripSlug: "europa-2026", generatedAt: new Date().toISOString(), sourceDirectories: ["DOCUMENT_STORAGE/europa-2026/incoming"], documents };
    return Response.json(index, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  } catch {
    return Response.json({ tripSlug: "europa-2026", generatedAt: new Date().toISOString(), sourceDirectories: [], documents: [] } satisfies DocumentIndex, { status: 500 });
  }
}

async function isStoredDocumentAvailable(fileName: string) {
  try {
    await access(resolveTripStoragePath("europa-2026", `incoming/${fileName}`));
    return true;
  } catch {
    return false;
  }
}

function categoryFromLinkType(type: string): IndexedDocument["category"] {
  if (type.includes("flight")) return "vuelos";
  if (type.includes("hotel")) return "hoteles";
  if (type.includes("train")) return "trenes";
  if (type.includes("cruise")) return "crucero";
  if (type.includes("entry")) return "entradas";
  if (type.includes("transfer")) return "traslados";
  if (type.includes("insurance")) return "seguro";
  return "otros";
}
