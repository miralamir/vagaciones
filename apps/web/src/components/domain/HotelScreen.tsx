import { getActiveHotel } from "@/lib/trip-data";
import { AppShell } from "./AppShell";
import { SectionCard } from "./Cards";
import { openExternalUrl, RiskConfirmationDialog } from "./RiskConfirmationDialog";

export function HotelScreen() {
  const hotel = getActiveHotel();

  if (!hotel) {
    return <AppShell><SectionCard title="Hotel"><p className="text-ink/65">No hay alojamiento curado para el contexto actual.</p></SectionCard></AppShell>;
  }

  return (
    <AppShell>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-sea">Hotel actual</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">{hotel.name}</h2>
          <p className="mt-2 text-ink/65">{hotel.address}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <RiskConfirmationDialog
              action="Abrir ubicacion del hotel"
              dataShared={hotel.address}
              destination="Google Maps"
              consequence="Se abrira una aplicacion externa con la ubicacion."
              onConfirm={() => openExternalUrl(hotel.mapUrl)}
            >
              {(open) => <button className="rounded-md bg-sea px-4 py-5 text-center text-lg font-black text-white" onClick={open} type="button">Llevame</button>}
            </RiskConfirmationDialog>
            <RiskConfirmationDialog
              action="Llamar al hotel"
              dataShared={hotel.phone}
              destination="Telefono"
              consequence="Se iniciara una llamada desde el dispositivo."
              onConfirm={() => { window.location.href = `tel:${hotel.phone}`; }}
            >
              {(open) => <button className="rounded-md bg-coral px-4 py-5 text-center text-lg font-black text-white" onClick={open} type="button">Llamar</button>}
            </RiskConfirmationDialog>
            {hotel.reservationPdf ? (
              <a className="rounded-md bg-ink px-4 py-5 text-center text-lg font-black text-white" href={hotel.reservationPdf}>Mostrar reserva</a>
            ) : (
              <div className="rounded-md bg-ink/25 px-4 py-5 text-center text-lg font-black text-ink">Sin PDF original</div>
            )}
          </div>
        </div>

        <SectionCard title="Datos">
          <dl className="grid gap-3 text-sm">
            <Detail label="Telefono" value={hotel.phone} />
            <Detail label="Email" value={hotel.email} />
            <Detail label="Check-in" value={hotel.checkIn} />
            <Detail label="Check-out" value={hotel.checkOut} />
            <Detail label="Confirmacion" value={hotel.confirmationNumber ?? "No cargada"} />
            <Detail label="Pasajeros" value={hotel.passengers?.join(", ") ?? "No cargados"} />
            <Detail label="Importe pendiente" value={hotel.pendingAmount ?? "No informado"} />
            {hotel.pending.length > 0 ? <Detail label="Pendientes" value={hotel.pending.join(" ")} /> : null}
          </dl>
        </SectionCard>
      </section>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-mist px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-sea">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
