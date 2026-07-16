"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { explicarError } from "@/lib/errores";
import type { CalidadImagen, Escena } from "@/lib/types";

const OPCIONES_CALIDAD: { value: CalidadImagen; label: string }[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

/** Mismo patrón de cronómetro que ya existe en Crear mientras se genera
 * contenido — se monta desde cero cada vez, así arranca en 0 sin depender
 * de un efecto que resetee estado. */
function Cronometro() {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-[11.5px] text-text-muted">{segundos}s</span>;
}

/**
 * Botón "Generar imagen" por escena — real, con IA (OpenAI), no un prompt
 * más para copiar. Cada escena genera la suya por separado; no existe (a
 * propósito) un botón para generar todas de una vez, porque cada imagen
 * cuesta dinero real por unidad.
 */
function GenerarImagenControl({
  escena,
  onGenerarImagen,
  onImagenLista,
}: {
  escena: Escena;
  onGenerarImagen: (numeroEscena: number, calidad: CalidadImagen) => Promise<string>;
  onImagenLista: (url: string) => void;
}) {
  const [calidad, setCalidad] = useState<CalidadImagen>("medium");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  async function generar() {
    if (!escena.promptImagen.trim()) return;
    setGenerando(true);
    setError("");
    try {
      const url = await onGenerarImagen(escena.numero, calidad);
      onImagenLista(url);
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="mt-2">
      {escena.imagenGeneradaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={escena.imagenGeneradaUrl}
          alt={`Imagen generada — Escena ${escena.numero}`}
          className="mb-2 h-40 w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={calidad}
          onChange={(ev) => setCalidad(ev.target.value as CalidadImagen)}
          disabled={generando}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[12px] text-text"
        >
          {OPCIONES_CALIDAD.map((o) => (
            <option key={o.value} value={o.value}>
              Calidad: {o.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          className="px-3 py-1.5 text-[12.5px]"
          disabled={generando || !escena.promptImagen.trim()}
          onClick={generar}
        >
          {generando ? "Generando…" : escena.imagenGeneradaUrl ? "🎨 Regenerar imagen" : "🎨 Generar imagen"}
        </Button>
        {generando ? <Cronometro /> : null}
      </div>
      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

/**
 * Editor de escenas por tarjeta — el mismo componente que se usa en la
 * pestaña "Escenas" al generar contenido y al editar manualmente un bloque
 * ya guardado en Biblioteca. `escenas` es la unidad estructural universal
 * (video/carrusel/imagen), así que no todos los campos aplican siempre —
 * cada uno se oculta si ninguna escena trae contenido real ahí.
 */
export function EscenasEditor({
  escenas,
  onChange,
  onGenerarImagen,
}: {
  escenas: Escena[];
  onChange: (escenas: Escena[]) => void;
  /** Genera la imagen real de una escena y devuelve su URL final. Opcional
   * a propósito: solo existe dónde persistir el resultado cuando la pieza
   * ya está guardada en Biblioteca (tiene bloqueId) — mientras se está
   * revisando algo recién generado en Crear, todavía sin guardar, no hay
   * dónde guardar la imagen, así que el botón simplemente no aparece ahí. */
  onGenerarImagen?: (numeroEscena: number, calidad: CalidadImagen) => Promise<string>;
}) {
  function updateEscena<K extends keyof Escena>(index: number, campo: K, valor: Escena[K]) {
    onChange(escenas.map((e, i) => (i === index ? { ...e, [campo]: valor } : e)));
  }

  const mostrarDuracion = escenas.some((e) => e.duracionSegundos > 0);
  const mostrarGuion = escenas.some((e) => e.guionHablado.trim());
  const mostrarPromptVideo = escenas.some((e) => e.promptVideo.trim());

  return (
    <div className="space-y-4">
      {escenas.map((e, i) => (
        <div key={e.numero} className="rounded-xl border border-border bg-surface-2 p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-[14px]">
              {escenas.length > 1 ? `Escena ${e.numero}` : "Contenido"}
            </p>
            {mostrarDuracion ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-muted">Duración (s)</span>
                <input
                  type="number"
                  min={0}
                  value={e.duracionSegundos}
                  onChange={(ev) => updateEscena(i, "duracionSegundos", Number(ev.target.value))}
                  className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-[13px] text-text"
                />
              </div>
            ) : null}
          </div>
          <Label>Descripción</Label>
          <Textarea
            value={e.descripcion}
            onChange={(ev) => updateEscena(i, "descripcion", ev.target.value)}
            className="min-h-[60px]"
          />
          {mostrarGuion ? (
            <>
              <Label>Guión hablado</Label>
              <Textarea
                value={e.guionHablado}
                onChange={(ev) => updateEscena(i, "guionHablado", ev.target.value)}
                className="min-h-[60px]"
              />
            </>
          ) : null}
          <Label>Texto en pantalla</Label>
          <Input
            value={e.textoEnPantalla}
            onChange={(ev) => updateEscena(i, "textoEnPantalla", ev.target.value)}
          />
          <Label>Prompt imagen</Label>
          <Textarea
            value={e.promptImagen}
            onChange={(ev) => updateEscena(i, "promptImagen", ev.target.value)}
            className="min-h-[60px]"
          />
          {onGenerarImagen ? (
            <GenerarImagenControl
              escena={e}
              onGenerarImagen={onGenerarImagen}
              onImagenLista={(url) => updateEscena(i, "imagenGeneradaUrl", url)}
            />
          ) : null}
          {mostrarPromptVideo ? (
            <>
              <Label>Prompt video</Label>
              <Textarea
                value={e.promptVideo}
                onChange={(ev) => updateEscena(i, "promptVideo", ev.target.value)}
                className="min-h-[60px]"
              />
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
