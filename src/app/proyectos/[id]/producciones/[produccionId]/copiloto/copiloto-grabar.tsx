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
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

/** Fila del checklist "Antes de grabar" — puro texto derivado de `escena`,
 * no un control editable (los controles reales viven detrás de "Ver
 * detalles"). ✔ si está resuelto, ⚠ si falta — UX-MIGRATION-4B: cada fila
 * responde únicamente "¿qué necesito preparar?", nunca se mezcla con la
 * edición. */
function FilaChecklist({ resuelto, etiqueta, valor }: { resuelto: boolean; etiqueta: string; valor: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-[14px] ${resuelto ? "text-text" : "text-accent"}`}>
      <span aria-hidden>{resuelto ? "✔" : "⚠"}</span>
      {resuelto ? valor : `Falta ${etiqueta}`}
    </p>
  );
}

/** Nivel 1 + Nivel 2 de UX-PREP-4B.1, con la redacción de UX-MIGRATION-4B:
 * "Usa un {plano}." es la instrucción; `recomendacionBase` (sin IA) es el
 * porqué. "Explicar esta recomendación" es la única forma de disparar IA
 * acá — nunca se llama sola, nunca al abrir la escena. */
function RecomendacionPlano({
  planoNombre,
  recomendacionBase,
  onExplicar,
}: {
  planoNombre: string;
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
    <div>
      <p className="text-[15px] text-text">Usa un {planoNombre.toLowerCase()}.</p>
      <p className="mt-1 text-[13px] text-text-muted">{recomendacionBase}</p>
      {!explicacion ? (
        <button
          type="button"
          onClick={explicar}
          disabled={cargando}
          className="mt-2 text-[12.5px] text-accent underline hover:text-accent/80"
        >
          {cargando ? "Pensando…" : "Explicar esta recomendación"}
        </button>
      ) : (
        <p className="mt-2 text-[13.5px] text-text">{explicacion}</p>
      )}
      {error ? <p className="mt-1 text-[12.5px] text-danger">{error}</p> : null}
    </div>
  );
}

/**
 * Pantalla de grabación del Copiloto — reorganizada en UX-MIGRATION-4B
 * para dejar de leerse como una ficha técnica y empezar a comportarse
 * como un director de grabación: cada elemento visible responde una de
 * cinco preguntas (¿Qué grabo? ¿Qué digo? ¿Qué necesito? ¿Cómo lo hago
 * mejor? ¿Ya terminé?), en ese orden, sin labels ni selects a la vista.
 * Todo lo que no responde ninguna de esas cinco preguntas vive detrás de
 * "Ver detalles" — mismos campos, misma acción de guardado
 * (`updateStoryboardEscena` vía `onSave`) y el mismo cambio de estado
 * (`onEstadoChange`) que ya existían; esta migración es exclusivamente de
 * jerarquía visual y comportamiento, nunca de rutas, lógica ni server
 * actions. `EscenaPanel` (Modo Plan) no se toca. */
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
  // "¿Cómo crearás esta escena?" (pregunta 4 de 5) — decisión puramente de
  // interfaz, no se persiste (no existe ni debe existir una columna para
  // esto): si la escena ya trae algún prompt IA guardado, arranca en "ia"
  // para no esconder contenido existente; si no, arranca sin elegir, y los
  // campos de prompt quedan visualmente colapsados (nunca desmontados, así
  // el <form> nunca pierde su valor) hasta que el usuario elige "Necesito
  // IA".
  const [modoCreacion, setModoCreacion] = useState<"manual" | "ia" | null>(
    escena.promptIa.trim() || escena.promptVideoIa.trim() ? "ia" : null,
  );
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const indice = escenas.findIndex((e) => e.id === escena.id);
  const planoActual = planos.find((p) => p.id === escena.planoId);
  const locacionActual = locaciones.find((a) => a.id === escena.locacionId);
  const recomendacionBase = planoActual ? recomendacionBaseParaPlano(planoActual.nombre) : null;

  function togglePersonaje(id: string) {
    setPersonajeIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-4">
      {/* 1. Qué vas a grabar — instrucción, no ficha de datos. */}
      <Card>
        <p className="text-[13px] font-medium text-accent">
          Escena {indice + 1} de {escenas.length}
        </p>
        <p className="mt-1 text-[12.5px] text-text-muted">
          {escena.duracionSegundos > 0 ? `Duración estimada: ${formatoDuracion(escena.duracionSegundos)}` : "Duración pendiente"}
        </p>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-text-muted">Objetivo</p>
        <p className="mt-1 text-[18px] leading-snug text-text">
          {escena.objetivoNarrativo || "Sin objetivo narrativo todavía."}
        </p>
      </Card>

      {/* Navegación entre escenas — deliberadamente chica y separada del
          flujo "qué hacer con ESTA escena", para que el botón final siga
          siendo lo último y más dominante de la pantalla. */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-[12.5px] text-text-muted">
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

      {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

      <form
        action={async (formData) => {
          setProcesando(true);
          setError("");
          try {
            await onSave(escena.id, formData);
            await onEstadoChange(escena.id, "GRABADA");
            router.push(`${base}/copiloto`);
          } catch (e) {
            setError(explicarError(e));
            setProcesando(false);
          }
        }}
        className="space-y-4"
      >
        <input type="hidden" name="tipoEscena" value={tipoEscena} />
        {personajeIds.map((id) => (
          <input key={id} type="hidden" name="personajeIds" value={id} />
        ))}

        {/* 2. Qué debes decir — el libreto, no un textarea de formulario. */}
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Guion</p>
          <textarea
            id="textoHablado"
            name="textoHablado"
            defaultValue={escena.textoHablado}
            placeholder="Lo que vas a decir frente a cámara..."
            className="mt-2 min-h-[130px] w-full resize-none border-none bg-transparent p-0 font-display text-[19px] leading-relaxed text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-0"
          />
        </Card>

        {/* 3. Qué necesitas preparar — checklist resumido, no tres selects. */}
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Antes de grabar</p>
          <div className="mt-2 space-y-1.5">
            <FilaChecklist resuelto={!!planoActual} etiqueta="elegir plano" valor={planoActual?.nombre ?? ""} />
            <FilaChecklist
              resuelto={!!locacionActual}
              etiqueta="elegir locación"
              valor={locacionActual?.nombre ?? ""}
            />
            {personajes.length > 0 ? (
              <FilaChecklist
                resuelto={personajeIds.length > 0}
                etiqueta="elegir personajes"
                valor={personajeIds
                  .map((id) => personajes.find((p) => p.id === id)?.nombre)
                  .filter(Boolean)
                  .join(", ")}
              />
            ) : null}
            <FilaChecklist
              resuelto={escena.duracionSegundos > 0}
              etiqueta="estimar duración"
              valor={`Duración estimada: ${formatoDuracion(escena.duracionSegundos)}`}
            />
          </div>
        </Card>

        {/* 4. Cómo recomiendo grabarla — Nivel 1 (sin IA) siempre visible;
            Nivel 2 (IA) solo bajo demanda, ver RecomendacionPlano. */}
        {recomendacionBase && planoActual ? (
          <Card>
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Recomendación</p>
            <div className="mt-2">
              <RecomendacionPlano
                planoNombre={planoActual.nombre}
                recomendacionBase={recomendacionBase}
                onExplicar={() =>
                  onExplicarRecomendacion({
                    recomendacionBase,
                    tipo: tipoEscena,
                    objetivoNarrativo: escena.objetivoNarrativo,
                    textoHablado: escena.textoHablado,
                    textoPantalla: escena.textoPantalla,
                    planoNombre: planoActual.nombre,
                    locacionNombre: locacionActual?.nombre ?? "",
                    personajesNombres: personajeIds
                      .map((id) => personajes.find((p) => p.id === id)?.nombre)
                      .filter((n): n is string => Boolean(n)),
                  })
                }
              />
            </div>
          </Card>
        ) : null}

        {/* 5. ¿Necesitas IA para esta escena? — se pregunta primero; los
            prompts nunca aparecen vacíos sin que el usuario haya elegido
            "Necesito IA". Los campos quedan siempre montados (igual que
            `SeccionColapsable`) para que el <form> nunca pierda su valor
            al alternar la elección — solo cambia si son visibles. */}
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">¿Cómo crearás esta escena?</p>
          <div className="mt-2 space-y-1.5">
            <label className="flex items-center gap-2 text-[14.5px] text-text">
              <input
                type="radio"
                name="modoCreacion"
                checked={modoCreacion === "manual"}
                onChange={() => setModoCreacion("manual")}
              />
              La grabaré yo.
            </label>
            <label className="flex items-center gap-2 text-[14.5px] text-text">
              <input
                type="radio"
                name="modoCreacion"
                checked={modoCreacion === "ia"}
                onChange={() => setModoCreacion("ia")}
              />
              Necesito IA.
            </label>
          </div>
          <div
            className="overflow-hidden transition-[max-height] duration-300 ease-out"
            style={{ maxHeight: modoCreacion === "ia" ? "1000px" : "0px" }}
          >
            <div className="mt-4 space-y-1 border-t border-border pt-4">
              <Label htmlFor="promptIa">Generar prompt de imagen</Label>
              <Textarea id="promptIa" name="promptIa" defaultValue={escena.promptIa} />
              <Label htmlFor="promptVideoIa">Generar prompt de video</Label>
              <Textarea id="promptVideoIa" name="promptVideoIa" defaultValue={escena.promptVideoIa} />
            </div>
          </div>
        </Card>

        {/* Todo lo que no responde ninguna de las 5 preguntas — incluye los
            controles reales de edición de Plano/Locación/Personajes que el
            checklist de arriba solo resume. Un único "Ver detalles", no
            tres acordeones separados (eso ya se sentía como formulario). */}
        <SeccionColapsable titulo="Ver detalles" tieneContenido={true}>
          <Label>Estado de la producción</Label>
          <EstadoProduccionSelect escenaId={escena.id} estado={escena.estadoProduccion} onChange={onEstadoChange} />

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

          <Label htmlFor="textoPantalla">Texto en pantalla</Label>
          <Textarea id="textoPantalla" name="textoPantalla" defaultValue={escena.textoPantalla} />
          <Label htmlFor="musica">Música</Label>
          <Input id="musica" name="musica" defaultValue={escena.musica} />
          <Label htmlFor="transicion">Transición</Label>
          <Input id="transicion" name="transicion" defaultValue={escena.transicion} />
          <Label htmlFor="notas">Notas</Label>
          <Textarea name="notas" defaultValue={escena.notas} placeholder="Notas libres sobre esta escena" />
        </SeccionColapsable>

        {/* 6. Acción final — un solo botón dominante, nada debajo. Guarda
            todo lo editado y avanza sola a la siguiente escena, mismas dos
            server actions de siempre (onSave + onEstadoChange), ahora en
            un solo paso para el usuario en vez de dos. */}
        <Button type="submit" disabled={procesando} className="w-full justify-center py-4 text-[15px]">
          {procesando ? "Guardando…" : "Marcar escena como grabada"}
        </Button>
      </form>
    </div>
  );
}
