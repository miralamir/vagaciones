import { extractPdfText, detectDocument } from "../../scripts/lib/document-intelligence.mjs";

const failures = [];

await testPdfWithExtractableText();
await testPdfWithoutExtractableText();
testLocatorDatePassengerAndProvider();
testItineraryAssociation();
testStructuredFlightSegmentsAndInference();
testSensitiveDocument();
testUnassociatedDocument();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Document intelligence tests passed.");

async function testPdfWithExtractableText() {
  const result = await extractPdfText(createPdf("Air Europa UX58 9NSADF"));
  assert(result.status === "extracted", "PDF with native text was not extracted.");
  assert(result.text.includes("Air Europa"), "Extracted PDF text is incomplete.");
}

async function testPdfWithoutExtractableText() {
  const result = await extractPdfText(Buffer.from("not a pdf"));
  assert(result.status === "requires_ocr", "Non-extractable PDF was not marked for OCR.");
}

function testLocatorDatePassengerAndProvider() {
  const detected = detectDocument("Air Europa flight UX58. Booking reference 9NSADF. Passenger: MARIANO FRANZE. 20/07/2026", "flight.pdf");
  assert(detected.provider.value === "Air Europa", "Provider was not detected.");
  assert(detected.confirmationCode.value === "9NSADF", "Booking locator was not detected.");
  assert(detected.dates[0]?.value === "2026-07-20", "Date was not detected.");
  assert(detected.passengers[0]?.value === "Mariano Franze", "Passenger was not detected.");
}

function testItineraryAssociation() {
  const detected = detectDocument("Air Europa UX58 9NSADF Sao Paulo GRU Madrid MAD 20/07/2026", "booking.pdf");
  assert(detected.association.reservationId === "9NSADF" && detected.segments?.[0]?.origin === "GRU" && detected.segments?.[0]?.destination === "MAD", "Flight was not associated with itinerary.");
  assert(detected.association.associatedDays.includes(3), "Associated day was not inferred.");
}

function testStructuredFlightSegmentsAndInference() {
  const detected = detectDocument("Air Europa UX58 UX83 UX2885. Booking reference 9NSADF. Passenger: baggage allowance and notices.", "9NSADF - MARIANO FRANZE.pdf");
  assert(detected.confirmationCode.value === "9NSADF", "Reservation code must remain separate from route.");
  assert(detected.passengers.length === 1 && detected.passengers[0]?.value === "Mariano Franze", "Passenger names contain non-passenger text.");
  assert(detected.segments?.length === 2, "Flight segments were not separated.");
  assert(detected.segments?.[0]?.flightNumber === "UX58" && detected.segments?.[0]?.origin === "GRU", "First itinerary segment is incorrect.");
  assert(detected.segments?.[1]?.flightNumber === "UX83" && detected.segments?.[1]?.destination === "SSA", "Second itinerary segment is incorrect.");
  assert(detected.dates[0]?.value === "2026-07-20" && detected.dates[0]?.source === "inferred_from_itinerary", "Missing flight date was not inferred from itinerary.");
  assert(detected.boardingPassStatus === "pending_until_checkin" && detected.qrStatus === "future_expected", "Future boarding pass state is incorrect.");
}

function testSensitiveDocument() {
  const detected = detectDocument("Passport identity document for passenger", "passport.pdf");
  assert(detected.sensitivity.value === "highly_sensitive", "Identity document sensitivity was not detected.");
}

function testUnassociatedDocument() {
  const detected = detectDocument("Neighborhood restaurant receipt", "receipt.pdf");
  assert(detected.association.label === null, "Unrelated document should remain unassociated.");
  assert(detected.association.confidence === "low", "Unrelated document confidence should be low.");
}

function createPdf(text) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${text.length + 34} >>\nstream\nBT /F1 12 Tf 20 200 Td (${text}) Tj ET\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function assert(condition, message) { if (!condition) failures.push(message); }
