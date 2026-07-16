import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "vagaciones_document_access";
const attempts = new Map<string, { count: number; resetAt: number }>();
const uploadAttempts = new Map<string, { count: number; resetAt: number }>();

function token() {
  const value = process.env.DOCUMENT_ACCESS_TOKEN;
  if (!value || value.length < 24) throw new Error("DOCUMENT_ACCESS_TOKEN no esta configurado o es demasiado corto.");
  return value;
}

function matches(value: string | null) {
  if (!value) return false;
  const expected = Buffer.from(token());
  const received = Buffer.from(value);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function hasDocumentAccess(request?: Request) {
  const authorization = request?.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const cookieValue = request ? request.headers.get("cookie")?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1] ?? null : (await cookies()).get(cookieName)?.value ?? null;
  return matches(bearer ?? cookieValue);
}

export async function requireDocumentAccess(request: Request) {
  try {
    if (await hasDocumentAccess(request)) return null;
  } catch {
    return Response.json({ error: "Acceso documental no configurado." }, { status: 503 });
  }
  return Response.json({ error: "Acceso documental requerido." }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
}

export function allowLogin(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= 8) return false;
  attempts.set(key, { count: current && current.resetAt > now ? current.count + 1 : 1, resetAt: now + 60_000 });
  return true;
}

export function allowDocumentUpload(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const current = uploadAttempts.get(key);
  if (current && current.resetAt > now && current.count >= 12) return false;
  uploadAttempts.set(key, { count: current && current.resetAt > now ? current.count + 1 : 1, resetAt: now + 60_000 });
  return true;
}

export function createDocumentSession(value: string) {
  if (!matches(value)) return null;
  const secure = process.env.NODE_ENV === "production";
  return `${cookieName}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure ? "; Secure" : ""}`;
}

export const documentSessionCookieName = cookieName;
