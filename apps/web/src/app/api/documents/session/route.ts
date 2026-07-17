import { allowLogin, clearDocumentSession, createDocumentSession, recordFailedLogin, revokeDocumentSession } from "@/lib/server/document-auth";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!allowLogin(request)) return Response.json({ error: "Demasiados intentos. Intenta nuevamente en un minuto." }, { status: 429 });
  const body = await request.json().catch(() => ({})) as { password?: string; token?: string };
  try {
    const session = await createDocumentSession(body.password ?? body.token ?? "");
    if (!session) { recordFailedLogin(request); return Response.json({ error: "Contraseña incorrecta." }, { status: 401 }); }
    return Response.json({ ok: true }, { headers: { "Set-Cookie": session, "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Acceso documental no configurado." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  revokeDocumentSession(request);
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearDocumentSession() } });
}
