import { reservations, type Reservation } from "@/lib/trip-data";
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
                <article className="rounded-md border border-black/10 p-3" key={reservation.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-ink">{reservation.title}</h3>
                      <p className="text-sm text-ink/60">{reservation.date}</p>
                    </div>
                    <span className="rounded-full bg-mist px-2 py-1 text-xs font-bold uppercase text-sea">{reservation.status}</span>
                  </div>
                  <p className="mt-3 text-sm text-ink/75">{reservation.detail}</p>
                  {reservation.locator ? <p className="mt-2 text-sm font-bold text-ink">Localizador: {reservation.locator}</p> : null}
                  {reservation.pending.length > 0 ? <p className="mt-2 text-sm font-semibold text-coral">Pendiente: {reservation.pending.join(" ")}</p> : null}
                </article>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </AppShell>
  );
}
