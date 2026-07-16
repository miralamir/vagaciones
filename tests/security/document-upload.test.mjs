import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MAX_DOCUMENT_UPLOAD_BYTES, safeStoredUploadName, validateUpload } from "../../apps/web/src/lib/server/document-upload-core.mjs";

const pdf = Buffer.from("%PDF-1.7\narchivo de prueba");
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

assert.equal(validateUpload({ name: "prueba.pdf", mimeType: "application/pdf", bytes: pdf }).ok, true, "A valid PDF must be accepted.");
assert.equal(validateUpload({ name: "foto.jpg", mimeType: "image/jpeg", bytes: jpg }).ok, true, "A valid JPG must be accepted.");
assert.equal(validateUpload({ name: "falsa.pdf", mimeType: "application/pdf", bytes: jpg }).status, 415, "A false extension must be rejected.");
assert.equal(validateUpload({ name: "grande.pdf", mimeType: "application/pdf", bytes: Buffer.alloc(MAX_DOCUMENT_UPLOAD_BYTES + 1, 0x20) }).status, 413, "An oversized upload must be rejected.");
assert.equal(safeStoredUploadName("a".repeat(64), "pdf"), "mobile-aaaaaaaaaaaaaaaaaaaaaaaa.pdf", "Stored names must use an opaque hash.");
assert.throws(() => safeStoredUploadName("../bad", "pdf"), /invalido/, "Path traversal must never produce a storage name.");

const route = await readFile(new URL("../../apps/web/src/app/api/documents/upload/route.ts", import.meta.url), "utf8");
assert(route.includes("requireDocumentAccess"), "Upload must require server-side document access.");
assert(route.includes("allowDocumentUpload"), "Upload must have a rate limit.");
assert(route.includes("writePrivateReview"), "Upload must create a pending review candidate.");
assert(route.includes("reviewStatus: \"pending\""), "Upload candidates must stay pending.");
assert(route.includes("mode: 0o700") && route.includes("0o600"), "Upload storage must use private permissions.");
assert(route.includes("getTripIncomingDirectory"), "Upload must resolve only the private incoming directory.");
assert(!route.includes("public/"), "Upload route must not write to public/.");

console.log("Document upload security tests passed.");
