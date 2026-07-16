export const MAX_DOCUMENT_UPLOAD_BYTES: number;
export function extensionForUpload(name: string): string;
export function validateUpload(input: { name: string; mimeType: string; bytes: Buffer }):
  | { ok: true; extension: "pdf" | "png" | "jpg" | "jpeg" | "webp"; mimeType: string; sha256: string }
  | { ok: false; status: number; error: string };
export function safeStoredUploadName(sha256: string, extension: "pdf" | "png" | "jpg" | "jpeg" | "webp"): string;
