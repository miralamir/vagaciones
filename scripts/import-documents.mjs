import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectDocument, extractPdfText } from "./lib/document-intelligence.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const tripSlug = readArg("--trip") ?? "europa-2026";
const dryRun = args.includes("--dry-run");
const storageRoot = getDocumentStorageRoot();
const tripStorageRoot = resolveInsideDocumentStorage(tripSlug);
const incomingRoot = resolveInsideDocumentStorage(tripSlug, "incoming");
const documentsRoot = resolveInsideDocumentStorage(tripSlug, "documents");
const reportsRoot = resolveInsideDocumentStorage(tripSlug, "reports");
const reviewJson = resolveInsideDocumentStorage(tripSlug, "review.json");
const reportJson = resolveInsideDocumentStorage(tripSlug, "reports", "latest.json");
const approvedIndexJson = resolveInsideDocumentStorage(tripSlug, "index.json");
const previousReview = await readJsonIfPresent(reviewJson);
const previousApprovedIndex = await readJsonIfPresent(approvedIndexJson);
const previousStatusByHash = new Map((previousReview?.documents ?? []).map((document) => [document.sha256, document.reviewStatus]));

const categories = [
  ["vuelos", ["flight", "vuelo", "boarding", "board", "avion", "airline", "iberia", "aerolineas", "aerolineas"]],
  ["hoteles", ["hotel", "reserva", "booking", "accommodation", "alojamiento", "maison", "riu"]],
  ["trenes", ["train", "tren", "rail", "eurostar", "renfe"]],
  ["crucero", ["cruise", "crucero", "ship"]],
  ["entradas", ["ticket", "entrada", "museum", "museo", "qr", "pass", "coliseo", "lindt"]],
  ["seguro", ["insurance", "seguro", "assist", "asistencia", "policy", "poliza"]],
  ["traslados", ["transfer", "traslado", "uber", "taxi", "shuttle", "aeropuerto", "aeopuert", "aerplioneas"]],
  ["otros", []]
];

const mimeByExtension = new Map([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"]
]);
const supportedExtensions = new Set(mimeByExtension.keys());

const foundFiles = [];
if (!dryRun) {
  await mkdir(incomingRoot, { recursive: true });
  await mkdir(documentsRoot, { recursive: true });
  await mkdir(reportsRoot, { recursive: true });
}
await walk(incomingRoot);

const seenHashes = new Map();
const pending = [];
const duplicates = [];
const warnings = [];

for (const file of foundFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
  if (!supportedExtensions.has(file.extension.toLowerCase())) {
    pending.push({ id: `review-${tripSlug}-unsupported-${createHash("sha256").update(file.relativePath).digest("hex").slice(0, 12)}`, visibleName: toVisibleName(file.name), category: "otros", date: null, associatedDays: [], city: null, linkedReservation: null, passengers: [], originalFileName: file.name, originalRelativePath: path.relative(tripStorageRoot, file.fullPath).replaceAll("\\", "/"), mimeType: "application/octet-stream", availableOffline: false, containsQR: false, sensitivity: "internal", requiresConfirmation: true, offlinePolicy: "never", retentionPolicy: "deleteAfterReview", containsPersonalData: false, containsFinancialData: false, containsLocationData: false, observations: "Formato no admitido.", sizeBytes: file.size, sha256: null, reviewStatus: "error", warnings: ["Formato no admitido. Solo PDF e imagenes permitidas."], extractionStatus: "requires_ocr", extractionPageCount: 0, detections: {}, overallConfidence: "low" });
    continue;
  }
  const buffer = await readFile(file.fullPath);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const extraction = file.extension.toLowerCase() === ".pdf"
    ? await extractPdfText(buffer)
    : { status: "requires_ocr", text: "", pageCount: 0 };
  const detections = detectDocument(extraction.text, file.name);
  const category = detections.category.value ?? classify(file.relativePath);
  const sensitivity = detections.sensitivity.value ?? classifySensitivity(file.relativePath, category);
  const containsQR = detections.containsQR || sensitivity === "highly_sensitive" || /qr|boarding|ticket|entrada|pass/i.test(file.name);
  const association = detections.association;
  const detectedDate = detections.dates[0]?.value ?? inferDate(file.relativePath);
  const associatedDays = association.associatedDays.length > 0 ? association.associatedDays : inferDays(file.relativePath);
  const city = detections.cities[0] ?? inferCity(file.relativePath);
  const passengers = detections.passengers.map((passenger) => passenger.value).filter(Boolean);

  if (seenHashes.has(sha256)) {
    duplicates.push({
      sha256,
      original: seenHashes.get(sha256),
      duplicate: file.relativePath
    });
    continue;
  }

  seenHashes.set(sha256, file.relativePath);

  pending.push({
    id: `review-${tripSlug}-${sha256.slice(0, 12)}`,
    visibleName: toVisibleName(file.name),
    category,
    date: detectedDate,
    associatedDays,
    city,
    linkedReservation: association.reservationId ?? detections.confirmationCode.value,
    passengers,
    originalFileName: file.name,
    originalRelativePath: path.relative(tripStorageRoot, file.fullPath).replaceAll("\\", "/"),
    mimeType: mimeByExtension.get(file.extension.toLowerCase()) ?? "application/octet-stream",
    availableOffline: false,
    containsQR,
    sensitivity,
    requiresConfirmation: sensitivity !== "public",
    offlinePolicy: getOfflinePolicy(sensitivity, category),
    retentionPolicy: getRetentionPolicy(sensitivity),
    containsPersonalData: sensitivity === "private" || sensitivity === "highly_sensitive",
    containsFinancialData: /card|tarjeta|payment|pago|invoice|factura/i.test(file.relativePath),
    containsLocationData: category === "hoteles" || category === "traslados" || category === "vuelos" || category === "trenes",
    observations: "",
    sizeBytes: file.size,
    sha256,
    reviewStatus: previousStatusByHash.get(sha256) ?? ((previousApprovedIndex?.documents ?? []).some((document) => document.sha256 === sha256) ? "duplicate" : "pending"),
    warnings: buildWarnings(file.relativePath, sensitivity, containsQR, extraction.status),
    extractionStatus: extraction.status,
    extractionPageCount: extraction.pageCount,
    detections,
    overallConfidence: getOverallConfidence(detections, extraction.status),
    flightDocumentKind: getFlightDocumentKind(category, extraction.text, containsQR)
  });
}

if (pending.some((document) => document.containsFinancialData && /card|tarjeta/i.test(document.originalFileName))) {
  warnings.push("Se detecto posible tarjeta. No debe almacenarse.");
}

const review = {
  tripSlug,
  generatedAt: new Date().toISOString(),
  privateIncomingDirectory: `${tripSlug}/incoming`,
  documents: pending,
  duplicates,
  warnings
};

const approvedIndex = {
  ...(previousApprovedIndex ?? {}),
  tripSlug,
  generatedAt: new Date().toISOString(),
  sourceDirectories: [`DOCUMENT_STORAGE/${tripSlug}/documents`],
  documents: previousApprovedIndex?.documents ?? []
};

const report = {
  tripSlug,
  generatedAt: review.generatedAt,
  scannedFiles: foundFiles.length,
  pendingReview: pending.length,
  duplicates: duplicates.length,
  warnings
};

if (!dryRun) {
  await writeFile(reviewJson, `${JSON.stringify(review, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await writeFile(reportJson, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await writeFile(path.join(reportsRoot, `import-${Date.now()}.json`), `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await writeFile(approvedIndexJson, `${JSON.stringify(approvedIndex, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

console.log(`Scanned ${foundFiles.length} file(s). Pending review: ${pending.length}. Duplicates: ${duplicates.length}.`);
console.log(`Private incoming folder: ${incomingRoot}`);
console.log(JSON.stringify(report, null, 2));
if (dryRun) console.log("Dry run: no se escribieron indices ni reportes.");

function readArg(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getDocumentStorageRoot() {
  const configured = process.env.DOCUMENT_STORAGE;

  if (!configured || configured.trim().length === 0) {
    console.error("DOCUMENT_STORAGE no esta configurada. Ejemplo Windows: C:\\\\VAGACIONES-DATA");
    process.exit(1);
  }

  return path.resolve(configured);
}

function resolveInsideDocumentStorage(...segments) {
  for (const segment of segments) {
    if (!segment || segment.includes("..") || path.isAbsolute(segment)) {
      console.error(`Segmento de ruta invalido: ${segment}`);
      process.exit(1);
    }
  }

  const resolved = path.resolve(storageRoot, ...segments);
  const relative = path.relative(storageRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    console.error("Ruta fuera de DOCUMENT_STORAGE.");
    process.exit(1);
  }

  return resolved;
}

async function walk(directory) {
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;
    const fileStat = await stat(fullPath);
    const extension = path.extname(entry.name);

    foundFiles.push({
      name: entry.name,
      extension,
      size: fileStat.size,
      fullPath,
      relativePath: path.relative(incomingRoot, fullPath)
    });
  }
}

function classify(value) {
  const normalized = value.toLowerCase();
  for (const [category, keywords] of categories) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return category;
  }
  return "otros";
}

function classifySensitivity(value, category) {
  const normalized = value.toLowerCase();
  if (/passport|pasaporte|dni|identity|identidad|qr|boarding/.test(normalized)) return "highly_sensitive";
  if (category === "hoteles" || category === "vuelos" || category === "trenes" || category === "crucero" || category === "seguro" || category === "traslados") return "private";
  if (category === "entradas") return "private";
  if (/brochure|folleto|mapa-publico/.test(normalized)) return "public";
  return "internal";
}

function getOfflinePolicy(sensitivity, category) {
  if (sensitivity === "highly_sensitive") return "userApproved";
  if (category === "seguro") return "emergencyOnly";
  if (sensitivity === "private") return "currentTrip";
  return "currentTrip";
}

function getRetentionPolicy(sensitivity) {
  if (sensitivity === "highly_sensitive") return "deleteAfterTripOrOnDemand";
  if (sensitivity === "private") return "keepUntilTripArchived";
  return "keepWithTrip";
}

function buildWarnings(value, sensitivity, containsQR, extractionStatus) {
  const result = [];
  if (sensitivity === "highly_sensitive") result.push("Requiere confirmacion antes de abrir o cachear.");
  if (containsQR) result.push("No registrar contenido del QR.");
  if (/card|tarjeta/i.test(value)) result.push("Posible tarjeta: no almacenar.");
  if (extractionStatus === "requires_ocr") result.push("Requiere OCR / texto no extraible.");
  return result;
}

function getOverallConfidence(detections, extractionStatus) {
  if (extractionStatus !== "extracted") return "low";
  if (detections.association.confidence === "high" && detections.provider.confidence === "high") return "high";
  if (detections.provider.value || detections.confirmationCode.value || detections.dates.length > 0) return "medium";
  return "low";
}

function getFlightDocumentKind(category, text, containsQR) {
  if (category !== "vuelos") return undefined;
  if (/boarding pass|tarjeta de embarque/i.test(text)) return "boarding_pass";
  if (/e[- ]?ticket|electronic ticket/i.test(text)) return "e_ticket";
  if (containsQR) return "qr";
  return "reservation";
}

function inferDate(value) {
  const match = value.match(/20\d{2}[-_ ]?\d{2}[-_ ]?\d{2}/);
  return match ? match[0].replaceAll("_", "-").replaceAll(" ", "-") : null;
}

function inferDays(value) {
  const match = value.match(/day[-_ ]?(\d{1,2})|dia[-_ ]?(\d{1,2})/i);
  const day = match ? Number(match[1] ?? match[2]) : 0;
  return day > 0 ? [day] : [];
}

function inferCity(value) {
  const lower = value.toLowerCase();
  for (const city of ["madrid", "barcelona", "paris", "amsterdam", "roma", "florencia", "venecia", "lucerna", "zurich"]) {
    if (lower.includes(city)) return city.charAt(0).toUpperCase() + city.slice(1);
  }
  return null;
}

function inferPassengers(value) {
  const match = value.match(/passenger[-_ ]([a-z]+)/i);
  return match ? [match[1]] : [];
}

function toVisibleName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
