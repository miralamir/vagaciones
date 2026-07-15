import { readFile } from "node:fs/promises";
import { requireDocumentAccess } from "@/lib/server/document-auth";
import { readPrivateIndex } from "@/lib/server/document-index";
import { DocumentStorageError, resolveTripStoragePath } from "@/lib/server/document-storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const denied = await requireDocumentAccess(request); if (denied) return denied;
  const { documentId } = await params;
  const index = await readPrivateIndex("europa-2026");
  const document = index.documents.find((item) => item.id === documentId && item.reviewStatus === "approved");

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
        "Cache-Control": cacheable ? "private, max-age=31536000, immutable" : "no-store",
        "X-Content-Type-Options": "nosniff",
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
