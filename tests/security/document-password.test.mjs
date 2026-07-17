import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const auth = await readFile(path.join(root, "apps", "web", "src", "lib", "server", "document-auth.ts"), "utf8");
const route = await readFile(path.join(root, "apps", "web", "src", "app", "api", "documents", "session", "route.ts"), "utf8");
const page = await readFile(path.join(root, "apps", "web", "src", "app", "(dashboard)", "trips", "[tripSlug]", "documentos", "acceso", "page.tsx"), "utf8");
const script = await readFile(path.join(root, "apps", "web", "scripts", "document-password.mjs"), "utf8");

assert.match(auth, /bcrypt\.compare/);
assert.match(auth, /randomBytes\(32\)/);
assert.match(auth, /Max-Age=\$\{sessionMaxAge\}/);
assert.match(auth, /sessionMaxAge = 60 \* 60 \* 24 \* 30/);
assert.match(auth, /revokeDocumentSession/);
assert.match(route, /body\.password/);
assert.match(route, /recordFailedLogin/);
assert.doesNotMatch(page, /DOCUMENT_ACCESS_TOKEN|token/);
assert.match(script, /bcrypt\.hash\(password, 12\)/);
assert.match(script, /setRawMode/);
assert.match(script, /0o600/);

console.log("Document password authentication regression test passed.");
