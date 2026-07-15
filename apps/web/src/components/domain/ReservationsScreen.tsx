import Link from "next/link";
import tripPending from "../../../../../data/trips/europa-2026/trip-pending.json";
import { getTripDay, reservations, type Reservation } from "@/lib/trip-data";
import { getTimeRecommendation } from "@/lib/trip-today";
import { railPlans, railPlanLabel } from "@/lib/rail-plans";
import { AccordionSection } from "./AccordionSection";
import { AppShell } from "./AppShell";

const groups: Array<{ types: Reservation["type"][]; title: string }> = [
  { types: ["vuelo", "tren", "traslado"], title: "Transportes" },
  { types: ["hotel"], title: "Alojamientos" },
  { types: ["entrada"], title: "Actividades y entradas" },
  { types: ["crucero"], title: "Crucero" },
  { types: ["seguro"], title: "Seguro" }
];

export function ReservationsScreen() {
  const confirmed = reservations.filter((reservation) => reservation.status === "confirmada");
  const documents = reservations.filter((reservation) => reservation.documentIds.length > 0);

  return <AppShell><section className="grid gap-3">
    <div className="rounded-lg bg-ink p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-white/60">Reservas y pendientes</p><h2 className="mt-1 text-2xl font-black">El viaje, claro y accionable</h2><p className="mt-2 text-sm font-semibold text-white/75">Datos curados del itinerario. Los documentos son respaldo rapido.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Summary label="Confirmadas" value={confirmed.length} /><Summary label="Criticas" value={tripPending.critical.length} /><Summary label="Importantes" value={tripPending.important.length} /><Summary label="Futuro esperado" value={tripPending.future.length} /></div></div>

    {groups.map((group) => {
      const items = reservations.filter((reservation) => group.types.includes(reservation.type));
      return items.length ? <AccordionSection badge={items.length} defaultOpen={group.title === "Transportes"} key={group.title} title={group.title}><div className="grid gap-3">{items.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)}</div></AccordionSection> : null;
    })}

    <AccordionSection badge={railPlans.length} title="Trayectos flexibles y Saver Day Pass"><div className="grid gap-3">{railPlans.map((plan) => <div className="rounded-md border border-black/10 p-3" key={plan.id}><p className="text-xs font-black uppercase tracking-wide text-sea">{railPlanLabel(plan.kind)}</p><p className="mt-1 font-black text-ink">{plan.title}</p><p className="mt-1 text-sm font-semibold text-ink/70">{plan.summary}</p>{plan.options?.map((option) => <div className={option.label === "No recomendado" ? "mt-2 rounded-md bg-red-50 p-2 text-red-800" : "mt-2 rounded-md bg-mist p-2 text-ink"} key={option.label}><p className="text-xs font-black uppercase">Horario {option.label}</p><p className="mt-1 text-sm font-semibold">{option.segments.join(" · ")}</p><p className="mt-1 text-sm font-bold">Margen: {option.margin}</p></div>)}</div>)}</div></AccordionSection>

    <AccordionSection badge={documents.length || undefined} title="Documentos asociados"><div className="grid gap-2">{documents.length ? documents.map((reservation) => <div className="rounded-md bg-mist px-3 py-3" key={reservation.id}><p className="font-black text-ink">{reservation.title}</p><p className="mt-1 text-sm font-semibold text-ink/65">{reservation.documentIds.length} documento(s) asociado(s)</p><Link className="mt-2 inline-block text-sm font-black text-sea" href="/trips/europa-2026/documentos">Ver documentos</Link></div>) : <Empty />}</div></AccordionSection>
    <PendingSection badge={tripPending.critical.length} defaultOpen items={tripPending.critical} title="Pendientes criticos" />
    <PendingSection badge={tripPending.important.length} defaultOpen items={tripPending.important} title="Pendientes importantes" />
    <PendingSection badge={tripPending.decision.length} items={tripPending.decision} title="Decisiones y compras" />
    <PendingSection badge={tripPending.future.length} items={tripPending.future} title="Futuros esperados" />
  </section></AppShell>;
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const recommendation = reservation.associatedDays.map((day) => getTimeRecommendation(getTripDay(day))).find(Boolean);
  const day = reservation.associatedDays[0];
  return <article className="rounded-md border border-black/10 p-3">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{reservation.title}</h3><p className="mt-1 text-sm font-semibold text-ink/65">Dia{reservation.associatedDays.length > 1 ? "s" : ""}: {reservation.associatedDays.join(", ")}</p></div><span className={reservation.status === "confirmada" ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-black uppercase text-emerald-700" : "rounded-full bg-amber-50 px-2 py-1 text-xs font-black uppercase text-amber-700"}>{reservation.status}</span></div>
    <p className="mt-3 text-sm font-semibold text-ink/75">{reservation.detail}</p>
    <p className="mt-1 text-sm font-semibold text-ink/65">{reservation.date}</p>
    {reservation.locator ? <p className="mt-2 text-sm font-bold text-ink">Localizador: {reservation.locator}{reservation.additionalLocators.length ? ` / ${reservation.additionalLocators.join(" / ")}` : ""}</p> : null}
    {reservation.seats.length ? <p className="mt-2 text-sm font-semibold text-ink/70">Asientos: {reservation.seats.join(" · ")}</p> : null}
    {reservation.baggage.length ? <p className="mt-1 text-sm font-semibold text-ink/70">Equipaje: {reservation.baggage.join(" · ")}</p> : null}
    {recommendation ? <div className="mt-3 rounded-md bg-mist p-3"><p className="text-xs font-black uppercase tracking-wide text-sea">Recomendacion de tiempo</p>{recommendation.transportDepartureTime ? <p className="mt-1 text-sm font-black text-ink">Salida: {recommendation.transportDepartureTime}</p> : null}{recommendation.recommendedArrival ? <p className="mt-1 text-sm font-bold text-sea">{recommendation.recommendedArrival}</p> : null}<p className={recommendation.pending ? "mt-1 text-sm font-bold text-coral" : "mt-1 text-sm font-semibold text-ink/70"}>{recommendation.note}</p></div> : null}
    {reservation.pending.length ? <p className="mt-3 text-sm font-semibold text-coral">Pendiente: {reservation.pending.join(" ")}</p> : null}
    <div className="mt-3 grid grid-cols-3 gap-2"><Link className="rounded-md bg-sea px-2 py-3 text-center text-sm font-black text-white" href={`/trips/europa-2026/days/${day}`}>Ver dia</Link>{reservation.documentIds.length ? <Link className="rounded-md bg-white px-2 py-3 text-center text-sm font-black text-ink" href="/trips/europa-2026/documentos">Documentos</Link> : <span />}{(reservation.address || reservation.origin || reservation.destination) ? <Link className="rounded-md bg-white px-2 py-3 text-center text-sm font-black text-ink" href="/trips/europa-2026/mapa">Mapa</Link> : <span />}</div>
  </article>;
}

function PendingSection({ title, items, badge, defaultOpen = false }: { title: string; items: string[]; badge: number; defaultOpen?: boolean }) {
  return <AccordionSection badge={badge} defaultOpen={defaultOpen} title={title}><ul className="grid gap-2">{items.map((item) => <li className="rounded-md bg-mist px-3 py-3 text-sm font-semibold text-ink" key={item}>{item}</li>)}</ul></AccordionSection>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-white/15 px-3 py-3"><p className="text-xs font-black uppercase text-white/65">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}

function Empty() {
  return <p className="rounded-md bg-mist px-3 py-3 font-semibold text-ink/65">Sin datos cargados.</p>;
}
