import Link from "next/link";
import { AppShell } from "./AppShell";

const actions = [
  { href: "/trips/europa-2026/days/1", label: "Ver dia completo" },
  { href: "/trips/europa-2026/hotel", label: "Hotel" },
  { href: "/trips/europa-2026/documentos", label: "Documentos" },
  { href: "/trips/europa-2026/documentos/revisar", label: "Herramientas: revision experimental" },
  { href: "/trips/europa-2026/reservas", label: "Reservas" },
  { href: "/trips/europa-2026/offline", label: "Offline" }
];

export function MoreScreen() {
  return (
    <AppShell>
      <div className="grid gap-2">
        {actions.map((action) => (
          <Link className="rounded-lg bg-white px-5 py-5 text-lg font-black text-ink shadow-sm active:bg-mist" href={action.href} key={action.href}>
            {action.label}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
