"use client";

import { useTripContext } from "@/hooks/useTripContext";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { openExternalUrl, RiskConfirmationDialog } from "./RiskConfirmationDialog";

export function MapScreen() {
  const context = useTripContext();
  const day = context.activeDay;

  return (
    <AppShell>
      <div className="grid gap-3">
        <RiskConfirmationDialog
          action="Abrir proximo traslado"
          dataShared={day.transfer.destination}
          destination="Google Maps"
          consequence="Se abrira una aplicacion externa con ubicacion o destino."
          onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
        >
          {(open) => <button className="rounded-lg bg-sea px-5 py-6 text-center text-2xl font-black text-white shadow-sm" onClick={open} type="button">Llevame al proximo traslado</button>}
        </RiskConfirmationDialog>
        {day.hotel ? (
          <RiskConfirmationDialog
            action="Abrir hotel"
            dataShared={day.hotel.address}
            destination="Google Maps"
            consequence="Se abrira una aplicacion externa con la ubicacion."
            onConfirm={() => openExternalUrl(day.hotel!.mapUrl)}
          >
            {(open) => <button className="rounded-lg bg-ink px-5 py-6 text-center text-2xl font-black text-white shadow-sm" onClick={open} type="button">Llevame al hotel</button>}
          </RiskConfirmationDialog>
        ) : null}
        <SectionCard title="Destinos rapidos">
          <div className="grid gap-2">
            <div className="rounded-md bg-mist px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-sea">Ubicacion actual</p>
              <p className="mt-1 font-black text-ink">{context.inferredLocation}</p>
            </div>
            <a className="rounded-md border border-black/10 px-4 py-4 font-black text-ink" href={day.transfer.mapsUrl} target="_blank">
              {day.transfer.destination}
            </a>
            <a className="rounded-md border border-black/10 px-4 py-4 font-black text-ink" href={`https://maps.google.com/?q=${encodeURIComponent(`${day.nextEvent} ${day.city}`)}`} target="_blank">
              {day.nextEvent}
            </a>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
