import { getTripDay, reservations, type Reservation } from "@/lib/trip-data";
import { getTimeRecommendation } from "@/lib/trip-today";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";

const groups: Array<{ type: Reservation["type"]; title: string }> = [
  { type: "vuelo", title: "Vuelos" },
  { type: "hotel", title: "Hoteles" },
  { type: "tren", title: "Trenes" },
  { type: "crucero", title: "Crucero" },
  { type: "entrada", title: "Entradas" },
  { type: "traslado", title: "Traslados" },
  { type: "seguro", title: "Seguro" }
];

export function ReservationsScreen() {
  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <SectionCard title={group.title} key={group.type}>
            <div className="grid gap-3">
              {reservations.filter((reservation) => reservation.type === group.type).map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} />
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </AppShell>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const recommendation = reservation.associatedDays.map((day) => getTimeRecommendation(getTripDay(day))).find(Boolean);
  return <article className="rounded-md border border-black/10 p-3">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-ink">{reservation.title}</h3><p className="text-sm text-ink/60">{reservation.date}</p></div><span className="rounded-full bg-mist px-2 py-1 text-xs font-bold uppercase text-sea">{reservation.status}</span></div>
    <p className="mt-3 text-sm text-ink/75">{reservation.detail}</p>
    {reservation.locator ? <p className="mt-2 text-sm font-bold text-ink">Localizador: {reservation.locator}</p> : null}
    {recommendation ? <div className="mt-3 rounded-md bg-mist p-3"><p className="text-xs font-black uppercase tracking-wide text-sea">Recomendacion de tiempo</p>{recommendation.transportDepartureTime ? <p className="mt-1 text-sm font-black text-ink">Salida: {recommendation.transportDepartureTime}</p> : null}{recommendation.recommendedArrival ? <p className="mt-1 text-sm font-bold text-sea">{recommendation.recommendedArrival}</p> : null}<p className={recommendation.pending ? "mt-1 text-sm font-bold text-coral" : "mt-1 text-sm font-semibold text-ink/70"}>{recommendation.note}</p></div> : null}
    {reservation.pending.length > 0 ? <p className="mt-2 text-sm font-semibold text-coral">Pendiente: {reservation.pending.join(" ")}</p> : null}
  </article>;
}
