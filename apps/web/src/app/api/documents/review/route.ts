import { requireDocumentAccess } from "@/lib/server/document-auth";
import { readPrivateReview } from "@/lib/server/document-index";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireDocumentAccess(request); if (denied) return denied;
  return Response.json(await readPrivateReview("europa-2026"), { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
}
