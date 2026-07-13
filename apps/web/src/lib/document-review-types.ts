import type { IndexedDocument } from "./document-types";

export type ReviewDocument = IndexedDocument & {
  reviewStatus: "pending" | "approved" | "ignored";
};

export type DocumentReviewIndex = {
  tripSlug: string;
  generatedAt: string;
  privateIncomingDirectory: string;
  documents: readonly ReviewDocument[];
  duplicates: readonly {
    sha256: string;
    original: string;
    duplicate: string;
  }[];
  warnings: readonly string[];
};
