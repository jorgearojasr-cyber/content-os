import type { Escena } from "./types";

/**
 * EXPORTAR KIT (TXT / Markdown / PDF)
 * ------------------------------------------------------------------
 * Formatea el contenido YA GENERADO (pegado y estructurado desde "Pegar
 * resultado" — ver exportar-contexto.ts) a un archivo descargable. No
 * genera nada nuevo, no llama a ningún modelo: es solo texto ya existente
 * reordenado a un formato de archivo. El PDF (exportar-pdf.ts) reutiliza
 * `formatearKitTexto` como fuente de contenido.
 * ------------------------------------------------------------------
 */

export type KitContenido = {
  titulo: string;
  copy: string;
  hashtags: string;
  cta: string;
  miniatura: string;
  narracion: string;
  escenas: Escena[];
};

function formatearEscenaTexto(e: Escena): string {
  const encabezado = `Escena ${e.numero}${e.duracionSegundos ? ` (${e.duracionSegundos}s)` : ""}`;
  const partes = [encabezado];
  if (e.descripcion) partes.push(`Descripción: ${e.descripcion}`);
  if (e.guionHablado) partes.push(`Guión hablado: ${e.guionHablado}`);
  if (e.textoEnPantalla) partes.push(`Texto en pantalla: ${e.textoEnPantalla}`);
  if ((e.promptVisual ?? "").trim()) partes.push(`Prompt imagen: ${(e.promptVisual ?? "").trim()}`);
  if (e.promptVideo) partes.push(`Prompt video: ${e.promptVideo}`);
  return partes.join("\n");
}

/** Texto plano — mismo criterio de "solo lo que tiene contenido" que ya
 * usa el resto de la app (ninguna sección vacía se imprime). */
export function formatearKitTexto(kit: KitContenido): string {
  const secciones: string[] = [`KIT DE PRODUCCIÓN — ${kit.titulo || "Sin título"}`, ""];
  if (kit.copy.trim()) secciones.push("COPY", kit.copy.trim(), "");
  if (kit.narracion.trim()) secciones.push("NARRACIÓN", kit.narracion.trim(), "");
  if (kit.escenas.length > 0) {
    secciones.push("ESCENAS", "");
    for (const e of kit.escenas) secciones.push(formatearEscenaTexto(e), "");
  }
  if (kit.hashtags.trim()) secciones.push("HASHTAGS", kit.hashtags.trim(), "");
  if (kit.cta.trim()) secciones.push("CTA", kit.cta.trim(), "");
  if (kit.miniatura.trim()) secciones.push("MINIATURA", kit.miniatura.trim(), "");
  return `${secciones.join("\n").trim()}\n`;
}

function formatearEscenaMarkdown(e: Escena): string {
  const lineas = [`### Escena ${e.numero}${e.duracionSegundos ? ` (${e.duracionSegundos}s)` : ""}`, ""];
  if (e.descripcion) lineas.push(`**Descripción:** ${e.descripcion}`, "");
  if (e.guionHablado) lineas.push(`**Guión hablado:** ${e.guionHablado}`, "");
  if (e.textoEnPantalla) lineas.push(`**Texto en pantalla:** ${e.textoEnPantalla}`, "");
  if ((e.promptVisual ?? "").trim()) {
    lineas.push("**Prompt imagen:**", "", (e.promptVisual ?? "").trim(), "");
  }
  if (e.promptVideo) lineas.push("**Prompt video:**", "", e.promptVideo, "");
  return lineas.join("\n").trimEnd();
}

/** Markdown (.md) — mismo contenido, con encabezados/negritas. */
export function formatearKitMarkdown(kit: KitContenido): string {
  const secciones: string[] = [`# ${kit.titulo || "Sin título"}`, ""];
  if (kit.copy.trim()) secciones.push("## Copy", "", kit.copy.trim(), "");
  if (kit.narracion.trim()) secciones.push("## Narración", "", kit.narracion.trim(), "");
  if (kit.escenas.length > 0) {
    secciones.push("## Escenas", "");
    for (const e of kit.escenas) secciones.push(formatearEscenaMarkdown(e), "");
  }
  if (kit.hashtags.trim()) secciones.push("## Hashtags", "", kit.hashtags.trim(), "");
  if (kit.cta.trim()) secciones.push("## CTA", "", kit.cta.trim(), "");
  if (kit.miniatura.trim()) secciones.push("## Miniatura", "", kit.miniatura.trim(), "");
  return `${secciones.join("\n").trim()}\n`;
}

/** Nombre de archivo seguro a partir del título — sin caracteres inválidos
 * en Windows/Mac/Linux, recortado para no producir nombres absurdos. */
export function nombreArchivoDesdeTitulo(titulo: string, extension: string): string {
  const base = (titulo || "kit-de-produccion")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "kit-de-produccion"}.${extension}`;
}

/** Dispara la descarga de un archivo de texto en el navegador — sin
 * backend, sin dependencias nuevas (Blob + <a download> es API estándar). */
export function descargarArchivoTexto(nombre: string, contenido: string, tipoMime: string): void {
  const blob = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
