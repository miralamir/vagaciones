import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { DocumentIndex } from "@/lib/document-types";
import type { DocumentReviewIndex } from "@/lib/document-review-types";
import { resolveInsideDocumentStorage } from "./document-storage";

const emptyIndex = (tripSlug: string): DocumentIndex => ({ tripSlug, generatedAt: new Date(0).toISOString(), sourceDirectories: ["DOCUMENT_STORAGE"], documents: [] });
const emptyReview = (tripSlug: string): DocumentReviewIndex => ({ tripSlug, generatedAt: new Date(0).toISOString(), privateIncomingDirectory: `${tripSlug}/incoming`, documents: [], duplicates: [], warnings: [] });
const pathFor = (trip: string, name: string) => resolveInsideDocumentStorage(trip, name);

export async function readPrivateIndex(trip: string) { return readJson(pathFor(trip, "index.json"), emptyIndex(trip)); }
export async function readPrivateReview(trip: string) { return readJson(pathFor(trip, "review.json"), emptyReview(trip)); }
export async function writePrivateIndex(trip: string, value: DocumentIndex) { await writeJson(pathFor(trip, "index.json"), value); }
export async function writePrivateReview(trip: string, value: DocumentReviewIndex) { await writeJson(pathFor(trip, "review.json"), value); }
async function readJson<T>(file: string, fallback: T): Promise<T> { try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return fallback; } }
async function writeJson(file: string, value: unknown) { await mkdir(resolveInsideDocumentStorage(...file.split(/[/\\]+/).slice(-2, -1)), { recursive: true }).catch(() => undefined); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 }); }
