import Link from "next/link";
import { getTodayTripDay } from "@/lib/trip-data";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";

export function ChatScreen() {
  const day = getTodayTripDay();

  return (
    <AppShell>
      <SectionCard title="Chat">
        <div className="grid gap-3">
          <p className="text-sm font-semibold text-ink/70">El Concierge IA no esta implementado en este sprint. Dejamos accesos de emergencia para resolver rapido.</p>
          <Link className="rounded-md bg-sea px-4 py-5 text-center text-lg font-black text-white" href="/trips/europa-2026/documentos">
            Ver documentos
          </Link>
          <a className="rounded-md bg-ink px-4 py-5 text-center text-lg font-black text-white" href={day.transfer.mapsUrl} target="_blank">
            Abrir mapa
          </a>
          {day.hotel ? (
            <a className="rounded-md bg-coral px-4 py-5 text-center text-lg font-black text-white" href={`tel:${day.hotel.phone}`}>
              Llamar hotel
            </a>
          ) : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}
