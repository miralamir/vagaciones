import departurePlansData from "../../../../data/trips/europa-2026/departure-plans.json";
import { getTripDay, reservations, trip, type Reservation, type TripDay } from "./trip-data";

export type TripPhase = "before_trip" | "during_trip" | "after_trip";

export type DeparturePlan = {
  id: string;
  dayNumber: number;
  title: string;
  mode: "uber_or_private" | "hotel_shuttle" | "walking_or_taxi" | "uber_or_taxi";
  idealDepartureTime: string;
  comfortableDepartureTime: string;
  latestDepartureTime: string;
  transportDepartureTime?: string;
  recommendedArrival?: string;
  notes: string;
  relatedReservationIds: string[];
  riskLevel: "medium" | "high";
};

export type TripToday = {
  todayDate: string;
  activeDayNumber: number;
  activeDay: TripDay;
  tripPhase: TripPhase;
  daysUntilStart: number;
  daysUntilEnd: number;
  departurePlan?: DeparturePlan;
};

export type NextTransfer = {
  title: string;
  type: "vuelo" | "tren" | "traslado contratado" | "shuttle hotelero" | "caminata" | "pendiente";
  time: string;
  reservation: Reservation | undefined;
  status: "confirmado" | "pendiente" | "futuro esperado";
};

export type TimeRecommendation = {
  transportDepartureTime?: string;
  recommendedArrival?: string;
  idealDepartureTime?: string;
  comfortableDepartureTime?: string;
  latestDepartureTime?: string;
  note: string;
  pending: boolean;
};

export const departurePlans = departurePlansData as DeparturePlan[];

export function getTripToday(now = new Date(), manualDay?: number): TripToday {
  const todayDate = localDateISO(now);
  const start = dateOnly(trip.startDate);
  const end = dateOnly(trip.endDate);
  const today = dateOnly(todayDate);
  const validOverride = manualDay !== undefined && Number.isInteger(manualDay) && manualDay >= 0 && manualDay <= trip.totalDays;
  const tripPhase: TripPhase = validOverride ? "during_trip" : today < start ? "before_trip" : today > end ? "after_trip" : "during_trip";
  const activeDayNumber = validOverride ? manualDay : tripPhase === "before_trip" ? 1 : tripPhase === "after_trip" ? trip.totalDays : Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  const activeDay = getTripDay(activeDayNumber);

  return {
    todayDate,
    activeDayNumber,
    activeDay,
    tripPhase,
    daysUntilStart: Math.max(0, Math.ceil((start.getTime() - today.getTime()) / 86400000)),
    daysUntilEnd: Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000)),
    departurePlan: departurePlans.find((plan) => plan.dayNumber === activeDayNumber)
  };
}

export function getNextTransfer(day: TripDay, departurePlan?: DeparturePlan): NextTransfer {
  if (departurePlan) return {
    title: departurePlan.title,
    type: departurePlan.mode === "hotel_shuttle" ? "shuttle hotelero" : "pendiente",
    time: departurePlan.comfortableDepartureTime,
    reservation: reservations.find((reservation) => departurePlan.relatedReservationIds.includes(reservation.id)),
    status: "confirmado"
  };

  if (day.day === 11 || day.day === 12) return { title: "Venecia caminando", type: "caminata", time: "Pendiente", reservation: undefined, status: "confirmado" };
  const reservation = day.reservationIds.map((id) => reservations.find((item) => item.id === id)).find(Boolean);
  if (!reservation) return { title: day.nextEvent, type: "pendiente", time: "Pendiente", reservation: undefined, status: "pendiente" };
  const type = reservation.type === "vuelo" ? "vuelo" : reservation.type === "tren" ? "tren" : reservation.transferMode === "contracted_transfer" ? "traslado contratado" : "pendiente";
  return { title: reservation.title, type, time: reservation.date === "Fecha pendiente" ? "Pendiente" : reservation.date, reservation, status: reservation.status === "confirmada" ? "confirmado" : "pendiente" };
}

export function getTimeRecommendation(day: TripDay): TimeRecommendation | undefined {
  const departurePlan = departurePlans.find((plan) => plan.dayNumber === day.day);
  if (departurePlan) return {
    transportDepartureTime: departurePlan.transportDepartureTime,
    recommendedArrival: departurePlan.recommendedArrival,
    idealDepartureTime: departurePlan.idealDepartureTime,
    comfortableDepartureTime: departurePlan.comfortableDepartureTime,
    latestDepartureTime: departurePlan.latestDepartureTime,
    note: departurePlan.notes,
    pending: false
  };

  if (day.day === 11) return { note: "Frecciarossa 9731 confirmado. Horario pendiente: falta calcular salida recomendada.", pending: true };
  if (day.day === 13) return { note: "Frecciarossa 9425 confirmado. Horario pendiente: falta calcular salida recomendada.", pending: true };

  const reservation = day.reservationIds.map((id) => reservations.find((item) => item.id === id)).find((item) => item?.type === "tren");
  if (!reservation) return undefined;

  const transportDepartureTime = extractTime(reservation.departure);
  if (!transportDepartureTime) return { note: "Horario pendiente: falta calcular salida recomendada.", pending: true };

  return {
    transportDepartureTime,
    recommendedArrival: "Recomendado estar en estacion 45 minutos antes.",
    note: "Tren importante: llegar con margen.",
    pending: false
  };
}

function extractTime(value: string | undefined) {
  const match = value?.match(/T(\d{2}:\d{2})/);
  return match?.[1];
}

function localDateISO(now: Date) {
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}
