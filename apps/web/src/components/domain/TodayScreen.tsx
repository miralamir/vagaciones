import Link from "next/link";
import preferences from "../../../../../data/trips/europa-2026/family-preferences.json";
import { reservations, trip, tripDays } from "@/lib/trip-data";
import { AppShell } from "./AppShell";

export function TodayScreen() {
  const pending = reservations.flatMap((reservation) => reservation.pending).slice(0, 3);
  return <AppShell><section className="grid gap-4"><div className="rounded-lg bg-ink p-6 text-white"><p className="text-sm font-black uppercase text-white/60">VAGACIONES</p><h2 className="mt-1 text-3xl font-black">{trip.name}</h2><p className="mt-2 font-bold text-white/75">18/07/2026 al 12/08/2026</p><p className="mt-3 text-sm text-white/75">Viajeros: {preferences.travelers.join(", ")}</p></div><Link className="rounded-lg bg-sea px-5 py-5 text-center text-lg font-black text-white" href="/trips/europa-2026/days/1">Ver Día 1</Link><div className="grid gap-2 sm:grid-cols-2"><Link className="rounded-lg bg-white px-4 py-4 text-center font-black text-ink shadow-sm" href="/trips/europa-2026/reservas">Ver Reservas</Link><Link className="rounded-lg bg-white px-4 py-4 text-center font-black text-ink shadow-sm" href="/trips/europa-2026/documentos">Ver Documentos</Link></div><div className="rounded-lg bg-white p-4 shadow-sm"><h3 className="font-black text-ink">Próximos pendientes</h3><ul className="mt-3 grid gap-2">{pending.length ? pending.map((item) => <li className="rounded-md bg-mist px-3 py-2 text-sm font-semibold text-ink" key={item}>{item}</li>) : <li className="text-sm text-ink/65">Sin pendientes cargados.</li>}</ul></div></section></AppShell>;
}
