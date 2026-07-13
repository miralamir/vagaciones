"use client";

import { useEffect, useState } from "react";

export type ChecklistItem = { id: string; label: string; priority: "high" | "medium" | "low" };

export function Checklist({ day, items }: { day: number; items: ChecklistItem[] }) {
  const key = `vagaciones:europa-2026:checklist:${day}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => { setDone(JSON.parse(localStorage.getItem(key) ?? "[]")); }, [key]);
  const update = (next: string[]) => { setDone(next); localStorage.setItem(key, JSON.stringify(next)); };
  if (!items.length) return <p className="text-ink/65">Sin checklist específico todavía.</p>;
  return <div className="grid gap-2"><button className="justify-self-start text-sm font-black text-sea" onClick={() => update(items.map((item) => item.id))} type="button">Marcar todo como hecho</button>{items.map((item) => <label className="flex items-center gap-3 rounded-md bg-mist px-3 py-3" key={item.id}><input checked={done.includes(item.id)} onChange={() => update(done.includes(item.id) ? done.filter((id) => id !== item.id) : [...done, item.id])} type="checkbox" /><span className="flex-1 font-semibold text-ink">{item.label}</span><span className="text-xs font-black uppercase text-sea">{item.priority === "high" ? "Alta" : item.priority === "medium" ? "Media" : "Baja"}</span></label>)}</div>;
}
