"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useRef, useState } from "react";

type QueueItem = { id: string; name: string; file: File; progress: number; state: "ready" | "uploading" | "done" | "error"; message?: string };
const accepted = ".pdf,.png,.jpg,.jpeg,.webp";

export function DocumentUpload({ compact = false }: { compact?: boolean }) {
  const filesInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    const next = selected.map((file) => ({ id: crypto.randomUUID(), name: file.name || "Archivo seleccionado", file, progress: 0, state: "ready" as const }));
    setItems((current) => [...current, ...next]);
    setNotice(null);
  };

  const update = (id: string, patch: Partial<QueueItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  const uploadOne = (item: QueueItem, form: HTMLFormElement) => new Promise<void>((resolve) => {
    const data = new FormData(form);
    data.delete("files");
    data.append("files", item.file, item.file.name);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/documents/upload");
    request.responseType = "json";
    request.upload.onprogress = (event) => { if (event.lengthComputable) update(item.id, { progress: Math.round((event.loaded / event.total) * 100) }); };
    request.onload = () => {
      const body = request.response as { results?: Array<{ result?: string; error?: string }>; errors?: string[] } | null;
      const result = body?.results?.[0];
      if (request.status >= 200 && request.status < 300 && result && !result.error) update(item.id, { progress: 100, state: "done", message: result.result === "duplicate" ? "Ya estaba cargado." : "Pendiente de revision." });
      else update(item.id, { state: "error", message: result?.error ?? body?.errors?.[0] ?? "No se pudo cargar el archivo." });
      resolve();
    };
    request.onerror = () => { update(item.id, { state: "error", message: "No se pudo conectar para cargar el archivo." }); resolve(); };
    request.send(data);
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploading || !items.some((item) => item.state === "ready")) return;
    setUploading(true); setNotice(null);
    for (const item of items.filter((current) => current.state === "ready")) {
      update(item.id, { state: "uploading", progress: 1 });
      await uploadOne(item, event.currentTarget);
    }
    setUploading(false); setNotice("Las cargas terminadas quedan pendientes de revision; ninguna se aprobo automaticamente.");
  };

  return <div className={compact ? "rounded-md bg-mist p-3" : "rounded-lg bg-white p-4 shadow-sm"}>
    <div className="flex items-center justify-between gap-3"><div><p className="font-black text-ink">Subir documento</p><p className="text-sm font-semibold text-ink/65">PDF o imagen, hasta 20 MB por archivo.</p></div><button className="rounded-md bg-sea px-4 py-3 text-sm font-black text-white" onClick={() => setOpen((value) => !value)} type="button">{open ? "Cerrar" : "Subir documento"}</button></div>
    {open ? <form className="mt-4 grid gap-3" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-2"><button className="rounded-md border border-black/10 bg-white px-3 py-3 text-sm font-black text-ink" onClick={() => filesInput.current?.click()} type="button">Archivos o fotos</button><button className="rounded-md border border-black/10 bg-white px-3 py-3 text-sm font-black text-ink" onClick={() => cameraInput.current?.click()} type="button">Usar camara</button></div>
      <input accept={accepted} className="sr-only" multiple onChange={addFiles} ref={filesInput} type="file" />
      <input accept="image/png,image/jpeg,image/webp" capture="environment" className="sr-only" onChange={addFiles} ref={cameraInput} type="file" />
      <div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold text-ink">Tipo<select className="rounded-md border border-black/10 bg-white px-3 py-2" defaultValue="other" name="kind"><option value="boarding_pass">Boarding pass</option><option value="ticket">Ticket</option><option value="reservation">Reserva</option><option value="other">Otro</option></select></label><label className="grid gap-1 text-sm font-bold text-ink">Categoria<select className="rounded-md border border-black/10 bg-white px-3 py-2" defaultValue="otros" name="category"><option value="vuelos">Vuelos</option><option value="hoteles">Hoteles</option><option value="trenes">Trenes</option><option value="crucero">Crucero</option><option value="entradas">Entradas</option><option value="traslados">Traslados</option><option value="seguro">Seguro</option><option value="otros">Otros</option></select></label><label className="grid gap-1 text-sm font-bold text-ink">Pasajero<input className="rounded-md border border-black/10 px-3 py-2" maxLength={120} name="passenger" /></label><label className="grid gap-1 text-sm font-bold text-ink">Vuelo o reserva<input className="rounded-md border border-black/10 px-3 py-2" maxLength={120} name="reservation" /></label><label className="grid gap-1 text-sm font-bold text-ink">Fecha<input className="rounded-md border border-black/10 px-3 py-2" name="date" type="date" /></label><label className="grid gap-1 text-sm font-bold text-ink">Dia<select className="rounded-md border border-black/10 bg-white px-3 py-2" defaultValue="" name="day"><option value="">Sin asociar</option>{Array.from({ length: 27 }, (_, day) => <option key={day} value={day}>Dia {day}</option>)}</select></label><label className="grid gap-1 text-sm font-bold text-ink">Ciudad<input className="rounded-md border border-black/10 px-3 py-2" maxLength={120} name="city" /></label><label className="grid gap-1 text-sm font-bold text-ink">Tramo o nota<input className="rounded-md border border-black/10 px-3 py-2" maxLength={120} name="segment" /></label></div>
      {items.length ? <ul className="grid gap-2">{items.map((item) => <li className="rounded-md bg-mist px-3 py-2" key={item.id}><div className="flex justify-between gap-3 text-sm font-bold text-ink"><span className="truncate">{item.name}</span><span>{item.state === "uploading" ? `${item.progress}%` : item.message ?? "Listo para cargar"}</span></div>{item.state === "uploading" ? <div className="mt-2 h-1 overflow-hidden rounded bg-black/10"><div className="h-full bg-sea" style={{ width: `${item.progress}%` }} /></div> : null}</li>)}</ul> : <p className="rounded-md bg-mist px-3 py-3 text-sm font-semibold text-ink/65">Selecciona uno o varios archivos para cargar.</p>}
      <button className="rounded-md bg-ink px-4 py-3 font-black text-white disabled:opacity-50" disabled={uploading || !items.some((item) => item.state === "ready")} type="submit">{uploading ? "Cargando..." : "Cargar documentos"}</button>
      {notice ? <p className="rounded-md bg-mist px-3 py-3 text-sm font-bold text-ink">{notice} <Link className="text-sea underline" href="/trips/europa-2026/documentos/revisar">Ir a revision</Link></p> : null}
    </form> : null}
  </div>;
}
