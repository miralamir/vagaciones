import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const failures = [];

await testNoPrivateDocumentsInPublic();
await testNoQrLogs();
await testRiskDialogExists();
await testHighlySensitiveNotAutoCached();
await testImporterSafety();
await testDocumentStorageSafety();
await testNoPrivateContentInGit();
await testReviewRouteExists();
await testServerAuthorization();
await testPrivateIndexesAndDryRun();

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Security tests passed.");

async function testNoPrivateDocumentsInPublic() {
  const publicRoot = path.join(root, "apps", "web", "public");
  const files = await listFiles(publicRoot);
  const risky = files.filter((file) => /\.(pdf|png|jpe?g|webp)$/i.test(file) && /pass|passport|dni|qr|boarding|reserva|seguro|hotel|vuelo|tren/i.test(file));
  assert(risky.length === 0, `Private-looking files found in public/: ${risky.join(", ")}`);
}

async function testNoQrLogs() {
  const files = await listFiles(path.join(root, "apps", "web", "src"));
  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert(!/console\.(log|info|debug)\([^)]*qr/i.test(content), `Possible QR logging in ${file}`);
  }
}

async function testRiskDialogExists() {
  const dialog = await readFile(path.join(root, "apps", "web", "src", "components", "domain", "RiskConfirmationDialog.tsx"), "utf8");
  assert(dialog.includes("Confirmacion requerida"), "RiskConfirmationDialog is missing explicit confirmation copy.");
}

async function testHighlySensitiveNotAutoCached() {
  const documents = await readFile(path.join(root, "apps", "web", "src", "lib", "documents.ts"), "utf8");
  assert(documents.includes('document.sensitivity === "highly_sensitive"'), "Highly sensitive documents are not excluded from automatic offline cache.");
  assert(documents.includes('document.offlinePolicy === "userApproved"'), "User-approved offline policy is not enforced.");
}

async function testImporterSafety() {
  const importer = await readFile(path.join(root, "scripts", "import-documents.mjs"), "utf8");
  assert(importer.includes("createHash"), "Importer does not calculate hashes.");
  assert(importer.includes("duplicates.push"), "Importer does not detect duplicates.");
  assert(!importer.includes("copyFile"), "Importer should not copy originals automatically.");
  assert(importer.includes("DOCUMENT_STORAGE"), "Importer does not require DOCUMENT_STORAGE.");
}

async function testDocumentStorageSafety() {
  const storage = await readFile(path.join(root, "apps", "web", "src", "lib", "server", "document-storage.ts"), "utf8");
  const documentRoute = await readFile(path.join(root, "apps", "web", "src", "app", "api", "documents", "[documentId]", "route.ts"), "utf8");
  const approveRoute = await readFile(path.join(root, "apps", "web", "src", "app", "api", "documents", "review", "approve", "route.ts"), "utf8");

  assert(storage.includes("DOCUMENT_STORAGE no esta configurada"), "Missing clear failure for absent DOCUMENT_STORAGE.");
  assert(storage.includes('relative.startsWith("..")'), "Storage resolver does not reject paths outside root.");
  assert(storage.includes('relativePath.includes("..")'), "Storage resolver does not reject path traversal.");
  assert(documentRoute.includes("resolveTripStoragePath"), "Document API does not use controlled storage resolver.");
  assert(approveRoute.includes("getTripDocumentsDirectory"), "Approval route does not store approved files in DOCUMENT_STORAGE documents directory.");
  assert(documentRoute.includes("Documento no encontrado"), "Document API does not return not found for unauthorized or missing documents.");

  const withoutEnv = spawnSync(process.execPath, ["scripts/import-documents.mjs", "--trip", "europa-2026"], {
    cwd: root,
    env: { ...process.env, DOCUMENT_STORAGE: "" },
    encoding: "utf8"
  });
  assert(withoutEnv.status !== 0, "Importer should fail when DOCUMENT_STORAGE is absent.");
  assert(withoutEnv.stderr.includes("DOCUMENT_STORAGE") || withoutEnv.stdout.includes("DOCUMENT_STORAGE"), "Importer missing clear DOCUMENT_STORAGE error.");
}

async function testNoPrivateContentInGit() {
  const source = await readFile(path.join(root, "scripts", "import-documents.mjs"), "utf8");
  const intelligence = await readFile(path.join(root, "scripts", "lib", "document-intelligence.mjs"), "utf8");
  const ignore = await readFile(path.join(root, ".gitignore"), "utf8");
  assert(!source.includes("console.log(extraction.text"), "Importer must not log extracted document text.");
  assert(!intelligence.includes("console.log(result.text"), "PDF intelligence must not log extracted document text.");
  assert(ignore.includes("document-review.json"), "Private review metadata must remain ignored by Git.");
  assert(ignore.includes("document-index.json"), "Private approved metadata must remain ignored by Git.");
}

async function testReviewRouteExists() {
  const page = path.join(root, "apps", "web", "src", "app", "(dashboard)", "trips", "[tripSlug]", "documentos", "revisar", "page.tsx");
  const route = path.join(root, "apps", "web", "src", "app", "api", "documents", "review", "route.ts");
  assert(await fileExists(page), "Document review page route is missing.");
  assert(await fileExists(route), "Document review API route is missing.");
}

async function testServerAuthorization() {
  const auth = await readFile(path.join(root, "apps", "web", "src", "lib", "server", "document-auth.ts"), "utf8");
  const routes = await Promise.all([
    "index/route.ts", "[documentId]/route.ts", "review/route.ts", "review/approve/route.ts", "review/correct/route.ts", "review/status/route.ts"
  ].map((file) => readFile(path.join(root, "apps", "web", "src", "app", "api", "documents", ...file.split("/")), "utf8")));
  assert(auth.includes("DOCUMENT_ACCESS_TOKEN"), "Document access token is not required server-side.");
  assert(auth.includes("HttpOnly") && auth.includes("SameSite=Strict"), "Document session cookie is not hardened.");
  assert(routes.every((route) => route.includes("requireDocumentAccess")), "A document API route lacks server authorization.");
}

async function testPrivateIndexesAndDryRun() {
  const importer = await readFile(path.join(root, "scripts", "import-documents.mjs"), "utf8");
  const fileRoute = await readFile(path.join(root, "apps", "web", "src", "app", "api", "documents", "[documentId]", "route.ts"), "utf8");
  assert(importer.includes("--dry-run") && importer.includes("Dry run"), "Importer dry-run is missing.");
  assert(importer.includes('resolveInsideDocumentStorage(tripSlug, "index.json")'), "Approved index is not private.");
  assert(!importer.includes("document-index.generated.ts"), "Importer still writes versioned TypeScript index.");
  assert(fileRoute.includes('reviewStatus === "approved"'), "Incoming documents can still be served.");
  assert(fileRoute.includes("X-Content-Type-Options"), "Document response lacks nosniff header.");
}

async function fileExists(filePath) {
  try { await readFile(filePath, "utf8"); return true; } catch { return false; }
}

async function listFiles(directory) {
  const results = [];
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
