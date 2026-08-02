"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { SeccionColapsable } from "@/components/seccion-colapsable";
import { EstadoProduccionSelect } from "@/components/estado-produccion-badge";
import { explicarError } from "@/lib/errores";
import { recomendacionBaseParaPlano } from "@/lib/recomendaciones-audiovisuales";
import { TIPOS_ESCENA_STORYBOARD } from "@/lib/types";
import type { Activo, Personaje, Plano, StoryboardEscenaConPersonajes } from "@/lib/types";
import type { ExplicarRecomendacionInput } from "@/lib/ai";

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

function formatoDuracion(segundos: number) {
  if (segundos <= 0) return "Duración pendiente";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

/** Fila del resumen "Necesitás" — puro texto derivado de `escena`, no un
 * control editable (los controles reales siguen viviendo en la sección
 * "Dónde y con quién", más abajo). ✔ si está resuelto, ⚠ si falta. */
function FilaResumen({ resuelto, etiqueta, valor }: { resuelto: boolean; etiqueta: string; valor: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] ${resuelto ? "text-success" : "text-accent"}`}>
      <span aria-hidden>{resuelto ? "✔" : "⚠"}</span>
      {resuelto ? valor : `Falta ${etiqueta}`}
    </span>
  );
}

/** Nivel 1 + Nivel 2 de UX-PREP-4B.1 — `recomendacionBase` ya viene
 * resuelta sin IA (recomendaciones-audiovisuales.ts), visible apenas se
 * abre la escena. "Explicar esta recomendación" es la única forma de
 * disparar IA acá — nunca se llama sola. */
function RecomendacionPlano({
  recomendacionBase,
  onExplicar,
}: {
  recomendacionBase: string;
  onExplicar: () => Promise<string>;
}) {
  const [explicacion, setExplicacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function explicar() {
    setCargando(true);
    setError("");
    try {
      setExplicacion(await onExplicar());
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="w-full text-[12px] text-text-muted">
      <span>{recomendacionBase}</span>{" "}
      {!explicacion ? (
        <button
          type="button"
          onClick={explicar}
          disabled={cargando}
          className="text-accent underline hover:text-accent/80"
        >
          {cargando ? "Pensando…" : "Explicar esta recomendación"}
        </button>
      ) : null}
      {explicacion ? <p className="mt-1 text-[12.5px] text-text">{explicacion}</p> : null}
      {error ? <p className="mt-1 text-danger">{error}</p> : null}
    </div>
  );
}

/**
 * Pantalla de grabación del Copiloto (UX Migration 3, jerarquía visual
 * rediseñada en UX-MIGRATION-3D) — mismos campos y la misma acción de
 * guardado que `EscenaPanel` (Modo Plan), pero con identidad visual
 * propia: un encabezado que domina la pantalla, un resumen de contexto de
 * solo lectura, el guion como contenido principal, la ayuda de IA
 * separada del resto del formulario, y todo lo demás colapsado como
 * secundario. La auditoría de UX-MIGRATION-3C confirmó que la versión
 * anterior reutilizaba el mismo lenguaje visual de `EscenaPanel` sin
 * diferenciación — acá se reutilizan los mismos componentes de UI
 * (`Label`, `Input`, `Textarea`, `SeccionColapsable`) pero NUNCA con el
 * mismo peso visual entre sí; `EscenaPanel` no se toca — esta sigue
 * siendo una pantalla adicional, no un reemplazo, para no afectar Modo
 * Plan. */
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
  onExplicarRecomendacion,
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
  onExplicarRecomendacion: (input: ExplicarRecomendacionInput) => Promise<string>;
}) {
  const router = useRouter();
  const base = `/proyectos/${proyectoId}/producciones/${produccionId}`;
  const [tipoEscena, setTipoEscena] = useState(escena.tipoEscena);
  const [personajeIds, setPersonajeIds] = useState<string[]>(escena.personajeIds);
  const [guardando, setGuardando] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [error, setError] = useState("");

  const indice = escenas.findIndex((e) => e.id === escena.id);
  const planoActual = planos.find((p) => p.id === escena.planoId);
  const locacionActual = locaciones.find((a) => a.id === escena.locacionId);
  const recomendacionBase = planoActual ? recomendacionBaseParaPlano(planoActual.nombre) : null;

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
      {/* Encabezado dominante — el elemento más grande e importante de
          toda la pantalla, siempre visible, nunca colapsado. */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[26px] font-normal tracking-wide text-text sm:text-[30px]">
              Ahora toca grabar
            </p>
            <p className="mt-1.5 text-[15px] font-medium text-accent">
              Escena {indice + 1} de {escenas.length}
            </p>
            {escena.objetivoNarrativo ? (
              <p className="mt-2 text-[14px] text-text-muted">{escena.objetivoNarrativo}</p>
            ) : null}
            <p className="mt-2 text-[12.5px] text-text-muted">{formatoDuracion(escena.duracionSegundos)}</p>
          </div>
          <EstadoProduccionSelect escenaId={escena.id} estado={escena.estadoProduccion} onChange={onEstadoChange} />
        </div>
      </Card>

      {/* Resumen "Necesitás" — de solo lectura, no son inputs. Los
          controles reales están en "Dónde y con quién", más abajo. La
          fila de Personajes solo aparece si el Proyecto tiene al menos
          uno definido — si no hay ninguno, no hay nada que marcar como
          faltante (UX-MIGRATION-3C, Causa B). */}
      <Card className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="w-full text-[11px] font-medium uppercase tracking-wide text-text-muted">Necesitás</p>
        <FilaResumen resuelto={!!planoActual} etiqueta="Plano" valor={planoActual?.nombre ?? ""} />
        {recomendacionBase ? (
          <RecomendacionPlano
            recomendacionBase={recomendacionBase}
            onExplicar={() =>
              onExplicarRecomendacion({
                recomendacionBase,
                tipo: tipoEscena,
                objetivoNarrativo: escena.objetivoNarrativo,
                textoHablado: escena.textoHablado,
                textoPantalla: escena.textoPantalla,
                planoNombre: planoActual!.nombre,
                locacionNombre: locacionActual?.nombre ?? "",
                personajesNombres: personajeIds
                  .map((id) => personajes.find((p) => p.id === id)?.nombre)
                  .filter((n): n is string => Boolean(n)),
              })
            }
          />
        ) : null}
        <FilaResumen resuelto={!!locacionActual} etiqueta="Locación" valor={locacionActual?.nombre ?? ""} />
        {personajes.length > 0 ? (
          <FilaResumen
            resuelto={personajeIds.length > 0}
            etiqueta="Personajes"
            valor={personajeIds
              .map((id) => personajes.find((p) => p.id === id)?.nombre)
              .filter(Boolean)
              .join(", ")}
          />
        ) : null}
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
        className="space-y-4"
      >
        <input type="hidden" name="tipoEscena" value={tipoEscena} />
        {personajeIds.map((id) => (
          <input key={id} type="hidden" name="personajeIds" value={id} />
        ))}

        {/* Tu guion — el contenido principal de la pantalla, siempre
            visible, nunca dentro de un acordeón. */}
        <Card>
          <Label htmlFor="textoHablado">Tu guion para esta escena</Label>
          <Textarea
            id="textoHablado"
            name="textoHablado"
            defaultValue={escena.textoHablado}
            className="min-h-[140px] text-[16px]"
            placeholder="Lo que vas a decir frente a cámara..."
          />
        </Card>

        {/* Ayuda de IA — visible, pero claramente separada del resto del
            formulario (fondo e borde propios, no `Card`, para no
            depender del orden de las clases de Tailwind): es apoyo para
            producir, no un campo obligatorio. */}
        <div className="rounded-2xl border border-dashed border-accent/30 bg-accent-soft p-5 sm:p-6">
          <p className="text-[12.5px] font-medium text-text">Ayuda para generar con IA</p>
          <p className="mt-0.5 text-[11.5px] text-text-muted">Opcional — solo si vas a apoyarte en imagen o video generados.</p>
          <Label htmlFor="promptIa">Prompt IA (imagen)</Label>
          <Textarea id="promptIa" name="promptIa" defaultValue={escena.promptIa} />
          <Label htmlFor="promptVideoIa">Prompt IA (video)</Label>
          <Textarea id="promptVideoIa" name="promptVideoIa" defaultValue={escena.promptVideoIa} />
        </div>

        <SeccionColapsable titulo="Dónde y con quién" tieneContenido={true}>
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
