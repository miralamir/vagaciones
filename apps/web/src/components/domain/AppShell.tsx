import Link from "next/link";
import { trip } from "@/lib/trip-data";
import { PwaRuntime } from "./PwaRuntime";

const navItems = [
  { href: "/trips/europa-2026", label: "Hoy" },
  { href: "/trips/europa-2026/mapa", label: "Mapa" },
  { href: "/trips/europa-2026/reservas", label: "Reservas" },
  { href: "/trips/europa-2026/chat", label: "Chat" },
  { href: "/trips/europa-2026/mas", label: "Mas" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 pb-24 pt-3 sm:px-6 lg:px-8">
      <PwaRuntime />
      <header className="mb-3 flex items-center justify-between rounded-lg border border-black/10 bg-white/90 px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sea">VAGACIONES</p>
          <h1 className="text-xl font-bold leading-tight text-ink">{trip.name}</h1>
        </div>
        <Link className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white" href="/trips/europa-2026/days/1">
          Dia 1
        </Link>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-2 pb-3 pt-2 shadow-[0_-8px_24px_rgba(24,33,47,0.12)] backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1">
          {navItems.map((item) => (
            <Link
              className="rounded-lg px-1 py-3 text-center text-sm font-black text-ink/75 active:bg-mist"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
