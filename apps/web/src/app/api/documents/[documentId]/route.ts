import { readFile } from "node:fs/promises";
import path from "node:path";
import { DocumentStorageError, resolveTripStoragePath } from "@/lib/server/document-storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const indexPath = path.join(process.cwd(), "..", "..", "data", "trips", "europa-2026", "document-links.json");
  const links = JSON.parse(await readFile(indexPath, "utf8")) as Array<{ id: string; fileName: string; title: string; sensitivity: "public" | "internal" | "private" | "highly_sensitive"; requiresConfirmation: boolean }>;
  const documents = links.map((link) => ({ id: link.id, visibleName: link.title, originalFileName: link.fileName, storageRelativePath: `incoming/${link.fileName}`, mimeType: "application/pdf", availableOffline: false, requiresConfirmation: link.requiresConfirmation, sensitivity: link.sensitivity, offlinePolicy: link.sensitivity === "highly_sensitive" ? "userApproved" : "currentTrip" }));
  const document = documents.find((item) => item.id === documentId);

  if (!document) {
    return new Response("Documento no encontrado", { status: 404 });
  }

  try {
    if (!document.storageRelativePath) {
      return new Response("Documento aprobado sin ruta de almacenamiento.", { status: 404 });
    }

    const filePath = resolveTripStoragePath("europa-2026", document.storageRelativePath);
    const file = await readFile(filePath);
    const cacheable =
      document.availableOffline &&
      document.requiresConfirmation === false &&
      document.sensitivity !== "highly_sensitive" &&
      document.offlinePolicy !== "never" &&
      document.offlinePolicy !== "userApproved";

    return new Response(file, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.originalFileName)}"`,
        "Cache-Control": cacheable ? "public, max-age=31536000, immutable" : "no-store",
        "X-Vagaciones-Cacheable": cacheable ? "true" : "false",
        "X-Robots-Tag": "noindex, nofollow, noarchive"
      }
    });
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      return new Response(error.message, { status: error.status });
    }

    return new Response("Archivo original no disponible", { status: 404 });
  }
}
