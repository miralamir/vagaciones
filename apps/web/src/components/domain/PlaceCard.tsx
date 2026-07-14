"use client";

import { canRequestUber, getPlaceMapsUrl, type Place } from "@/lib/places";
import { openExternalUrl, openUberToDestination, RiskConfirmationDialog } from "./RiskConfirmationDialog";

const typeLabels: Record<Place["type"], string> = {
  hotel: "Hotel",
  airport: "Aeropuerto",
  train_station: "Estacion",
  port: "Puerto",
  activity: "Actividad",
  restaurant: "Comida",
  pharmacy: "Farmacia",
  supermarket: "Supermercado",
  toy_store: "Jugueteria",
  lego: "Ninos / LEGO",
  perfume: "Nadia / perfumes",
  design_store: "Nadia / diseno",
  viewpoint: "Mirador",
  walking_area: "A pie",
  emergency: "Emergencia",
  other: "Lugar util"
};

export function PlaceCard({ place }: { place: Place }) {
  const mapsAvailable = place.actions.maps && !place.privateLocationKey;
  const uberAvailable = canRequestUber(place);
  const destination = place.address ?? `${place.name}, ${place.city}`;

  return <div className="grid gap-3 rounded-md border border-black/10 p-3">
    <div className="grid gap-1">
      <p className="font-black text-ink">{place.name}</p>
      <p className="text-sm font-semibold text-ink/65">{typeLabels[place.type]} - {place.city}{place.country ? `, ${place.country}` : ""}</p>
      {place.address ? <p className="text-sm font-semibold text-ink/65">{place.address}</p> : null}
      {place.relatedDays.length ? <p className="text-xs font-black uppercase tracking-wide text-sea">Dias: {place.relatedDays.join(", ")} - {place.priority}</p> : <p className="text-xs font-black uppercase tracking-wide text-sea">{place.priority} - Pendiente de seleccionar</p>}
      {place.contractedTransfer ? <p className="text-sm font-black text-sea">Traslado contratado</p> : null}
      <p className="text-sm font-semibold text-ink/70">{place.notes}</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      {mapsAvailable ? <RiskConfirmationDialog action="Abrir lugar" dataShared={destination} destination="Google Maps" consequence="Se abrira una aplicacion externa con este lugar." onConfirm={() => openExternalUrl(getPlaceMapsUrl(place))}>{(open) => <button className="rounded-md bg-sea px-3 py-3 text-sm font-black text-white" onClick={open} type="button">Abrir Maps</button>}</RiskConfirmationDialog> : null}
      {uberAvailable ? <RiskConfirmationDialog action="Pedir Uber" dataShared={destination} destination="Uber" consequence="Vas a abrir Uber con este destino. Revisa direccion, horario y tarifa antes de confirmar el viaje." onConfirm={() => openUberToDestination(destination)}>{(open) => <button className="rounded-md bg-ink px-3 py-3 text-sm font-black text-white" onClick={open} type="button">Pedir Uber</button>}</RiskConfirmationDialog> : null}
      {place.actions.call && place.phone ? <RiskConfirmationDialog action="Llamar" dataShared={place.phone} destination="Telefono" consequence="Se iniciara una llamada desde el dispositivo." onConfirm={() => { window.location.href = `tel:${place.phone}`; }}>{(open) => <button className="rounded-md bg-coral px-3 py-3 text-sm font-black text-white" onClick={open} type="button">Llamar</button>}</RiskConfirmationDialog> : null}
    </div>
  </div>;
}
