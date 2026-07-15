"use client";

import { useId, useState } from "react";

export function AccordionSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children
}: {
  title: string;
  subtitle?: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return <section className="rounded-lg border border-black/10 bg-white shadow-sm">
    <button aria-controls={contentId} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-4 text-left" onClick={() => setOpen((value) => !value)} type="button">
      <span className="min-w-0 flex-1"><span className="block font-bold text-ink">{title}</span>{subtitle ? <span className="mt-1 block text-sm font-semibold text-ink/60">{subtitle}</span> : null}</span>
      {badge !== undefined ? <span className="rounded-full bg-mist px-2 py-1 text-xs font-black text-sea">{badge}</span> : null}
      <span aria-hidden="true" className="text-lg font-black text-sea">{open ? "−" : "+"}</span>
    </button>
    {open ? <div className="border-t border-black/10 p-4" id={contentId}>{children}</div> : null}
  </section>;
}
