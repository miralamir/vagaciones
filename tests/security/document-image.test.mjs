import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const viewer = await readFile(path.join(root, "apps", "web", "src", "components", "domain", "DocumentViewerScreen.tsx"), "utf8");
const route = await readFile(path.join(root, "apps", "web", "src", "app", "api", "documents", "[documentId]", "route.ts"), "utf8");

assert.match(viewer, /credentials:\s*["']include["']/);
assert.match(viewer, /URL\.createObjectURL\(blob\)/);
assert.match(viewer, /URL\.revokeObjectURL\(objectUrl\)/);
assert.match(viewer, /response\.ok/);
assert.match(route, /"Content-Type": document\.mimeType/);
assert.match(route, /"Content-Disposition": `inline/);
assert.match(route, /"X-Content-Type-Options": "nosniff"/);

console.log("Document image rendering regression test passed.");
