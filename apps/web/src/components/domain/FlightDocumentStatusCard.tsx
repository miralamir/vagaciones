import type { FlightDocumentStatus } from "@/lib/flight-document-status";

export function FlightDocumentStatusCard({ status }: { status: FlightDocumentStatus }) {
  return <div className="grid gap-3 rounded-md bg-mist p-3">
    <div><p className="text-[10px] font-black uppercase tracking-wide text-sea">Estado documental del vuelo</p><p className="font-black text-ink">{status.flightLabel}</p></div>
    <p className="text-sm font-bold text-ink/75">{status.message}</p>
    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      <State label="Reserva" value={status.reservation} />
      <State label="E-ticket" value={status.eTicket} />
      <State label="Boarding pass" value={status.boardingPass} />
      <State label="QR" value={status.qr} />
      <State label="Check-in" value={status.checkIn} />
    </div>
    {status.reminder ? <p className="text-xs font-bold text-ink/60">{status.reminder}</p> : null}
  </div>;
}

function State({ label, value }: { label: string; value: FlightDocumentStatus["reservation"] }) {
  const copy = value === "loaded" ? "Cargado" : value === "completed" ? "Completado" : value === "not_open" ? "Futuro" : "Pendiente";
  const color = value === "loaded" || value === "completed" ? "text-emerald-700" : value === "pending" ? "text-amber-700" : "text-ink/60";
  return <div className="rounded-md bg-white px-2 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-sea">{label}</p><p className={`mt-1 font-black ${color}`}>{copy}</p></div>;
}
