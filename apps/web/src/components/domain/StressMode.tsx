"use client";

import { useState } from "react";
import type { TripDay } from "@/lib/trip-data";
import { openExternalUrl, RiskConfirmationDialog } from "./RiskConfirmationDialog";

export function StressMode({ day }: { day: TripDay }) {
  const [open, setOpen] = useState(false);
  const qrHref = day.quickDocuments.qr;

  return (
    <>
      <button
        className="fixed bottom-24 right-4 z-30 rounded-full bg-red-600 px-5 py-4 text-sm font-black tracking-wide text-white shadow-xl active:scale-95"
        onClick={() => setOpen(true)}
        type="button"
      >
        SALIR AHORA
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-ink p-4 text-white">
          <div className="mx-auto grid h-full max-w-md grid-rows-[auto_1fr_auto] gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-wide text-white/60">Modo estres</p>
              <button className="rounded-full bg-white/15 px-4 py-2 font-bold" onClick={() => setOpen(false)} type="button">
                Cerrar
              </button>
            </div>
            <div className="grid content-center gap-4">
              <EmergencyBlock label="Destino" value={day.transfer.destination} />
              <EmergencyBlock label="Hora para salir" value={day.transfer.limitLeaveTime} />
              {qrHref ? (
                <a className="rounded-lg bg-white px-5 py-5 text-center text-xl font-black text-ink" href={qrHref}>
                  QR
                </a>
              ) : (
                <div className="rounded-lg bg-white px-5 py-5 text-center text-xl font-black text-ink">
                  Disponible despues del check-in
                </div>
              )}
              <RiskConfirmationDialog
                action="Abrir mapa de emergencia"
                dataShared={day.transfer.destination}
                destination="Google Maps"
                consequence="Se abrira una aplicacion externa con ubicacion o destino."
                onConfirm={() => openExternalUrl(day.transfer.mapsUrl)}
              >
                {(confirm) => <button className="rounded-lg bg-sea px-5 py-5 text-center text-xl font-black text-white" onClick={confirm} type="button">Mapa</button>}
              </RiskConfirmationDialog>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function EmergencyBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-5">
      <p className="text-sm font-black uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
