"use client";

import { useEffect, useState } from "react";
import { getPersonalChecklistItems, savePersonalChecklistItems, type ChecklistPriority, type PersonalChecklistItem } from "@/lib/personal-checklists";
import { trip } from "@/lib/trip-data";

export type ChecklistItem = { id: string; label: string; priority: ChecklistPriority };

export function Checklist({ day, items }: { day: number; items: ChecklistItem[] }) {
  const doneKey = `vagaciones:europa-2026:checklist:${day}`;
  const [done, setDone] = useState<string[]>([]);
  const [personalItems, setPersonalItems] = useState<PersonalChecklistItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState<ChecklistPriority>("medium");
  const [category, setCategory] = useState("");
  const [targetDay, setTargetDay] = useState(day);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try { setDone(JSON.parse(window.localStorage.getItem(doneKey) ?? "[]") as string[]); } catch { setDone([]); }
    setPersonalItems(getPersonalChecklistItems(day));
    setTargetDay(day);
  }, [day, doneKey]);

  const updateDone = (next: string[]) => { setDone(next); window.localStorage.setItem(doneKey, JSON.stringify(next)); };
  const allItems = [...items, ...personalItems];
  const toggle = (id: string) => updateDone(done.includes(id) ? done.filter((item) => item !== id) : [...done, id]);
  const addPersonalItem = () => {
    const text = label.trim();
    if (!text) return;
    const next = [...getPersonalChecklistItems(targetDay), { id: `personal-${Date.now()}`, label: text, priority, category: category.trim() || undefined, createdAt: new Date().toISOString() }];
    savePersonalChecklistItems(targetDay, next);
    if (targetDay === day) setPersonalItems(next);
    setLabel(""); setCategory(""); setShowForm(false);
    setMessage(targetDay === day ? "Item agregado a esta checklist." : `Item agregado al Dia ${targetDay}.`);
  };
  const removePersonalItem = (id: string) => {
    const next = personalItems.filter((item) => item.id !== id);
    setPersonalItems(next); savePersonalChecklistItems(day, next); updateDone(done.filter((item) => item !== id));
  };

  return <div className="grid gap-2">
    <div className="flex flex-wrap items-center gap-3"><button className="text-sm font-black text-sea" onClick={() => updateDone(allItems.map((item) => item.id))} type="button">Marcar todo como hecho</button><button className="text-sm font-black text-ink" onClick={() => setShowForm((value) => !value)} type="button">Agregar item</button></div>
    {showForm ? <div className="grid gap-2 rounded-md border border-black/10 bg-mist p-3"><input className="rounded-md border border-black/10 bg-white px-3 py-2 font-semibold text-ink" onChange={(event) => setLabel(event.target.value)} placeholder="Nuevo item" value={label} /><div className="grid grid-cols-2 gap-2"><select className="rounded-md border border-black/10 bg-white px-3 py-2 font-semibold text-ink" onChange={(event) => setTargetDay(Number(event.target.value))} value={targetDay}>{Array.from({ length: trip.totalDays + 1 }, (_, index) => <option key={index} value={index}>Dia {index}</option>)}</select><select className="rounded-md border border-black/10 bg-white px-3 py-2 font-semibold text-ink" onChange={(event) => setPriority(event.target.value as ChecklistPriority)} value={priority}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></div><input className="rounded-md border border-black/10 bg-white px-3 py-2 font-semibold text-ink" onChange={(event) => setCategory(event.target.value)} placeholder="Categoria opcional" value={category} /><button className="rounded-md bg-sea px-3 py-3 font-black text-white" onClick={addPersonalItem} type="button">Guardar item</button></div> : null}
    {message ? <p className="text-sm font-semibold text-sea">{message}</p> : null}
    {items.length ? <div className="grid gap-2"><p className="text-xs font-black uppercase tracking-wide text-sea">Curado</p>{items.map((item) => <ChecklistRow done={done.includes(item.id)} item={item} key={item.id} onToggle={() => toggle(item.id)} />)}</div> : null}
    {personalItems.length ? <div className="grid gap-2"><p className="text-xs font-black uppercase tracking-wide text-sea">Agregado por mi</p>{personalItems.map((item) => <div className="flex items-center gap-2" key={item.id}><div className="min-w-0 flex-1"><ChecklistRow done={done.includes(item.id)} item={item} onToggle={() => toggle(item.id)} />{item.category ? <p className="mt-1 text-xs font-bold text-ink/60">{item.category}</p> : null}</div><button className="rounded-md px-2 py-2 text-sm font-black text-coral" onClick={() => removePersonalItem(item.id)} type="button">Borrar</button></div>)}</div> : null}
    {!allItems.length ? <p className="text-ink/65">Sin checklist especifica todavia.</p> : null}
  </div>;
}

function ChecklistRow({ item, done, onToggle }: { item: ChecklistItem; done: boolean; onToggle: () => void }) {
  return <label className="flex items-center gap-3 rounded-md bg-mist px-3 py-3"><input checked={done} onChange={onToggle} type="checkbox" /><span className="flex-1 font-semibold text-ink">{item.label}</span><span className="text-xs font-black uppercase text-sea">{item.priority === "high" ? "Alta" : item.priority === "medium" ? "Media" : "Baja"}</span></label>;
}
