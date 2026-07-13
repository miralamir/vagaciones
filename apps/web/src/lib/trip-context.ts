import { getCurrentTripDay, type TripDay } from "./trip-data";
import { getDocumentsForDay, getQuickDocumentsForDay } from "./documents";
import { getFlightDocumentStatuses, isFlightDocumentPending } from "./flight-document-status";

export type GeoPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type TravelContext = {
  now: Date;
  locationPermission: "idle" | "granted" | "denied" | "unavailable";
  position?: GeoPosition;
  tripPhase: "before-trip" | "in-trip" | "after-trip";
  activeDay: TripDay;
  currentCity: string;
  inferredLocation: string;
  nextEvent: string;
  countdown: string;
  minutesUntilLimit: number | null;
  shouldLeave: boolean;
  mustLeaveNow: boolean;
  shouldCheckIn: boolean;
  pendingDocuments: string[];
  statusLabel: string;
};

const tripStartISO = "2026-09-10";
const tripEndISO = "2026-10-05";

export function buildTravelContext(
  now: Date,
  position?: GeoPosition,
  permission: TravelContext["locationPermission"] = "idle"
): TravelContext {
  const activeDay = getCurrentTripDay(now);
  const tripStart = new Date(`${tripStartISO}T00:00:00`);
  const tripEnd = new Date(`${tripEndISO}T23:59:59`);
  const tripPhase = now < tripStart ? "before-trip" : now > tripEnd ? "after-trip" : "in-trip";
  const minutesUntilLimit = getMinutesUntil(activeDay.dateISO, activeDay.transfer.limitLeaveTime, now);
  const shouldLeave = minutesUntilLimit !== null && minutesUntilLimit <= 30 && minutesUntilLimit > 0;
  const mustLeaveNow = minutesUntilLimit !== null && minutesUntilLimit <= 0 && tripPhase === "in-trip";
  const shouldCheckIn = Boolean(activeDay.hotel && activeDay.nextEvent.toLowerCase().includes("check-in"));
  const pendingDocuments = getPendingDocuments(activeDay, now);

  return {
    now,
    locationPermission: permission,
    position,
    tripPhase,
    activeDay,
    currentCity: activeDay.city,
    inferredLocation: position ? `${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}` : activeDay.city,
    nextEvent: activeDay.nextEvent,
    countdown: getCountdown(now, activeDay, tripPhase),
    minutesUntilLimit,
    shouldLeave,
    mustLeaveNow,
    shouldCheckIn,
    pendingDocuments,
    statusLabel: getContextStatusLabel(activeDay, shouldLeave, mustLeaveNow)
  };
}

function getMinutesUntil(dateISO: string, time: string, now: Date) {
  const target = new Date(`${dateISO}T${time}:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function getCountdown(now: Date, day: TripDay, phase: TravelContext["tripPhase"]) {
  if (phase === "before-trip") {
    const start = new Date(`${tripStartISO}T00:00:00`);
    const days = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 86400000));
    return `Faltan ${days} dias para salir`;
  }

  if (phase === "after-trip") return "Viaje finalizado";

  const minutes = getMinutesUntil(day.dateISO, day.transfer.limitLeaveTime, now);
  if (minutes === null) return day.countdown;
  if (minutes <= 0) return "Salir ahora";
  if (minutes < 60) return `${minutes} min para salir`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${rest} min para salir`;
}

function getContextStatusLabel(day: TripDay, shouldLeave: boolean, mustLeaveNow: boolean) {
  if (mustLeaveNow) return "\u{1F534} Debes salir ahora";
  if (shouldLeave) return "\u{1F7E1} Proximo traslado";
  if (day.status === "leave-now") return "\u{1F534} Debes salir ahora";
  if (day.status === "transfer") return "\u{1F7E1} Proximo traslado";
  return "\u{1F7E2} Todo bajo control";
}

function getPendingDocuments(day: TripDay, now: Date) {
  const quickDocs = getQuickDocumentsForDay(day.day);
  const dayDocs = getDocumentsForDay(day.day);
  const pending: string[] = [];
  const flights = getFlightDocumentStatuses(day, getDocumentsForDay(day.day), now);
  if (flights.some(isFlightDocumentPending)) pending.push("Check-in o boarding pass");
  if (!quickDocs.hotel && day.hotel) pending.push("Reserva hotel");
  if (dayDocs.length === 0) pending.push("Documentos del dia");
  return pending;
}
