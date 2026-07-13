export type DocumentCategory =
  | "vuelos"
  | "hoteles"
  | "trenes"
  | "crucero"
  | "entradas"
  | "seguro"
  | "traslados"
  | "identidad"
  | "otros";

export type DetectionConfidence = "high" | "medium" | "low";

export type DetectedValue = { value: string | null; confidence: DetectionConfidence; source?: "extracted" | "inferred" | "inferred_from_itinerary" };

export type FlightSegment = {
  flightNumber: string | null;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureDate: string | null;
  arrivalDate: string | null;
  associatedDays: readonly number[];
  confidence: DetectionConfidence;
  dateSource: "extracted" | "inferred";
};

export type DocumentDate = DetectedValue & {
  classification: "travel_date" | "stay_date" | "event_date" | "issue_date" | "payment_date" | "cancellation_deadline" | "legal_date" | "irrelevant_date" | "unknown_date";
  reason: string;
};

export type DocumentDetections = {
  category: DetectedValue;
  provider: DetectedValue;
  confirmationCode: DetectedValue;
  documentType?: DetectedValue;
  subtype?: DetectedValue;
  ticketNumber: DetectedValue;
  dates: readonly DetectedValue[];
  ignoredDates?: readonly DocumentDate[];
  time: DetectedValue;
  origin: DetectedValue;
  destination: DetectedValue;
  cities: readonly string[];
  airportOrStation: readonly string[];
  hotel: DetectedValue;
  address: DetectedValue;
  passengers: readonly DetectedValue[];
  flightNumbers: readonly DetectedValue[];
  segments?: readonly FlightSegment[];
  boardingPassStatus?: "available" | "pending_until_checkin";
  qrStatus?: "available" | "future_expected";
  checkinStatus?: "completed" | "pending";
  seats: readonly DetectedValue[];
  baggage: DetectedValue;
  checkIn: DetectedValue;
  checkOut: DetectedValue;
  amount: DetectedValue & { currency?: string | null };
  cancellationPolicy: DetectedValue;
  containsQR: boolean;
  sensitivity: DetectedValue;
  association: { label: string | null; reservationId: string | null; associatedDays: readonly number[]; confidence: DetectionConfidence };
  reviewReason?: string;
};

export type IndexedDocument = {
  id: string;
  visibleName: string;
  category: DocumentCategory;
  date: string | null;
  associatedDays: readonly number[];
  city: string | null;
  linkedReservation: string | null;
  relatedReservationIds?: readonly string[];
  passengers: readonly string[];
  originalFileName: string;
  originalRelativePath: string;
  storageRelativePath?: string;
  mimeType: string;
  availableOffline: boolean;
  containsQR: boolean;
  sensitivity: "public" | "internal" | "private" | "highly_sensitive";
  requiresConfirmation: boolean;
  offlinePolicy: "never" | "currentTrip" | "emergencyOnly" | "userApproved";
  retentionPolicy: string;
  containsPersonalData: boolean;
  containsFinancialData: boolean;
  containsLocationData: boolean;
  observations: string;
  sizeBytes: number;
  sha256: string;
  reviewStatus: "pending" | "approved" | "ignored";
  warnings: readonly string[];
  extractionStatus?: "extracted" | "requires_ocr";
  extractionPageCount?: number;
  detections?: DocumentDetections;
  overallConfidence?: DetectionConfidence;
  flightDocumentKind?: "reservation" | "e_ticket" | "boarding_pass" | "qr";
};

export type DocumentIndex = {
  tripSlug: string;
  generatedAt: string;
  sourceDirectories: readonly string[];
  documents: readonly IndexedDocument[];
};
