"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDocumentFileUrl } from "@/lib/documents";
import { getSavedOfflineDocuments } from "@/lib/document-offline";
import type { DocumentIndex, IndexedDocument } from "@/lib/document-types";
import { AppShell } from "./AppShell";
import { RiskConfirmationDialog } from "./RiskConfirmationDialog";

export function DocumentViewerScreen({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<IndexedDocument | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [qrMode, setQrMode] = useState(false);
  const [brightMode, setBrightMode] = useState(true);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const isIdentity = document?.category === "otros" && /pass|pasaporte|dni|identity|identidad/i.test(document.visibleName);
  const needsConfirmation = Boolean(document?.requiresConfirmation);

  const fileUrl = useMemo(() => document ? getDocumentFileUrl(document) : "", [document]);

  useEffect(() => {
    void fetch("/api/documents/index", { cache: "no-store" })
      .then((response) => response.json())
      .then((index: DocumentIndex) => setDocument(index.documents.find((item) => item.id === documentId)))
      .catch(() => setDocument(getSavedOfflineDocuments().find((item) => item.id === documentId)))
      .finally(() => setLoaded(true));
  }, [documentId]);

  useEffect(() => {
    if (!document || document.mimeType === "application/pdf" || ((isIdentity || needsConfirmation) && !identityConfirmed)) {
      setImageUrl("");
      setImageLoading(false);
      setImageError(null);
      return;
    }

    let active = true;
    let objectUrl = "";
    setImageLoading(true);
    setImageError(null);

    void fetch(fileUrl, {
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "image/*" }
    })
      .then(async (response) => {
        if (response.ok) return response.blob();
        const cached = await caches.match(fileUrl);
        if (cached) return cached.blob();
        throw new Error(`No se pudo cargar la imagen (${response.status}).`);
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (active) setImageError(error instanceof Error ? error.message : "No se pudo cargar la imagen.");
      })
      .finally(() => {
        if (active) setImageLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document, fileUrl, identityConfirmed, isIdentity, needsConfirmation]);

  useEffect(() => {
    if (!qrMode) return;

    let lock: { release: () => Promise<void> } | undefined;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;

    if (wakeLock) {
      void wakeLock.request("screen").then((result) => {
        lock = result;
      }).catch(() => undefined);
    }

    return () => {
      if (lock) void lock.release();
    };
  }, [qrMode]);

  if (!document && loaded) {
    return (
      <AppShell>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">Documento no encontrado</h2>
          <Link className="mt-4 inline-flex rounded-md bg-sea px-4 py-3 font-black text-white" href="/trips/europa-2026/documentos">
            Volver a documentos
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!document) {
    return (
      <AppShell>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-ink">Cargando documento...</h2>
        </div>
      </AppShell>
    );
  }

  if ((isIdentity || needsConfirmation) && !identityConfirmed) {
    return (
      <AppShell>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-coral">Documento protegido</p>
          <h2 className="mt-2 text-2xl font-black text-ink">Confirmar para mostrar</h2>
          <p className="mt-2 text-sm font-semibold text-ink/70">Este documento contiene datos personales y no se muestra por defecto.</p>
          <RiskConfirmationDialog
            action="Mostrar documento protegido"
            dataShared={document.visibleName}
            destination="Pantalla local"
            consequence="Se mostrara un documento altamente sensible."
            onConfirm={() => setIdentityConfirmed(true)}
          >
            {(open) => <button className="mt-5 rounded-md bg-ink px-5 py-4 font-black text-white" onClick={open} type="button">Mostrar documento</button>}
          </RiskConfirmationDialog>
        </div>
      </AppShell>
    );
  }

  const viewer = document.mimeType === "application/pdf" ? (
    <iframe className="h-[70dvh] w-full rounded-lg bg-white" src={fileUrl} title={document.visibleName} />
  ) : imageLoading ? (
    <div className="grid h-[70dvh] place-items-center rounded-lg bg-white font-bold text-ink/65">Cargando imagen...</div>
  ) : imageError || !imageUrl ? (
    <div className="grid h-[70dvh] place-items-center rounded-lg bg-white p-5 text-center font-bold text-coral">{imageError ?? "Imagen no disponible."}</div>
  ) : (
    <div className="grid h-[70dvh] place-items-center overflow-auto rounded-lg bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={document.visibleName}
        className="max-h-none max-w-none transition-transform"
        src={imageUrl}
        onError={() => setImageError("La imagen no se pudo decodificar en este dispositivo.")}
        style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
      />
    </div>
  );

  return (
    <AppShell>
      <section className="grid gap-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-sea">{document.category}</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{document.visibleName}</h2>
          <p className="mt-1 text-sm font-semibold text-ink/60">
            {document.availableOffline ? "Disponible offline" : "Requiere conexion"} · {document.originalFileName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button className="rounded-md bg-mist px-3 py-3 font-black text-ink" onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))} type="button">Zoom -</button>
          <button className="rounded-md bg-mist px-3 py-3 font-black text-ink" onClick={() => setZoom((value) => Math.min(3, value + 0.2))} type="button">Zoom +</button>
          <RiskConfirmationDialog
            action="Descargar documento"
            dataShared={document.visibleName}
            destination="Almacenamiento del dispositivo"
            consequence="El archivo podria quedar fuera del control de VAGACIONES."
            onConfirm={() => {
              const link = window.document.createElement("a");
              link.href = fileUrl;
              link.download = document.originalFileName;
              link.click();
            }}
          >
            {(open) => <button className="rounded-md bg-ink px-3 py-3 font-black text-white" onClick={open} type="button">Descargar</button>}
          </RiskConfirmationDialog>
          <RiskConfirmationDialog
            action="Compartir documento"
            dataShared={document.visibleName}
            destination="Menu de compartir del dispositivo"
            consequence="El enlace podria enviarse fuera del dispositivo."
            onConfirm={() => {
              if (navigator.share) void navigator.share({ title: document.visibleName, url: window.location.href });
            }}
          >
            {(open) => <button className="rounded-md bg-sea px-3 py-3 font-black text-white" onClick={open} type="button">Compartir</button>}
          </RiskConfirmationDialog>
          <Link className="rounded-md bg-white px-3 py-3 text-center font-black text-ink" href={`/trips/europa-2026/days/${document.associatedDays[0] ?? 1}`}>
            Volver al dia
          </Link>
        </div>

        {document.containsQR ? (
          <RiskConfirmationDialog
            action="Mostrar QR"
            dataShared={document.visibleName}
            destination="Pantalla local"
            consequence="El QR puede servir como billete o acceso."
            onConfirm={() => setQrMode(true)}
          >
            {(open) => <button className="rounded-lg bg-white px-5 py-4 text-lg font-black text-ink shadow-sm" onClick={open} type="button">Mostrar QR pantalla completa</button>}
          </RiskConfirmationDialog>
        ) : null}

        {viewer}

        {qrMode ? (
          <div className={brightMode ? "fixed inset-0 z-50 grid bg-white p-4 text-ink brightness-125" : "fixed inset-0 z-50 grid bg-white p-4 text-ink"}>
            <div className="grid grid-rows-[auto_1fr_auto] gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-sea">QR / billete</p>
                  <h3 className="text-xl font-black">{document.visibleName}</h3>
                  <p className="text-sm font-semibold text-ink/60">Pasajero: no identificado · Asiento: no informado · Trayecto: no informado</p>
                </div>
                <button className="rounded-md bg-ink px-4 py-3 font-black text-white" onClick={() => setQrMode(false)} type="button">Cerrar</button>
              </div>
              <div className="grid place-items-center overflow-auto bg-white">
                {document.mimeType === "application/pdf" ? (
                  <iframe className="h-full min-h-[70dvh] w-full bg-white" src={fileUrl} title={document.visibleName} />
                ) : (
                  <>
                    {imageUrl ? <img alt={document.visibleName} className="max-h-full max-w-full" onError={() => setImageError("La imagen no se pudo decodificar en este dispositivo.")} src={imageUrl} /> : <p className="font-bold text-coral">{imageError ?? "Imagen no disponible."}</p>}
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-md bg-mist px-4 py-4 font-black text-ink" onClick={() => setBrightMode((value) => !value)} type="button">
                  Brillo maximo
                </button>
                <button className="rounded-md bg-mist px-4 py-4 font-black text-ink" type="button">
                  Mostrar siguiente pasajero
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
