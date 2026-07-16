import { createHash } from "node:crypto";

export const MAX_DOCUMENT_UPLOAD_BYTES = 20 * 1024 * 1024;

const formats = {
  pdf: { mime: "application/pdf", signature: (bytes) => bytes.subarray(0, 5).toString("ascii") === "%PDF-" },
  png: { mime: "image/png", signature: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  jpg: { mime: "image/jpeg", signature: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  jpeg: { mime: "image/jpeg", signature: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  webp: { mime: "image/webp", signature: (bytes) => bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP" }
};

export function extensionForUpload(name) {
  const match = String(name ?? "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function validateUpload({ name, mimeType, bytes }) {
  const extension = extensionForUpload(name);
  const format = formats[extension];
  if (!format) return { ok: false, status: 415, error: "Formato de archivo no permitido." };
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_DOCUMENT_UPLOAD_BYTES) return { ok: false, status: 413, error: "El archivo supera el limite de 20 MB." };
  if (mimeType && mimeType !== format.mime) return { ok: false, status: 415, error: "El tipo de archivo no coincide con su contenido." };
  if (!format.signature(bytes)) return { ok: false, status: 415, error: "El contenido del archivo no corresponde al formato permitido." };
  return { ok: true, extension, mimeType: format.mime, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export function safeStoredUploadName(sha256, extension) {
  if (!/^[a-f0-9]{64}$/.test(sha256) || !Object.hasOwn(formats, extension)) throw new Error("Nombre interno invalido.");
  return `mobile-${sha256.slice(0, 24)}.${extension}`;
}
