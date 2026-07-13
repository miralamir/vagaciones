"use client";

import { useState } from "react";

type RiskConfirmationDialogProps = {
  action: string;
  dataShared: string;
  destination: string;
  consequence: string;
  confirmLabel?: string;
  children: (open: () => void) => React.ReactNode;
  onConfirm: () => void;
};

export function RiskConfirmationDialog({
  action,
  dataShared,
  destination,
  consequence,
  confirmLabel = "Confirmar",
  children,
  onConfirm
}: RiskConfirmationDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {children(() => setOpen(true))}
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/70 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="text-xs font-black uppercase tracking-wide text-coral">Confirmacion requerida</p>
            <h2 className="mt-2 text-2xl font-black text-ink">{action}</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Detail label="Datos que se usaran" value={dataShared} />
              <Detail label="Destino externo" value={destination} />
              <Detail label="Posible consecuencia" value={consequence} />
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="rounded-md bg-mist px-4 py-4 font-black text-ink" onClick={() => setOpen(false)} type="button">
                Cancelar
              </button>
              <button
                className="rounded-md bg-coral px-4 py-4 font-black text-white"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                type="button"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-mist px-3 py-2">
      <dt className="text-[10px] font-black uppercase tracking-wide text-sea">{label}</dt>
      <dd className="mt-1 font-bold text-ink">{value}</dd>
    </div>
  );
}

export function openExternalUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openUberToDestination(destination: string) {
  openExternalUrl(`https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(destination)}`);
}
