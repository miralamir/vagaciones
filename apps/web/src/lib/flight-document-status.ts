import type { IndexedDocument } from "./document-types";
import type { TripDay } from "./trip-data";

export type FlightDocumentState = "loaded" | "pending" | "not_open" | "completed";

export type FlightDocumentStatus = {
  flightLabel: string;
  day: number;
  reservation: FlightDocumentState;
  eTicket: FlightDocumentState;
  boardingPass: FlightDocumentState;
  qr: FlightDocumentState;
  checkIn: FlightDocumentState;
  checkInOpensAt: Date;
  message: string;
  reminder: string | null;
};

export function getFlightDocumentStatuses(day: TripDay, documents: readonly IndexedDocument[], now = new Date()): FlightDocumentStatus[] {
  const flightLabels = day.flight ? [`${day.flight.airline} ${day.flight.flightNumber}`] : day.transport.filter((transport) => /vuelo|flight/i.test(transport));
  return flightLabels
    .map((flightLabel) => getFlightDocumentStatus(day, flightLabel, documents, now));
}

export function getFlightDocumentStatus(day: TripDay, flightLabel: string, documents: readonly IndexedDocument[], now = new Date()): FlightDocumentStatus {
  const flightDocuments = documents.filter((document) => document.category === "vuelos" && document.associatedDays.includes(day.day));
  const reservation = flightDocuments.some((document) => document.flightDocumentKind === "reservation") ? "loaded" : "pending";
  const eTicket = flightDocuments.some((document) => document.flightDocumentKind === "e_ticket") ? "loaded" : "pending";
  const boardingLoaded = flightDocuments.some((document) => document.flightDocumentKind === "boarding_pass");
  const qrLoaded = flightDocuments.some((document) => document.flightDocumentKind === "qr" || (document.flightDocumentKind === "boarding_pass" && document.containsQR));
  const checkInOpensAt = getCheckInOpensAt(day);
  const checkInOpen = now >= checkInOpensAt;
  const boardingPass = boardingLoaded ? "loaded" : checkInOpen ? "pending" : "not_open";
  const qr = qrLoaded ? "loaded" : checkInOpen ? "pending" : "not_open";
  const checkIn = boardingLoaded || qrLoaded ? "completed" : checkInOpen ? "pending" : "not_open";

  return {
    flightLabel,
    day: day.day,
    reservation,
    eTicket,
    boardingPass,
    qr,
    checkIn,
    checkInOpensAt,
    message: reservation === "loaded" || eTicket === "loaded"
      ? `Reserva disponible, boarding pass pendiente hasta el check-in.`
      : checkInOpen
        ? "Check-in online pendiente. El boarding pass estara disponible al completarlo."
        : "Documento futuro esperado. El boarding pass y QR estaran disponibles despues del check-in online.",
    reminder: checkInOpen || boardingLoaded ? null : `Check-in disponible desde ${checkInOpensAt.toLocaleString("es-AR")}. Boarding pass y QR pendientes hasta check-in.`
  };
}

export function isFlightDocumentPending(status: FlightDocumentStatus) {
  return status.checkIn === "pending" || status.boardingPass === "pending" || status.qr === "pending";
}

function getCheckInOpensAt(day: TripDay) {
  const departure = new Date(day.flight?.departureISO ?? `${day.dateISO}T12:00:00`);
  const hours = /Aerolíneas Argentinas/i.test(day.flight?.airline ?? "") ? 24 : 48;
  return new Date(departure.getTime() - hours * 60 * 60 * 1000);
}
