export type TravelDocument = {
  id: string;
  title: string;
  kind: "PDF" | "QR" | "Imagen";
  day: number;
  href: string;
};

export type Reservation = {
  id: string;
  type: "vuelo" | "hotel" | "tren" | "crucero";
  title: string;
  date: string;
  detail: string;
  status: "confirmada" | "pendiente";
  documentId?: string;
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
  quickDocuments: {
    qr: string;
    reservation: string;
    passports: string;
  };
  transport: string[];
  hotel?: Hotel;
  activities: string[];
  checklist: string[];
  reminders: string[];
  conciergeTip: string;
  documents: TravelDocument[];
  flight?: {
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departure: string;
    arrival: string;
    reservations: string[];
    passengers: string[];
  };
};

const hotels: Hotel[] = [
  {
    id: "hotel-madrid",
    name: "Only YOU Boutique Hotel Madrid",
    city: "Madrid",
    address: "Calle del Barquillo 21, 28004 Madrid, Espana",
    phone: "+34 910 05 22 22",
    email: "reservas@onlyyouhotels.com",
    checkIn: "10 sep 2026, 15:00",
    checkOut: "14 sep 2026, 11:00",
    mapUrl: "https://maps.google.com/?q=Only+YOU+Boutique+Hotel+Madrid",
    reservationPdf: undefined
  },
  {
    id: "hotel-paris",
    name: "Hotel Le Six",
    city: "Paris",
    address: "14 Rue Stanislas, 75006 Paris, Francia",
    phone: "+33 1 42 22 00 75",
    email: "contact@hotel-le-six.com",
    checkIn: "18 sep 2026, 15:00",
    checkOut: "22 sep 2026, 11:00",
    mapUrl: "https://maps.google.com/?q=Hotel+Le+Six+Paris",
    reservationPdf: undefined
  },
  {
    id: "hotel-rome",
    name: "Argentina Residenza Style Hotel",
    city: "Roma",
    address: "Via di Torre Argentina 47, 00186 Roma, Italia",
    phone: "+39 06 6880 9533",
    email: "info@argentinaresidenzastylehotel.com",
    checkIn: "24 sep 2026, 14:00",
    checkOut: "29 sep 2026, 10:30",
    mapUrl: "https://maps.google.com/?q=Argentina+Residenza+Style+Hotel+Rome",
    reservationPdf: undefined
  }
];

const documents: TravelDocument[] = [
  { id: "doc-flight-mad", title: "Vuelo Buenos Aires - Madrid", kind: "PDF", day: 1, href: "/docs/sprint-1-placeholder.pdf" },
  { id: "doc-qr-mad", title: "QR Museo del Prado", kind: "QR", day: 2, href: "/docs/sprint-1-placeholder.pdf" },
  { id: "doc-hotel-mad", title: "Reserva hotel Madrid", kind: "PDF", day: 1, href: "/docs/sprint-1-placeholder.pdf" },
  { id: "doc-train-paris", title: "Tren Barcelona - Paris", kind: "PDF", day: 9, href: "/docs/sprint-1-placeholder.pdf" },
  { id: "doc-hotel-paris", title: "Reserva hotel Paris", kind: "PDF", day: 9, href: "/docs/sprint-1-placeholder.pdf" },
  { id: "doc-qr-louvre", title: "QR Louvre", kind: "QR", day: 10, href: "/docs/sprint-1-placeholder.pdf" },
  { id: "doc-flight-rome", title: "Vuelo Paris - Roma", kind: "PDF", day: 15, href: "/docs/sprint-1-placeholder.pdf" },
  { id: "doc-hotel-rome", title: "Reserva hotel Roma", kind: "PDF", day: 15, href: "/docs/sprint-1-placeholder.pdf" },
  { id: "doc-cruise", title: "Voucher crucero Mediterraneo", kind: "PDF", day: 21, href: "/docs/sprint-1-placeholder.pdf" }
];

export const reservations: Reservation[] = [
  {
    id: "res-flight-1",
    type: "vuelo",
    title: "Buenos Aires - Madrid",
    date: "10 sep 2026",
    detail: "Salida 12:15, llegada 05:40 del dia siguiente",
    status: "confirmada",
    documentId: "doc-flight-mad"
  },
  {
    id: "res-hotel-madrid",
    type: "hotel",
    title: "Only YOU Boutique Hotel Madrid",
    date: "10-14 sep 2026",
    detail: "4 noches, habitacion familiar",
    status: "confirmada",
    documentId: "doc-hotel-mad"
  },
  {
    id: "res-train-paris",
    type: "tren",
    title: "Barcelona - Paris",
    date: "18 sep 2026",
    detail: "Salida 09:28, llegada 16:12",
    status: "confirmada",
    documentId: "doc-train-paris"
  },
  {
    id: "res-hotel-paris",
    type: "hotel",
    title: "Hotel Le Six",
    date: "18-22 sep 2026",
    detail: "4 noches cerca de Montparnasse",
    status: "confirmada",
    documentId: "doc-hotel-paris"
  },
  {
    id: "res-flight-rome",
    type: "vuelo",
    title: "Paris - Roma",
    date: "24 sep 2026",
    detail: "Salida 11:20, llegada 13:25",
    status: "confirmada",
    documentId: "doc-flight-rome"
  },
  {
    id: "res-cruise",
    type: "crucero",
    title: "Crucero Mediterraneo",
    date: "30 sep 2026",
    detail: "Embarque 12:00, puerto de Civitavecchia",
    status: "pendiente",
    documentId: "doc-cruise"
  }
];

const cities = [
  "Madrid",
  "Madrid",
  "Madrid",
  "Barcelona",
  "Barcelona",
  "Barcelona",
  "Barcelona",
  "Barcelona",
  "Paris",
  "Paris",
  "Paris",
  "Paris",
  "Amsterdam",
  "Amsterdam",
  "Roma",
  "Roma",
  "Roma",
  "Florencia",
  "Florencia",
  "Venecia",
  "Crucero",
  "Crucero",
  "Crucero",
  "Lucerna",
  "Zurich",
  "Buenos Aires"
];

const events = [
  "Llegada a Madrid y check-in",
  "Museo del Prado",
  "Palacio Real y Gran Via",
  "Tren a Barcelona",
  "Sagrada Familia",
  "Parc Guell",
  "Barrio Gotico",
  "Dia libre en Barcelona",
  "Tren a Paris",
  "Museo del Louvre",
  "Torre Eiffel",
  "Montmartre",
  "Tren a Amsterdam",
  "Canales y Rijksmuseum",
  "Vuelo a Roma",
  "Coliseo",
  "Vaticano",
  "Tren a Florencia",
  "Uffizi y Duomo",
  "Tren a Venecia",
  "Embarque crucero",
  "Navegacion",
  "Desembarque",
  "Tren a Lucerna",
  "Zurich",
  "Regreso a casa"
];

const dates = Array.from({ length: 26 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 8, 10 + index));
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
});

const isoDates = Array.from({ length: 26 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 8, 10 + index));
  return date.toISOString().slice(0, 10);
});

export const trip = {
  id: "europa-2026",
  slug: "europa-2026",
  name: "Europa 2026",
  totalDays: 26,
  startDate: "10 septiembre 2026",
  endDate: "5 octubre 2026"
};

export const tripDays: TripDay[] = cities.map((city, index) => {
  const day = index + 1;
  const isAirEuropaFlight = day === 3;
  const hotel =
    day <= 4 ? hotels[0] :
    day >= 9 && day <= 12 ? hotels[1] :
    day >= 15 && day <= 17 ? hotels[2] :
    undefined;

  return {
    day,
    dateISO: isAirEuropaFlight ? "2026-07-20" : isoDates[index],
    date: isAirEuropaFlight ? "lunes, 20 de julio de 2026" : dates[index],
    city: isAirEuropaFlight ? "Sao Paulo" : city,
    nextDestination: isAirEuropaFlight ? "Madrid" : cities[index + 1] ?? "Casa",
    nextEvent: isAirEuropaFlight ? "Vuelo Air Europa UX58 a Madrid" : events[index],
    countdown: day === 1 ? "Faltan 60 dias para despegar" : `${Math.max(26 - day, 0)} dias para volver`,
    status: day === 1 ? "leave-now" : day === 3 || day === 4 || day === 9 || day === 15 ? "transfer" : "control",
    transfer: {
      title: isAirEuropaFlight ? "Air Europa UX58 - GRU a MAD" : day === 1 ? "Aeropuerto Ezeiza - Terminal internacional" : events[index],
      destination: isAirEuropaFlight ? "Aeropuerto de Guarulhos, Sao Paulo" : day === 1 ? "Aeropuerto Internacional Ezeiza" : events[index],
      idealLeaveTime: isAirEuropaFlight ? "10:20" : day === 1 ? "08:45" : "09:00",
      comfortableLeaveTime: isAirEuropaFlight ? "10:50" : day === 1 ? "09:15" : "09:30",
      limitLeaveTime: isAirEuropaFlight ? "11:20" : day === 1 ? "09:45" : "10:00",
      estimatedTravelTime: isAirEuropaFlight ? "45 min" : day === 1 ? "55 min" : "25 min",
      mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(day === 1 ? "Aeropuerto Internacional Ezeiza" : `${events[index]} ${city}`)}`,
      uberUrl: `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(day === 1 ? "Aeropuerto Internacional Ezeiza" : `${events[index]} ${city}`)}`
    },
    quickDocuments: {
      qr: "",
      reservation: "",
      passports: ""
    },
    transport: [
      day === 1 ? "Vuelo Buenos Aires - Madrid" : "",
      isAirEuropaFlight ? "Air Europa UX58 - GRU a MAD" : "",
      day === 4 ? "Tren Madrid - Barcelona" : "",
      day === 9 ? "Tren Barcelona - Paris" : "",
      day === 13 ? "Tren Paris - Amsterdam" : "",
      day === 15 ? "Vuelo Amsterdam - Roma" : "",
      day === 18 ? "Tren Roma - Florencia" : "",
      day === 20 ? "Tren Florencia - Venecia" : "",
      day === 24 ? "Tren Milan - Lucerna" : ""
    ].filter(Boolean),
    hotel,
    activities: [events[index], "Caminar la zona central", "Cena cerca del alojamiento"],
    checklist: ["Pasaportes", "Bateria externa", "Agua", "Documentos del dia"],
    reminders: [
      day === 1 ? "Llegar al aeropuerto con 3 horas de anticipacion" : "Revisar horarios antes de salir",
      hotel ? "Confirmar horario de check-in o check-out" : "Guardar tickets y comprobantes"
    ],
    conciergeTip: "Deja un margen de 30 minutos entre traslados y actividades importantes.",
    documents: documents.filter((document) => document.day === day),
    flight: isAirEuropaFlight ? {
      airline: "Air Europa",
      flightNumber: "UX58",
      origin: "GRU - Sao Paulo",
      destination: "MAD - Madrid",
      departure: "20/07/2026 13:50",
      arrival: "21/07/2026 05:00",
      reservations: ["9NSADF", "XLQGKJ"],
      passengers: ["Mariano", "Nadia", "Leon", "Bruno"]
    } : undefined
  };
});

export function getTripDay(day: number) {
  return tripDays[Math.min(Math.max(day, 1), trip.totalDays) - 1];
}

export function getTodayTripDay() {
  return getCurrentTripDay(new Date());
}

export function getActiveHotel() {
  return getTodayTripDay().hotel ?? hotels[0];
}

export function getAllDocuments() {
  return documents;
}

export function getStatusLabel(status: TripDay["status"]) {
  if (status === "leave-now") return "🔴 Debes salir ahora";
  if (status === "transfer") return "🟡 Proximo traslado";
  return "🟢 Todo bajo control";
}
export function getCurrentTripDay(now: Date) {
  const todayISO = now.toISOString().slice(0, 10);
  const exactDay = tripDays.find((day) => day.dateISO === todayISO);
  if (exactDay) return exactDay;
  if (todayISO < tripDays[0].dateISO) return tripDays[0];
  return tripDays[tripDays.length - 1];
}
