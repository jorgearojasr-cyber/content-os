"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
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
 * Pantalla de grabación del Copiloto (UX Migration 3) — mismos campos y la
 * misma acción de guardado que `EscenaPanel` (Modo Plan), pero reagrupados
 * por relevancia durante el rodaje en vez de por tema: "Para grabar" es lo
 * único abierto por default. `EscenaPanel` no se toca — esta es una
 * pantalla adicional, no un reemplazo, para no afectar Modo Plan.
 */
export function CopilotoGrabar({
  proyectoId,
  produccionId,
  escena,
  escenas,
  planos,
  locaciones,
  personajes,
  onSave,
  onEstadoChange,
}: {
  proyectoId: string;
  produccionId: string;
  escena: StoryboardEscenaConPersonajes;
  escenas: StoryboardEscenaConPersonajes[];
  planos: Plano[];
  locaciones: Activo[];
  personajes: Personaje[];
  onSave: (escenaId: string, formData: FormData) => Promise<void>;
  onEstadoChange: (escenaId: string, estado: string) => Promise<void>;
}) {
  const router = useRouter();
  const base = `/proyectos/${proyectoId}/producciones/${produccionId}`;
  const [tipoEscena, setTipoEscena] = useState(escena.tipoEscena);
  const [personajeIds, setPersonajeIds] = useState<string[]>(escena.personajeIds);
  const [guardando, setGuardando] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [error, setError] = useState("");

  const indice = escenas.findIndex((e) => e.id === escena.id);

  function togglePersonaje(id: string) {
    setPersonajeIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function marcarComoGrabada() {
    setMarcando(true);
    setError("");
    try {
      await onEstadoChange(escena.id, "GRABADA");
      router.push(`${base}/copiloto`);
    } catch (e) {
      setError(explicarError(e));
      setMarcando(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
              Escena {indice + 1} de {escenas.length}
            </p>
            <p className="mt-1 font-display text-lg font-normal tracking-wide text-text">
              {escena.objetivoNarrativo || `Escena ${escena.numero}`}
            </p>
          </div>
          <EstadoProduccionSelect escenaId={escena.id} estado={escena.estadoProduccion} onChange={onEstadoChange} />
        </div>
      </Card>

      {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

      <form
        action={async (formData) => {
          setGuardando(true);
          setError("");
          try {
            await onSave(escena.id, formData);
          } catch (e) {
            setError(explicarError(e));
          } finally {
            setGuardando(false);
          }
        }}
        className="space-y-3"
      >
        <input type="hidden" name="tipoEscena" value={tipoEscena} />
        {personajeIds.map((id) => (
          <input key={id} type="hidden" name="personajeIds" value={id} />
        ))}

        <SeccionColapsable titulo="Para grabar" tieneContenido={false}>
          <Label htmlFor="textoHablado">Texto hablado</Label>
          <Textarea id="textoHablado" name="textoHablado" defaultValue={escena.textoHablado} />
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
          <Label htmlFor="recursosNecesarios">Recursos necesarios</Label>
          <Textarea id="recursosNecesarios" name="recursosNecesarios" defaultValue={escena.recursosNecesarios} />
          <Label htmlFor="promptIa">Prompt IA (imagen)</Label>
          <Textarea id="promptIa" name="promptIa" defaultValue={escena.promptIa} />
          <Label htmlFor="promptVideoIa">Prompt IA (video)</Label>
          <Textarea id="promptVideoIa" name="promptVideoIa" defaultValue={escena.promptVideoIa} />
        </SeccionColapsable>

        <SeccionColapsable titulo="Planificación" tieneContenido={true}>
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
          <Label htmlFor="duracionSegundos">Duración (segundos)</Label>
          <Input
            id="duracionSegundos"
            name="duracionSegundos"
            type="number"
            min={0}
            defaultValue={escena.duracionSegundos}
          />
        </SeccionColapsable>

        <SeccionColapsable titulo="Post-producción" tieneContenido={true}>
          <Label htmlFor="textoPantalla">Texto en pantalla</Label>
          <Textarea id="textoPantalla" name="textoPantalla" defaultValue={escena.textoPantalla} />
          <Label htmlFor="musica">Música</Label>
          <Input id="musica" name="musica" defaultValue={escena.musica} />
          <Label htmlFor="transicion">Transición</Label>
          <Input id="transicion" name="transicion" defaultValue={escena.transicion} />
          <Label htmlFor="notas">Notas</Label>
          <Textarea name="notas" defaultValue={escena.notas} placeholder="Notas libres sobre esta escena" />
        </SeccionColapsable>

        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-text-muted">
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) router.push(`${base}/copiloto/${e.target.value}`);
            }}
            className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12.5px] text-text"
          >
            <option value="">Elegir otra escena…</option>
            {escenas.map((e) => (
              <option key={e.id} value={e.id}>
                #{e.numero} — {e.objetivoNarrativo || "Sin objetivo todavía"}
              </option>
            ))}
          </select>
          <Link href={base} className="hover:text-accent">
            Ver todas las escenas
          </Link>
        </div>
        <Button type="button" onClick={marcarComoGrabada} disabled={marcando}>
          {marcando ? "Marcando…" : "✓ Marcar como grabada"}
        </Button>
      </Card>
    </div>
  );
}
