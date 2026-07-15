import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../apps/web/src/components/domain/DocumentReviewScreen.tsx", import.meta.url), "utf8");

assert.match(source, /if \(!response\.ok\) \{/);
assert.match(source, /setLoadError\(response\.status === 401 \|\| response\.status === 403 \? "unauthorized" : "unavailable"\)/);
assert.match(source, /setReview\(normalizeReview\(data\)\)/);
assert.match(source, /documents: Array\.isArray\(review\.documents\) \? review\.documents : \[\]/);
assert.match(source, /warnings: Array\.isArray\(review\.warnings\) \? review\.warnings : \[\]/);

console.log("Document review rendering regression test passed.");
