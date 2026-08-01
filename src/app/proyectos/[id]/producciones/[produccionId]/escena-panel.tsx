"use client";

import { useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { SeccionColapsable } from "@/components/seccion-colapsable";
import { EstadoProduccionSelect } from "@/components/estado-produccion-badge";
import { explicarError } from "@/lib/errores";
import { TIPOS_ESCENA_STORYBOARD } from "@/lib/types";
import type { Activo, Personaje, Plano, StoryboardEscenaConPersonajes } from "@/lib/types";

const ETIQUETAS_TIPO_ESCENA: Record<string, string> = {
  GANCHO: "Gancho",
  PROBLEMA: "Problema",
  DESCUBRIMIENTO: "Descubrimiento",
  SOLUCION: "Solución",
  CTA: "CTA",
  BROLL: "B-roll",
  TRANSICION: "Transición",
  OTRA: "Otra",
};

/**
 * Panel lateral (no modal) para crear/editar una escena — siempre opera
 * sobre una escena ya persistida (las escenas nuevas nacen en blanco desde
 * el botón "+ Nueva escena" y se completan acá). Mismo componente para
 * cualquier escena de la grilla.
 */
export function EscenaPanel({
  escena,
  planos,
  locaciones,
  personajes,
  onClose,
  onSave,
  onEstadoChange,
}: {
  escena: StoryboardEscenaConPersonajes;
  planos: Plano[];
  locaciones: Activo[];
  personajes: Personaje[];
  onClose: () => void;
  onSave: (escenaId: string, formData: FormData) => Promise<void>;
  onEstadoChange: (escenaId: string, estado: string) => Promise<void>;
}) {
  const [tipoEscena, setTipoEscena] = useState(escena.tipoEscena);
  const [personajeIds, setPersonajeIds] = useState<string[]>(escena.personajeIds);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function togglePersonaje(id: string) {
    setPersonajeIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[440px] flex-col overflow-y-auto bg-bg p-5 shadow-[var(--shadow-card)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-normal tracking-wide">Escena {escena.numero}</span>
            <EstadoProduccionSelect escenaId={escena.id} estado={escena.estadoProduccion} onChange={onEstadoChange} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-text-muted hover:bg-surface-2 hover:text-text"
          >
            ✕
          </button>
        </div>

        <form
          action={async (formData) => {
            setGuardando(true);
            setError("");
            try {
              await onSave(escena.id, formData);
              onClose();
            } catch (e) {
              setError(explicarError(e));
              setGuardando(false);
            }
          }}
          className="space-y-3"
        >
          <input type="hidden" name="tipoEscena" value={tipoEscena} />
          {personajeIds.map((id) => (
            <input key={id} type="hidden" name="personajeIds" value={id} />
          ))}

          <SeccionColapsable titulo="Narrativa" tieneContenido={false}>
            <Label>Tipo de escena</Label>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_ESCENA_STORYBOARD.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setTipoEscena(valor)}
                  className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                    tipoEscena === valor
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border text-text-muted hover:text-text"
                  }`}
                >
                  {ETIQUETAS_TIPO_ESCENA[valor] ?? valor}
                </button>
              ))}
            </div>
            <Label htmlFor="objetivoNarrativo">Objetivo narrativo</Label>
            <Textarea id="objetivoNarrativo" name="objetivoNarrativo" defaultValue={escena.objetivoNarrativo} />
            <Label htmlFor="emocion">Emoción</Label>
            <Input id="emocion" name="emocion" defaultValue={escena.emocion} />
            <Label htmlFor="valorEspectador">Valor para el espectador</Label>
            <Input id="valorEspectador" name="valorEspectador" defaultValue={escena.valorEspectador} />
            <Label htmlFor="textoHablado">Texto hablado</Label>
            <Textarea id="textoHablado" name="textoHablado" defaultValue={escena.textoHablado} />
            <Label htmlFor="textoPantalla">Texto en pantalla</Label>
            <Textarea id="textoPantalla" name="textoPantalla" defaultValue={escena.textoPantalla} />
          </SeccionColapsable>

          <SeccionColapsable titulo="Producción" tieneContenido={false}>
            <Label htmlFor="planoId">Plano</Label>
            <select
              id="planoId"
              name="planoId"
              defaultValue={escena.planoId ?? ""}
              className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text"
            >
              <option value="">Sin asignar</option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <Label htmlFor="locacionId">Locación</Label>
            <select
              id="locacionId"
              name="locacionId"
              defaultValue={escena.locacionId ?? ""}
              className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text"
            >
              <option value="">Sin asignar</option>
              {locaciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            {personajes.length > 0 ? (
              <>
                <Label>Personajes</Label>
                <div className="space-y-1 rounded-lg border border-border bg-surface px-3 py-2">
                  {personajes.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-[12.5px] text-text">
                      <input
                        type="checkbox"
                        checked={personajeIds.includes(p.id)}
                        onChange={() => togglePersonaje(p.id)}
                      />
                      {p.nombre || "Personaje sin nombre"}
                    </label>
                  ))}
                </div>
              </>
            ) : null}
            <Label htmlFor="movimientoCamara">Movimiento de cámara</Label>
            <Input id="movimientoCamara" name="movimientoCamara" defaultValue={escena.movimientoCamara} />
            <Label htmlFor="duracionSegundos">Duración (segundos)</Label>
            <Input
              id="duracionSegundos"
              name="duracionSegundos"
              type="number"
              min={0}
              defaultValue={escena.duracionSegundos}
            />
          </SeccionColapsable>

          <SeccionColapsable titulo="Recursos" tieneContenido={true}>
            <Label htmlFor="recursosNecesarios">Recursos necesarios</Label>
            <Textarea id="recursosNecesarios" name="recursosNecesarios" defaultValue={escena.recursosNecesarios} />
            <Label htmlFor="musica">Música</Label>
            <Input id="musica" name="musica" defaultValue={escena.musica} />
            <Label htmlFor="transicion">Transición</Label>
            <Input id="transicion" name="transicion" defaultValue={escena.transicion} />
          </SeccionColapsable>

          <SeccionColapsable titulo="IA" tieneContenido={true}>
            <Label htmlFor="promptIa">Prompt IA (imagen)</Label>
            <Textarea id="promptIa" name="promptIa" defaultValue={escena.promptIa} />
            <Label htmlFor="promptVideoIa">Prompt IA (video)</Label>
            <Textarea id="promptVideoIa" name="promptVideoIa" defaultValue={escena.promptVideoIa} />
          </SeccionColapsable>

          <SeccionColapsable titulo="Notas" tieneContenido={true}>
            <Textarea name="notas" defaultValue={escena.notas} placeholder="Notas libres sobre esta escena" />
          </SeccionColapsable>

          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
