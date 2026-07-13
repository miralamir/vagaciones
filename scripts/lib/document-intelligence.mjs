import { PDFParse } from "pdf-parse";
import itinerary from "../../data/trips/europa-2026/itinerary.json" with { type: "json" };
import reservations from "../../data/trips/europa-2026/reservations.json" with { type: "json" };

// The parser is experimental. It derives its matching index from the curated data
// rather than defining an independent itinerary source of truth.
const parserFlights = Object.values(
  reservations
    .filter((reservation) => reservation.type === "flight")
    .reduce((groups, reservation) => {
      const codes = [reservation.locator, ...(reservation.additionalLocators ?? [])].filter(Boolean);
      const key = `${reservation.provider ?? ""}:${codes[0] ?? reservation.id}`;
      const group = groups[key] ?? { id: key, provider: reservation.provider ?? "", matchCodes: codes, segments: [] };
      group.segments.push({
        flightNumber: reservation.flightNumber ?? null,
        origin: reservation.origin ?? "",
        originCity: reservation.originCity ?? reservation.origin ?? "",
        destination: reservation.destination ?? "",
        destinationCity: reservation.destinationCity ?? reservation.destination ?? "",
        departureDate: dateOnly(reservation.departure ?? reservation.startDate),
        arrivalDate: dateOnly(reservation.arrival),
        associatedDays: reservation.associatedDays ?? []
      });
      groups[key] = group;
      return groups;
    }, {})
);

const parserReservations = reservations.map((reservation) => ({
  id: reservation.id,
  provider: reservation.provider,
  matchCodes: [reservation.locator, ...(reservation.additionalLocators ?? [])].filter(Boolean),
  terms: [reservation.provider, reservation.title, reservation.city].filter(Boolean).map((term) => term.toLowerCase()),
  kind: reservation.type === "hotel" ? "stay" : reservation.type === "entry" ? "event" : reservation.type,
  city: reservation.city ?? null,
  checkIn: reservation.checkIn,
  checkOut: reservation.checkOut,
  eventDate: reservation.eventDate,
  eventTime: reservation.eventTime,
  departureDate: dateOnly(reservation.departure),
  returnDate: dateOnly(reservation.arrival),
  transferDate: reservation.startDate,
  associatedDays: reservation.associatedDays ?? []
}));

const CITY_ALIASES = [
  ["Sao Paulo", ["sao paulo", "são paulo", "gru", "cgh"]],
  ["Madrid", ["madrid", "mad"]],
  ["Buenos Aires", ["buenos aires", "eze", "aep"]],
  ["Iguazu", ["iguazu", "iguazú", "igu", "foz do iguacu", "foz do iguaçu"]],
  ["Salvador", ["salvador", "ssa"]],
  ["Civitavecchia", ["civitavecchia"]],
  ["Venecia", ["venezia", "venice", "venecia"]],
  ["Paris", ["paris", "parís"]],
  ["Zurich", ["zurich", "zürich"]],
  ["Barcelona", ["barcelona"]],
  ["Roma", ["roma", "rome", "colosseum", "coliseum"]],
  ["Basilea", ["basel", "basilea"]],
  ["St. Moritz", ["st. moritz", "st moritz"]],
  ["Tirano", ["tirano"]]
];

const PROVIDERS = [
  ["Air Europa", ["air europa", "ux58", "ux83"]],
  ["GOL", ["gol linhas", "gol", "g3 1123", "g3 1691", "g3 7644"]],
  ["Aerolíneas Argentinas", ["aerolíneas argentinas", "aerolineas argentinas", "aerolineas", "aerplioneas"]],
  ["Iberia", ["iberia"]],
  ["Booking.com", ["booking.com", "booking com"]],
  ["Riu Hotels & Resorts", ["riu plaza", "riu hotels", "wrc386hv", "wrc3hkdd"]],
  ["Maison Venezia | UNA Esperienze", ["maison venezia", "una esperienze", "47875sg007033"]],
  ["Hotel Terminus Lyon", ["terminus lyon", "sckutw"]],
  ["Mercure Zurich City", ["mercure zurich", "qglpczhl"]],
  ["Resa Campus del Mar", ["campus del mar", "72068496850144"]],
  ["MSC", ["msc", "divina", "67652452"]],
  ["TGV Lyria", ["tgv lyria", "qul5v7"]],
  ["Bernina Express", ["bernina express"]],
  ["Lindt Home of Chocolate", ["lindt home", "lindt"]],
  ["GetYourGuide", ["getyourguide"]],
  ["Colosseum", ["colosseum", "coliseo", "underground", "arena"]],
  ["Assist Card", ["assist card", "assistcard"]]
];

const CATEGORY_TERMS = [
  ["vuelos", ["flight", "vuelo", "boarding", "air europa", "iberia", "gol", "aerolíneas", "aerolineas"]],
  ["hoteles", ["hotel", "booking.com", "accommodation", "check-in", "check in", "riu", "maison venezia", "terminus lyon", "mercure"]],
  ["trenes", ["train", "tren", "tgv", "lyria", "bernina", "rail"]],
  ["crucero", ["cruise", "crucero", "msc", "divina", "cabin", "cabina"]],
  ["entradas", ["ticket", "entrada", "colosseum", "coliseo", "lindt", "getyourguide"]],
  ["seguro", ["insurance", "seguro", "assist card", "policy", "póliza", "poliza"]],
  ["traslados", ["transfer", "traslado", "shuttle", "pickup", "aeropuerto"]],
  ["identidad", ["passport", "pasaporte", "dni", "identity", "identidad"]]
];

export async function extractPdfText(buffer) {
  let parser;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = normalizeText(result.text);
    return { status: text.length >= 24 ? "extracted" : "requires_ocr", text, pageCount: result.total ?? 0 };
  } catch {
    return { status: "requires_ocr", text: "", pageCount: 0 };
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

export function detectDocument(text, fileName) {
  const source = normalizeText(`${fileName}\n${text}`);
  const lower = source.toLowerCase();
  const provider = detectProvider(lower);
  const category = detectCategory(lower, provider.value);
  const extractedDates = extractDates(source);
  const cities = CITY_ALIASES.filter(([, aliases]) => aliases.some((alias) => lower.includes(alias))).map(([city]) => city);
  const confirmationCode = firstMatch(source, [
    /(?:booking reference|reservation(?: number| code)?|confirmation(?: number| code)?|localizador|referencia)\s*[:#-]?\s*([A-Z0-9]{5,16})/i,
    /\b(?:WRC(?:386HV|3HKDD)|XLQGKJ|AIGHSA|GUFHND|YKPIQH|SCKUTW|QGLPCZHL|QUL5V7|GPCO4V6Z5LLAX4EV|67652452|72068496850144|47875SG007033|9NSADF)\b/i
  ]);
  const ticketNumber = firstMatch(source, [/(?:ticket(?: number| no\.?)?|billete)\s*[:#-]?\s*([0-9]{10,16})/i]);
  const flightNumbers = allMatches(source, /\b(?:UX|G3|AR|IB)\s?\d{2,4}\b/gi);
  const seats = allMatches(source, /(?:seat|asiento|seats)\s*[:#-]?\s*([0-9]{1,2}[A-Z](?:\s*[-,/]\s*[0-9]{1,2}[A-Z])*)/gi);
  const baggage = firstMatch(source, [/(?:baggage|equipaje)\s*[:#-]?\s*([^\n]{3,80})/i]);
  const amount = extractAmount(source);
  const passengers = extractPassengers(source, fileName);
  const checkIn = firstMatch(source, [/(?:check[- ]?in)\s*[:#-]?\s*([^\n]{3,80})/i]);
  const checkOut = firstMatch(source, [/(?:check[- ]?out)\s*[:#-]?\s*([^\n]{3,80})/i]);
  const address = firstMatch(source, [/(?:address|direcci[oó]n|indirizzo)\s*[:#-]?\s*([^\n]{8,120})/i]);
  const cancellationPolicy = firstMatch(source, [/(?:cancellation|cancelaci[oó]n)\s*[:#-]?\s*([^\n]{8,140})/i]);
  const itineraryFlight = matchItineraryFlight(provider.value, confirmationCode.value, flightNumbers);
  const itineraryReservation = matchItineraryReservation(provider.value, confirmationCode.value, lower);
  const segments = itineraryFlight ? buildSegments(itineraryFlight, extractedDates) : [];
  const contextualDates = classifyContextualDates(extractedDates, itineraryReservation, itineraryFlight);
  const dates = contextualDates.relevant;
  const association = itineraryReservation ? { label: itineraryReservation.id, reservationId: confirmationCode.value, associatedDays: itineraryReservation.associatedDays, confidence: "high" } : associateDocument({ lower, provider: provider.value, flightNumbers, cities, dates: dates.map((item) => item.value).filter(Boolean), confirmationCode: confirmationCode.value, itineraryFlight, segments });
  const reviewReason = getReviewReason(fileName, itineraryReservation, itineraryFlight, association);
  const containsQR = /\bqr\b|barcode|boarding pass|mobile ticket/i.test(source);
  const sensitivity = detectSensitivity(category, source, containsQR, passengers.length > 0);

  return {
    category: field(category, category === "otros" ? "low" : "high"),
    provider,
    confirmationCode,
    documentType: field(category === "vuelos" ? "flight" : category.slice(0, -1) || "other", "high", "extracted"),
    subtype: field(category === "vuelos" ? getFlightSubtype(source, containsQR) : null, category === "vuelos" ? "medium" : "low", "extracted"),
    ticketNumber,
    dates,
    ignoredDates: contextualDates.ignored,
    time: field(firstMatch(source, [/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/]).value, "medium"),
    origin: field(segments[0]?.originCity ?? cities[0] ?? null, segments.length ? "high" : cities.length >= 2 ? "medium" : "low", segments.length ? "inferred" : "extracted"),
    destination: field(segments[0]?.destinationCity ?? cities[1] ?? null, segments.length ? "high" : cities.length >= 2 ? "medium" : "low", segments.length ? "inferred" : "extracted"),
    cities,
    airportOrStation: allMatches(source, /\b(?:GRU|MAD|EZE|AEP|IGU|CGH|SSA|BASEL SBB|GARE DE LYON)\b/gi),
    hotel: field(detectHotel(source, provider.value), provider.value && (provider.value.includes("Hotel") || provider.value.includes("Riu") || provider.value.includes("Maison")) ? "high" : "low"),
    address: field(address.value, address.confidence),
    passengers: passengers.map((value) => field(value, "medium")),
    flightNumbers: flightNumbers.map((value) => field(value, "high")),
    segments,
    seats: seats.map((value) => field(value, "high")),
    baggage: field(baggage.value, baggage.confidence),
    checkIn: field(checkIn.value, checkIn.confidence),
    checkOut: field(checkOut.value, checkOut.confidence),
    amount,
    cancellationPolicy: field(cancellationPolicy.value, cancellationPolicy.confidence),
    containsQR,
    sensitivity: field(sensitivity, sensitivity === "highly_sensitive" ? "high" : "medium"),
    association,
    reviewReason,
    boardingPassStatus: category === "vuelos" && !/boarding pass|tarjeta de embarque/i.test(source) ? "pending_until_checkin" : "available",
    qrStatus: category === "vuelos" && !containsQR ? "future_expected" : "available",
    checkinStatus: category === "vuelos" && !/boarding pass|tarjeta de embarque/i.test(source) ? "pending" : "completed"
  };
}

function associateDocument({ lower, provider, flightNumbers, cities, dates, confirmationCode, itineraryFlight, segments }) {
  if (itineraryFlight) {
    return {
      label: segments.map((segment) => `${segment.originCity} -> ${segment.destinationCity}`).join(" | "),
      reservationId: confirmationCode || null,
      associatedDays: [...new Set(segments.flatMap((segment) => segment.associatedDays))],
      confidence: confirmationCode ? "high" : "medium"
    };
  }
  const has = (...terms) => terms.some((term) => lower.includes(term));
  const flight = flightNumbers.join(" ").toUpperCase();
  const date = dates[0] ?? null;
  const matches = [
    [has("air europa", "9nsadf") && (flight.includes("UX58") || has("ux58")), "Vuelo Sao Paulo GRU -> Madrid MAD", [3, 4]],
    [has("air europa", "xlqgkj") && (flight.includes("UX83") || has("ux83")), "Vuelo Madrid -> Salvador", []],
    [has("aighsa", "aerolíneas argentinas", "aerolineas argentinas") && has("eze", "iguazu", "iguazú"), "Vuelo Buenos Aires EZE -> Iguazu", [1]],
    [has("gufhnd", "g3 1123") && has("igu", "cgh"), "Vuelo Iguazu -> Sao Paulo Congonhas", []],
    [has("g3 1691", "g3 7644") && has("ssa", "gru", "aep"), "Regreso Salvador -> Sao Paulo -> Buenos Aires", []],
    [has("riu plaza", "wrc386hv", "wrc3hkdd"), "Hotel Riu Plaza Espana, Madrid", []],
    [has("la casetta colorata", "civitavecchia"), "Alojamiento en Civitavecchia", []],
    [has("maison venezia", "47875sg007033"), "Maison Venezia | UNA Esperienze", []],
    [has("terminus lyon", "sckutw"), "Hotel Terminus Lyon, Paris", []],
    [has("mercure zurich", "qglpczhl"), "Mercure Zurich City", []],
    [has("campus del mar", "72068496850144"), "Resa Campus del Mar, Barcelona", []],
    [has("msc", "divina", "67652452") && has("13105", "cabin", "cabina"), "Crucero MSC Divina", []],
    [has("colosseum", "coliseo", "gpco4v6z5llax4ev") && has("underground", "arena", "08/08/2026"), "Entrada Coliseo, Roma", []],
    [has("tgv lyria", "qul5v7") && has("gare de lyon", "basel sbb"), "Tren Paris Gare de Lyon -> Basel SBB", []],
    [has("bernina express") && has("st. moritz", "tirano"), "Bernina Express St. Moritz -> Tirano", []],
    [has("lindt home", "lindt") && has("26 jul 2026", "26/07/2026", "17:00"), "Lindt Home of Chocolate, Zurich", []]
  ];
  const match = matches.find(([matched]) => matched);
  if (!match) return { label: null, reservationId: confirmationCode || null, associatedDays: [], confidence: "low" };
  const [, label, associatedDays] = match;
  const calculatedDays = associatedDays.length > 0 ? associatedDays : date ? dayFromKnownJourney(date) : [];
  return { label, reservationId: confirmationCode || null, associatedDays: calculatedDays, confidence: "high" };
}

function matchItineraryFlight(provider, confirmationCode, flightNumbers) {
  const normalizedProvider = provider?.toLowerCase();
  const normalizedCode = confirmationCode?.toUpperCase();
  return parserFlights.find((flight) => {
    if (normalizedCode && flight.matchCodes.includes(normalizedCode)) return true;
    return flight.provider.toLowerCase() === normalizedProvider && flight.segments.some((segment) => segment.flightNumber && flightNumbers.includes(segment.flightNumber));
  }) ?? null;
}

function matchItineraryReservation(provider, confirmationCode, lower) {
  const normalizedCode = confirmationCode?.toUpperCase();
  const normalizedProvider = provider?.toLowerCase();
  return parserReservations.find((reservation) =>
    (normalizedCode && reservation.matchCodes.includes(normalizedCode)) ||
    (reservation.provider?.toLowerCase() === normalizedProvider && reservation.terms.some((term) => lower.includes(term))) ||
    (!reservation.provider && reservation.terms.some((term) => lower.includes(term)))
  ) ?? null;
}

function classifyContextualDates(extractedDates, reservation, flight) {
  const relevant = [];
  const ignored = [];
  const expected = [];
  if (reservation?.kind === "stay") {
    expected.push([reservation.checkIn, "stay_date", "check-in inferido desde itinerario"], [reservation.checkOut, "stay_date", "check-out inferido desde itinerario"]);
  }
  if (reservation?.kind === "event") expected.push([reservation.eventDate, "event_date", "fecha de actividad inferida desde itinerario"]);
  if (reservation?.kind === "cruise") expected.push([reservation.departureDate, "travel_date", "salida de crucero inferida desde itinerario"], [reservation.returnDate, "travel_date", "regreso de crucero inferido desde itinerario"]);
  if (reservation?.kind === "transfer") expected.push([reservation.transferDate, "travel_date", "traslado inferido desde itinerario"]);
  if (flight) for (const segment of flight.segments) expected.push([segment.departureDate, "travel_date", "fecha de vuelo inferida desde itinerario"]);
  for (const [value, classification, reason] of expected) if (value) relevant.push({ ...field(value, "medium", "inferred_from_itinerary"), classification, reason });
  for (const value of extractedDates) {
    const year = Number(value.slice(0, 4));
    const matchingExpected = expected.some(([expectedValue]) => expectedValue === value);
    if (matchingExpected) continue;
    const classification = year < 2026 ? "legal_date" : "unknown_date";
    const reason = year < 2026 ? "fecha anterior al viaje; probable texto legal o historico" : "fecha extraida sin relacion semantica con la reserva";
    ignored.push({ ...field(value, "low", "extracted"), classification, reason });
  }
  return { relevant, ignored };
}

function getReviewReason(fileName, reservation, flight, association) {
  if (reservation) return null;
  if (flight) return null;
  const lower = fileName.toLowerCase();
  if (lower.includes("iberia")) return "El localizador fue detectado, pero no coincide con ningun vuelo de Europa 2026 en itinerary.json.";
  if (lower.includes("dgrc")) return "Documento legal o civil no asociado: no hay evidencia suficiente para vincularlo a un dia del viaje.";
  if (lower.includes("transfer")) return "Traslado sin origen, destino o fecha verificable en el PDF; requiere revision manual.";
  if (lower.includes("booking.com")) return "Reserva Booking sin hotel, codigo o fechas verificables para asociarla con Roma o Civitavecchia.";
  if (!association.associatedDays.length) return "No hay coincidencia verificable con itinerary.json.";
  return null;
}

function buildSegments(flight, extractedDates) {
  return flight.segments.map((segment) => {
    const departureDate = extractedDates.includes(segment.departureDate) ? segment.departureDate : segment.departureDate;
    return {
      ...segment,
      confidence: extractedDates.includes(segment.departureDate) ? "high" : "medium",
      dateSource: extractedDates.includes(segment.departureDate) ? "extracted" : "inferred"
    };
  });
}

function getFlightSubtype(source, containsQR) {
  if (/boarding pass|tarjeta de embarque/i.test(source)) return "boarding_pass";
  if (/e[- ]?ticket|electronic ticket/i.test(source)) return "reservation/e-ticket";
  if (containsQR) return "boarding_pass";
  return "reservation/e-ticket";
}

function dayFromKnownJourney(value) {
  const parsed = new Date(`${value}T12:00:00Z`);
  const start = new Date(`${itinerary.trip.startDate}T12:00:00Z`);
  const difference = Math.round((parsed.getTime() - start.getTime()) / 86400000) + 1;
  return difference >= 1 && difference <= 40 ? [difference] : [];
}

function dateOnly(value) {
  return value ? value.slice(0, 10) : null;
}

function detectProvider(lower) { const entry = PROVIDERS.find(([, terms]) => terms.some((term) => term === "gol" ? /\bgol\b/i.test(lower) : lower.includes(term))); return field(entry?.[0] ?? null, entry ? "high" : "low"); }
function detectCategory(lower, provider) { const entry = CATEGORY_TERMS.find(([, terms]) => terms.some((term) => lower.includes(term))); if (entry) return entry[0]; if (/Air Europa|GOL|Aerolíneas|Iberia/.test(provider)) return "vuelos"; return "otros"; }
function detectHotel(source, provider) { const match = source.match(/(?:hotel|accommodation|alojamiento)\s*[:#-]?\s*([^\n]{3,100})/i); return match?.[1]?.trim() ?? (provider && (provider.includes("Hotel") || provider.includes("Riu") || provider.includes("Maison")) ? provider : null); }
function detectSensitivity(category, source, containsQR, hasPassengers) { if (/passport|pasaporte|dni|identity|identidad/i.test(source)) return "highly_sensitive"; if (containsQR || hasPassengers || ["vuelos", "hoteles", "trenes", "crucero", "seguro", "traslados", "identidad"].includes(category)) return "private"; return "internal"; }
function extractDates(source) { const values = []; const seen = new Set(); for (const match of source.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b|\b(\d{1,2})\s+(?:de\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|ene(?:ro)?|feb(?:rero)?|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})\b/gi)) { let iso; if (match[1]) iso = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`; else { const month = monthNumber(match[5]); if (month) iso = `${match[6]}-${month}-${match[4].padStart(2, "0")}`; } if (iso && !seen.has(iso)) { seen.add(iso); values.push(iso); } } return values; }
function monthNumber(value = "") { const months = { jan: "01", ene: "01", feb: "02", mar: "03", apr: "04", abril: "04", may: "05", mayo: "05", jun: "06", junio: "06", jul: "07", julio: "07", aug: "08", ago: "08", agosto: "08", sep: "09", septiembre: "09", oct: "10", octubre: "10", nov: "11", noviembre: "11", dec: "12", dic: "12", diciembre: "12" }; return Object.entries(months).find(([key]) => value.toLowerCase().startsWith(key))?.[1]; }
function extractPassengers(source, fileName) {
  const candidates = [];
  const rejected = /baggage|equipaje|frequent|flyer|notice|legal|conditions|terms|tariff|ticket|boarding|flight|vuelo|important|information|privacy|warning/i;
  for (const match of source.matchAll(/(?:passenger|pasajero|traveller|viajero)\s*[:#-]?\s*([^\n]{3,80})/gi)) {
    const candidate = match[1].replace(/\s+/g, " ").trim();
    if (!rejected.test(candidate)) candidates.push(candidate);
  }
  const fileCandidate = fileName.replace(/\.pdf$/i, "").match(/(?:^|[-_ ]+)([A-Z][A-Z' -]{3,})$/)?.[1]?.trim();
  if (fileCandidate) {
    const normalizedFileCandidate = normalizePassengerName(fileCandidate);
    return normalizedFileCandidate ? [normalizedFileCandidate] : [];
  }
  return [...new Set(candidates.map(normalizePassengerName).filter(Boolean))].slice(0, 8);
}

function normalizePassengerName(value) {
  const cleaned = value.replace(/\b(PASSENGER|PASAJERO|TRAVELLER|VIAJERO|MR|MRS|MS|MISS|MSTR|DR|ADT|ADULT|ADULTS)\b\.?/gi, "").replace(/[^A-Za-zÀ-ÿ' -]/g, " ").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 4) return null;
  if (words.some((word) => /^(BAGGAGE|EQUIPAJE|FREQUENT|FLYER|NOTICE|LEGAL|TERMS|CONDITIONS|TICKET|BOARDING|FLIGHT|DE|UN|LA|EL|Y|QUE|PARA|ADULTOS|ADULTS|YEARS|CHILDREN)$/i.test(word))) return null;
  return words.map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`).join(" ");
}
function extractAmount(source) { const match = source.match(/(?:total|importe|amount|price)\s*[:#-]?\s*(?:([€$£]|ARS|USD|EUR|BRL|CHF)\s*)?([\d.,]+)/i); if (!match) return field(null, "low"); return { value: `${match[1] ?? ""}${match[2]}`, currency: match[1] ?? null, confidence: "medium" }; }
function firstMatch(source, patterns) { for (const pattern of patterns) { const match = source.match(pattern); if (match) return field((match[1] ?? match[0]).trim(), "high"); } return field(null, "low"); }
function allMatches(source, pattern) { return [...new Set([...source.matchAll(pattern)].map((match) => (match[1] ?? match[0]).replace(/\s+/g, " ").trim()))]; }
function field(value, confidence, source) { return { value: value || null, confidence, ...(source ? { source } : {}) }; }
function normalizeText(value) { return value.replace(/\u0000/g, " ").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(); }
