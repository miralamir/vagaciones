import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const cookieName = "vagaciones_document_access";
const sessionMaxAge = 60 * 60 * 24 * 30;
const revokedSessions = new Map<string, number>();
const attempts = new Map<string, { count: number; resetAt: number }>();
const uploadAttempts = new Map<string, { count: number; resetAt: number }>();

function emergencyToken() {
  const value = process.env.DOCUMENT_ACCESS_TOKEN;
  if (!value || value.length < 24) return null;
  return value;
}

function credentialMatchesToken(value: string | null) {
  const expected = emergencyToken();
  if (!value || !expected) return false;
  const received = Buffer.from(value);
  const configured = Buffer.from(expected);
  return received.length === configured.length && timingSafeEqual(received, configured);
}

function cookieValue(request?: Request) {
  const raw = request
    ? request.headers.get("cookie")?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1] ?? null
    : null;
  if (!raw) return null;
  try { return decodeURIComponent(raw); } catch { return null; }
}

function authConfigurationAvailable() {
  return Boolean(process.env.DOCUMENT_ACCESS_PASSWORD_HASH || emergencyToken());
}

function sessionSigningKey() {
  return process.env.DOCUMENT_ACCESS_PASSWORD_HASH || emergencyToken();
}

function signature(payload: string) {
  const key = sessionSigningKey();
  return key ? createHmac("sha256", key).update(payload).digest("base64url") : null;
}

function validSession(value: string | null) {
  if (!value || !value.startsWith("v1.")) return false;
  const [, issuedAtRaw, nonce, receivedSignature] = value.split(".");
  const issuedAt = Number(issuedAtRaw);
  const expectedSignature = signature(`v1.${issuedAtRaw}.${nonce}`);
  if (!expectedSignature || !Number.isFinite(issuedAt) || !nonce || !receivedSignature) return false;
  if (issuedAt + sessionMaxAge * 1000 <= Date.now() || revokedSessions.has(value)) return false;
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function passwordMatches(value: string) {
  const hash = process.env.DOCUMENT_ACCESS_PASSWORD_HASH;
  if (!hash) return false;
  try { return await bcrypt.compare(value, hash); }
  catch { throw new Error("DOCUMENT_ACCESS_PASSWORD_HASH invalido."); }
}

async function credentialIsValid(value: string) {
  if (!authConfigurationAvailable()) throw new Error("No hay credencial documental configurada.");
  return (await passwordMatches(value)) || credentialMatchesToken(value);
}

export async function hasDocumentAccess(request?: Request) {
  const authorization = request?.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const cookie = cookieValue(request) ?? (await cookies()).get(cookieName)?.value ?? null;
  if (validSession(cookie)) return true;
  return credentialMatchesToken(bearer ?? cookie);
}

export async function requireDocumentAccess(request: Request) {
  try {
    if (await hasDocumentAccess(request)) return null;
    if (!authConfigurationAvailable()) return Response.json({ error: "Acceso documental no configurado." }, { status: 503 });
  } catch {
    return Response.json({ error: "Acceso documental no configurado." }, { status: 503 });
  }
  return Response.json({ error: "Acceso documental requerido." }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
}

function rateLimitKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export function allowLogin(request: Request) {
  const current = attempts.get(rateLimitKey(request));
  return !current || current.resetAt <= Date.now() || current.count < 8;
}

export function recordFailedLogin(request: Request) {
  const key = rateLimitKey(request);
  const now = Date.now();
  const current = attempts.get(key);
  attempts.set(key, { count: current && current.resetAt > now ? current.count + 1 : 1, resetAt: now + 60_000 });
}

export function allowDocumentUpload(request: Request) {
  const key = rateLimitKey(request);
  const now = Date.now();
  const current = uploadAttempts.get(key);
  if (current && current.resetAt > now && current.count >= 12) return false;
  uploadAttempts.set(key, { count: current && current.resetAt > now ? current.count + 1 : 1, resetAt: now + 60_000 });
  return true;
}

export async function createDocumentSession(value: string) {
  if (!(await credentialIsValid(value))) return null;
  const payload = `v1.${Date.now()}.${randomBytes(32).toString("base64url")}`;
  const signed = signature(payload);
  if (!signed) return null;
  const session = `${payload}.${signed}`;
  const secure = process.env.NODE_ENV === "production";
  return `${cookieName}=${encodeURIComponent(session)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionMaxAge}${secure ? "; Secure" : ""}`;
}

export function revokeDocumentSession(request: Request) {
  const value = cookieValue(request);
  if (value && validSession(value)) revokedSessions.set(value, Date.now() + sessionMaxAge * 1000);
}

export function clearDocumentSession() {
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export const documentSessionCookieName = cookieName;
export const documentSessionMaxAge = sessionMaxAge;
