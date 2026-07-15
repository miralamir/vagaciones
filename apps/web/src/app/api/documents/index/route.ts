import { requireDocumentAccess } from "@/lib/server/document-auth";
import { readPrivateIndex } from "@/lib/server/document-index";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireDocumentAccess(request);
  if (denied) return denied;
  const index = await readPrivateIndex("europa-2026");
  return Response.json(
    { ...index, documents: index.documents.filter((document) => document.reviewStatus === "approved") },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } }
  );
}
