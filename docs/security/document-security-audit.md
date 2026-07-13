# Auditoria de seguridad documental

## Extraccion local de PDFs

La importacion usa `pdf-parse` para leer texto nativo localmente. El contenido completo se procesa solo en memoria: no se registra en consola, no se incluye en Git y no se expone por la web. Cuando un PDF no contiene texto extraible, el indice marca `Requiere OCR / texto no extraible`; VAGACIONES no ejecuta OCR automaticamente.

Los datos detectados existen solamente en los indices ignorados de cada viaje. Reimportar conserva los documentos aprobados y nunca mueve ni borra los originales en `incoming`.

Fecha: 2026-07-12

## Alcance

Se reviso la exposicion de documentos reales para Europa 2026 antes de implementar la ingesta real.

## Hallazgos

1. `apps/web/public/` contenia un PDF placeholder no sensible en `apps/web/public/docs/sprint-1-placeholder.pdf`.
   - Riesgo: bajo, pero la existencia de PDFs en `public/` crea un patron peligroso.
   - Correccion: eliminado del proyecto. Los documentos reales no deben copiarse a `public/`.

2. No hay archivos reales en:
   - `data/trips/europa-2026/pdfs`
   - `data/trips/europa-2026/documents`
   - `data/trips/europa-2026/qr`
   - Riesgo actual: bajo.

3. `git ls-files` y `git log --all --name-only` no muestran PDFs, QR, pasaportes, polizas ni reservas reales en commits anteriores.
   - Riesgo actual: bajo.
   - Accion si aparece un archivo sensible en el futuro: detener el proceso y pedir aprobacion explicita antes de reescribir historial.

4. El service worker cacheaba todo `/api/documents/` sin consultar sensibilidad.
   - Riesgo: alto para pasaportes, DNI, QR y boarding passes.
   - Correccion requerida: no cachear documentos con `offlinePolicy: never` o `highly_sensitive` sin aprobacion del usuario.

5. Las rutas de documentos sirven archivos mediante `/api/documents/[documentId]`.
   - Riesgo: medio si el ID es predecible.
   - Correccion: mantener documentos fuera de `public/`, validar por indice, impedir rutas arbitrarias y agregar confirmacion humana para acciones sensibles.

6. No se detectaron logs de contenido QR, pasaportes, polizas o reservas.
   - Riesgo actual: bajo.
   - Regla: registrar solo eventos de acceso, nunca contenido.

## Almacenamiento privado

VAGACIONES no usa una carpeta privada dentro del repositorio. El almacenamiento documental privado se define con la variable obligatoria:

```text
DOCUMENT_STORAGE
```

Windows:

```text
C:\VAGACIONES-DATA
```

Linux produccion:

```text
/srv/vagaciones-data
```

Copiar los archivos reales aca:

```text
DOCUMENT_STORAGE/europa-2026/incoming
```

Los documentos aprobados se copian, sin borrar el original, a:

```text
DOCUMENT_STORAGE/europa-2026/documents
```

Si `DOCUMENT_STORAGE` no esta configurada, la aplicacion y el importador fallan de forma segura. No existe ruta insegura por defecto.

## Reglas

- No guardar documentos privados en `apps/web/public`.
- No servir `DOCUMENT_STORAGE` como carpeta estatica.
- Entregar documentos solo mediante APIs controladas.
- Validar que toda ruta resuelta permanezca dentro de `DOCUMENT_STORAGE`.
- Rechazar path traversal como `../`.
- No subir binarios reales a Git.
- No almacenar tarjetas.
- Pasaportes y DNI: `highly_sensitive`, sin miniaturas, sin cache automatico, sin compartir por defecto.
- QR y boarding passes: confirmacion antes de abrir, sin logs de contenido, cache solo con aprobacion.
- Hoteles, trenes, vuelos, seguro: `private`.
- Folletos publicos: `public`.

## Estado final de esta auditoria

No se encontraron documentos reales sensibles expuestos. Se eliminaron los placeholders publicos y se agrego una carpeta privada de ingesta.
