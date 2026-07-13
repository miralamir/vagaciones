import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const reviewPath = path.join(process.cwd(), "..", "..", "data", "trips", "europa-2026", "document-review.json");

  try {
    const content = await readFile(reviewPath, "utf8");
    return new Response(content, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive"
      }
    });
  } catch {
    return Response.json({
      tripSlug: "europa-2026",
      generatedAt: new Date(0).toISOString(),
      privateIncomingDirectory: "DOCUMENT_STORAGE/europa-2026/incoming",
      documents: [],
      duplicates: [],
      warnings: []
    });
  }
}
