import itineraryData from "../../../../data/trips/europa-2026/itinerary.json";
import reservationsData from "../../../../data/trips/europa-2026/reservations.json";

type CuratedReservationType = "flight" | "hotel" | "train" | "cruise" | "entry" | "transfer" | "insurance";

type CuratedReservation = {
  id: string;
  type: CuratedReservationType;
  provider: string | null;
  title: string;
  locator?: string | null;
  additionalLocators?: string[];
  flightNumber?: string;
  departure?: string;
  arrival?: string;
  startDate?: string;
  checkIn?: string;
  checkOut?: string;
  eventDate?: string;
  eventTime?: string;
  origin?: string;
  originCity?: string;
  destination?: string;
  destinationCity?: string;
  city?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  cabin?: string;
  passengers: string[];
  seats?: string[];
  baggage?: string[];
  associatedDays: number[];
  documents: string[];
  pending: string[];
  transferMode?: "contracted_transfer" | "uber" | "taxi" | "train" | "walking" | "pending";
  meetingPoint?: string | null;
};

type CuratedDay = {
  day: number;
  date: string;
  city: string;
  route?: string;
  summary: string;
  transportReservationIds: string[];
  accommodationReservationId?: string;
  activityReservationIds?: string[];
  notes: string[];
  pending: string[];
};

export type TravelDocument = {
  id: string;
  title: string;
  kind: "PDF" | "QR" | "Imagen";
  day: number;
  href: string;
};

export type Reservation = {
  id: string;
  type: "vuelo" | "hotel" | "tren" | "crucero" | "entrada" | "traslado" | "seguro";
  title: string;
  provider: string | null;
  locator: string | null;
  date: string;
  detail: string;
  status: "confirmada" | "pendiente";
  associatedDays: number[];
  passengers: string[];
  seats: string[];
  baggage: string[];
  address: string | null;
  phone: string | null;
  email: string | null;
  pending: string[];
  documentIds: string[];
  transferMode?: CuratedReservation["transferMode"];
  meetingPoint?: string | null;
};

export type Hotel = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  mapUrl: string;
  reservationPdf?: string;
  confirmationNumber?: string;
  passengers?: string[];
  pendingAmount?: string;
  pending: string[];
};

export type TripDay = {
  day: number;
  dateISO: string;
  date: string;
  city: string;
  nextDestination: string;
  nextEvent: string;
  countdown: string;
  status: "control" | "transfer" | "leave-now";
  transfer: {
    title: string;
    destination: string;
    idealLeaveTime: string;
    comfortableLeaveTime: string;
    limitLeaveTime: string;
    estimatedTravelTime: string;
    mapsUrl: string;
    uberUrl: string;
  };
  quickDocuments: { qr: string; reservation: string; passports: string };
  transport: string[];
  hotel?: Hotel;
  activities: string[];
  checklist: string[];
  reminders: string[];
  conciergeTip: string;
  documents: TravelDocument[];
  pending: string[];
  reservationIds: string[];
  flight?: {
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departure: string;
    departureISO?: string;
    arrival: string;
    reservations: string[];
    passengers: string[];
  };
};

const curatedReservations = reservationsData as CuratedReservation[];
const curatedDays = itineraryData.days as CuratedDay[];
const reservationById = new Map(curatedReservations.map((reservation) => [reservation.id, reservation]));

export const trip = itineraryData.trip;

export const reservations: Reservation[] = curatedReservations.map((reservation) => ({
  id: reservation.id,
  type: toReservationType(reservation.type),
  title: reservation.title,
  provider: reservation.provider,
  locator: reservation.locator ?? null,
  date: reservationDateLabel(reservation),
  detail: reservationDetail(reservation),
  status: reservation.pending.length === 0 ? "confirmada" : "pendiente",
  associatedDays: reservation.associatedDays,
  passengers: reservation.passengers,
  seats: reservation.seats ?? [],
  baggage: reservation.baggage ?? [],
  address: reservation.address ?? null,
  phone: reservation.phone ?? null,
  email: reservation.email ?? null,
  pending: reservation.pending,
  documentIds: reservation.documents
  ,transferMode: reservation.transferMode
  ,meetingPoint: reservation.meetingPoint
}));

export const tripDays: TripDay[] = curatedDays.map((day, index) => {
  const transportReservations = day.transportReservationIds.map((id) => reservationById.get(id)).filter(isPresent);
  const accommodation = day.accommodationReservationId ? reservationById.get(day.accommodationReservationId) : undefined;
  const activities = (day.activityReservationIds ?? []).map((id) => reservationById.get(id)).filter(isPresent);
  const flight = transportReservations.find((reservation) => reservation.type === "flight");
  const destination = day.route ?? day.city;

  return {
    day: day.day,
    dateISO: day.date,
    date: formatDate(day.date),
    city: day.city,
    nextDestination: curatedDays[index + 1]?.city ?? "Fin del viaje",
    nextEvent: day.summary,
    countdown: "Segun itinerario curado",
    status: transportReservations.length > 0 ? "transfer" : "control",
    transfer: {
      title: transportReservations[0]?.title ?? day.summary,
      destination,
      idealLeaveTime: "Pendiente",
      comfortableLeaveTime: "Pendiente",
      limitLeaveTime: "Pendiente",
      estimatedTravelTime: "Pendiente",
      mapsUrl: mapsUrl(destination),
      uberUrl: `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(destination)}`
    },
    quickDocuments: { qr: "", reservation: "", passports: "" },
    transport: transportReservations.map((reservation) => reservation.title),
    hotel: accommodation?.type === "hotel" || accommodation?.type === "cruise" ? toHotel(accommodation) : undefined,
    activities: activities.length > 0 ? activities.map((reservation) => reservation.title) : [day.summary],
    checklist: ["Documentos asociados", "Bateria externa", "Agua"],
    reminders: [...day.notes, ...day.pending],
    conciergeTip: "Revisa los horarios y documentos cargados antes de salir.",
    documents: [],
    pending: day.pending,
    reservationIds: [...day.transportReservationIds, ...(day.accommodationReservationId ? [day.accommodationReservationId] : []), ...(day.activityReservationIds ?? [])],
    flight: flight ? toFlight(flight) : undefined
  };
});

export function getTripDay(day: number) {
  return tripDays[Math.min(Math.max(day, 1), trip.totalDays) - 1];
}

export function getTodayTripDay() {
  return getCurrentTripDay(new Date());
}

export function getActiveHotel() {
  const activeHotel = getTodayTripDay().hotel;
  return activeHotel ?? tripDays.find((day) => day.hotel)?.hotel ?? null;
}

export function getAllDocuments() {
  return [] as TravelDocument[];
}

export function getStatusLabel(status: TripDay["status"]) {
  if (status === "leave-now") return "Debes salir ahora";
  if (status === "transfer") return "Proximo traslado";
  return "Todo bajo control";
}

export function getCurrentTripDay(now: Date) {
  const todayISO = now.toISOString().slice(0, 10);
  const exactDay = tripDays.find((day) => day.dateISO === todayISO);
  if (exactDay) return exactDay;
  if (todayISO < tripDays[0].dateISO) return tripDays[0];
  return tripDays[tripDays.length - 1];
}

function toReservationType(type: CuratedReservationType): Reservation["type"] {
  const reservationTypes: Record<CuratedReservationType, Reservation["type"]> = {
    flight: "vuelo",
    hotel: "hotel",
    train: "tren",
    cruise: "crucero",
    entry: "entrada",
    transfer: "traslado",
    insurance: "seguro"
  };
  return reservationTypes[type];
}

function toHotel(reservation: CuratedReservation): Hotel {
  const location = reservation.address ?? `${reservation.title}, ${reservation.city ?? reservation.origin ?? ""}`;
  return {
    id: reservation.id,
    name: reservation.title,
    city: reservation.city ?? reservation.origin ?? "Pendiente",
    address: reservation.address ?? "Direccion pendiente de cargar.",
    phone: reservation.phone ?? "Telefono pendiente de cargar.",
    email: reservation.email ?? "Email pendiente de cargar.",
    checkIn: reservation.checkIn ?? reservation.departure ?? "Pendiente",
    checkOut: reservation.checkOut ?? reservation.arrival ?? "Pendiente",
    mapUrl: mapsUrl(location),
    confirmationNumber: reservation.locator ?? undefined,
    passengers: reservation.passengers,
    pendingAmount: reservation.pending.find((item) => /importe/i.test(item)),
    pending: reservation.pending
  };
}

function toFlight(reservation: CuratedReservation) {
  return {
    airline: reservation.provider ?? "Proveedor pendiente",
    flightNumber: reservation.flightNumber ?? "Numero pendiente",
    origin: [reservation.origin, reservation.originCity].filter(isPresent).join(" - ") || "Origen pendiente",
    destination: [reservation.destination, reservation.destinationCity].filter(isPresent).join(" - ") || "Destino pendiente",
    departure: formatDateTime(reservation.departure),
    departureISO: reservation.departure,
    arrival: formatDateTime(reservation.arrival),
    reservations: [reservation.locator, ...(reservation.additionalLocators ?? [])].filter(isPresent),
    passengers: reservation.passengers
  };
}

function reservationDateLabel(reservation: CuratedReservation) {
  const dates = [reservation.departure, reservation.startDate, reservation.checkIn, reservation.eventDate].filter(isPresent);
  const end = reservation.arrival ?? reservation.checkOut;
  return [dates[0] ? formatDateTime(dates[0]) : null, end ? formatDateTime(end) : null].filter(isPresent).join(" - ") || "Fecha pendiente";
}

function reservationDetail(reservation: CuratedReservation) {
  const route = [reservation.origin, reservation.destination].filter(isPresent).join(" -> ");
  const details = [reservation.provider, reservation.flightNumber, route, reservation.cabin ? `Cabina ${reservation.cabin}` : null].filter(isPresent);
  return details.join(" · ") || "Datos pendientes de cargar.";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatDateTime(value: string | undefined) {
  if (!value) return "Pendiente";
  if (!value.includes("T")) return formatDate(value);
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

function mapsUrl(destination: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(destination)}`;
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined && value !== "";
}
