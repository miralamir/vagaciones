"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function safeReturnTo(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/trips/europa-2026/documentos";
}

export default function DocumentAccessPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [returnTo, setReturnTo] = useState("/trips/europa-2026/documentos");

  useEffect(() => {
    setReturnTo(safeReturnTo(new URLSearchParams(window.location.search).get("returnTo")));
  }, []);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/documents/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    setPassword("");
    if (response.ok) {
      router.replace(returnTo);
      return;
    }
    setMessage(response.status === 401 ? "Contraseña incorrecta." : response.status === 429 ? "Demasiados intentos. Esperá un minuto." : "No se pudo habilitar el acceso ahora.");
  };

  const logout = async () => {
    await fetch("/api/documents/session", { method: "DELETE" });
    setMessage("Sesión cerrada.");
  };

  return <main className="mx-auto max-w-md p-6">
    <h1 className="text-2xl font-black">Acceso a documentos</h1>
    <p className="mt-2 text-sm font-semibold text-ink/70">Ingresá tu contraseña de viaje para abrir reservas, tickets e imágenes privadas.</p>
    <form className="mt-4 grid gap-3" onSubmit={login}>
      <label className="grid gap-1 text-sm font-bold text-ink">Contraseña<input aria-label="Contraseña documental" autoComplete="current-password" className="rounded-md border p-3" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>
      <button className="rounded-md bg-sea p-3 font-black text-white" type="submit">Entrar</button>
    </form>
    <p aria-live="polite" className="mt-3 text-sm font-semibold">{message}</p>
    <button className="mt-4 rounded-md border border-black/10 px-3 py-2 text-sm font-bold" onClick={() => void logout()} type="button">Cerrar sesión</button>
  </main>;
}
