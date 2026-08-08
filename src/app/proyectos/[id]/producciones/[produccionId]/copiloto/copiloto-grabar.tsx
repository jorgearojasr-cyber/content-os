"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { SeccionColapsable } from "@/components/seccion-colapsable";
import { EstadoProduccionSelect } from "@/components/estado-produccion-badge";
import { explicarError } from "@/lib/errores";
import { emocionSugeridaParaTipo, movimientoSugeridoParaPlano } from "@/lib/decision-engine";
import { promptImagenSugerido, promptVideoSugerido } from "@/lib/escena-prompt-compiler";
import { recomendacionBaseParaPlano } from "@/lib/recomendaciones-audiovisuales";
import { buscarEscenaOriginalCpp } from "@/lib/creator-os-package";
import type { AnalisisDirectorCreativo, HallazgosAgrupadosPorPrioridad } from "@/lib/director-creativo";
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

function formatoDuracion(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

/** Fila del checklist "Antes de grabar" — puro texto derivado de `escena`,
 * no un control editable (los controles reales viven detrás de "Ver
 * detalles"). ✔ si está resuelto, ⚠ si falta — UX-MIGRATION-4B: cada fila
 * responde únicamente "¿qué necesito preparar?", nunca se mezcla con la
 * edición.
 *
 * `nota` (PHASE-2-IMPLEMENTACION-3B, diseño congelado en PHASE-2-COPILOTO-
 * UX-DESIGN): cuando el Director Creativo tiene algo que decir sobre este
 * mismo campo, se adjunta acá — nunca en una tarjeta aparte. Es la regla
 * congelada "un único lugar de resolución por recomendación". */
function FilaChecklist({
  resuelto,
  etiqueta,
  valor,
  nota,
}: {
  resuelto: boolean;
  etiqueta: string;
  valor: string;
  nota?: { texto: string; etiquetaAccion: string; onAccion: () => void };
}) {
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-[14px] ${resuelto ? "text-text" : "text-accent"}`}>
        <span aria-hidden>{resuelto ? "✔" : "⚠"}</span>
        {resuelto ? valor : `Falta ${etiqueta}`}
      </p>
      {nota ? (
        <p className="ml-5 mt-0.5 border-l-2 border-l-accent-soft pl-2 text-[12px] text-text-muted">
          {nota.texto}{" "}
          <button
            type="button"
            onClick={nota.onAccion}
            className="font-medium text-accent-hover underline hover:no-underline"
          >
            {nota.etiquetaAccion}
          </button>
        </p>
      ) : null}
    </div>
  );
}

/** Nivel Sugerido del Decision Engine (PRODUCT-ARCHITECTURE) — a diferencia
 * de una sugerencia Automática (se pre-llena sola, ver Movimiento de
 * cámara), esta requiere una acción explícita del usuario para aceptarse:
 * nunca se escribe en el campo hasta que se hace clic en "usar". */
function SugerenciaCampo({ sugerencia, onUsar }: { sugerencia: string; onUsar: () => void }) {
  return (
    <p className="mt-1 text-[12px] text-text-muted">
      💡 Sugerencia: {sugerencia} —{" "}
      <button type="button" onClick={onUsar} className="text-accent underline hover:text-accent/80">
        usar
      </button>
    </p>
  );
}

/** Nivel 1 de UX-PREP-4B.1, con la redacción de UX-MIGRATION-4B: "Usa un
 * {plano}." es la instrucción; `recomendacionBase` (sin IA) es el porqué.
 * ARCHITECTURE-FIX-1: el Nivel 2 (explicación bajo demanda vía IA
 * integrada) se retiró — esta recomendación es puramente heurística,
 * nunca depende de una llamada a IA. */
function RecomendacionPlano({ planoNombre, recomendacionBase }: { planoNombre: string; recomendacionBase: string }) {
  return (
    <div>
      <p className="text-[15px] text-text">Usa un {planoNombre.toLowerCase()}.</p>
      <p className="mt-1 text-[13px] text-text-muted">{recomendacionBase}</p>
    </div>
  );
}

type DestinoHallazgo = { id: string; requiereDetalles: boolean; etiqueta: string };

/** A qué campo de ESTA pantalla conduce cada hallazgo, según su categoría
 * (PHASE-2-IMPLEMENTACION-3B). Esto es routing de UI — no una
 * clasificación del análisis; la clasificación Alta/Media/Baja y
 * Grabar/Editar vive únicamente en `director-creativo.ts`. Duración apunta
 * al campo numérico dentro de "Ver detalles"; el resto de categorías
 * narrativas (Gancho/Ritmo/CTA/Claridad/Otro) apunta al Guion, que ya está
 * siempre a la vista. */
function destinoHallazgo(categoria: AnalisisDirectorCreativo["hallazgos"][number]["categoria"]): DestinoHallazgo {
  if (categoria === "Duración") {
    return { id: "campo-duracion", requiereDetalles: true, etiqueta: "Ir a Duración ↓" };
  }
  return { id: "campo-guion", requiereDetalles: false, etiqueta: "Ver en el guion ↑" };
}

function TarjetaHallazgo({
  hallazgo,
  destacado,
  onIrA,
}: {
  hallazgo: AnalisisDirectorCreativo["hallazgos"][number];
  destacado: boolean;
  onIrA: (id: string, requiereDetalles: boolean) => void;
}) {
  const destino = destinoHallazgo(hallazgo.categoria);
  return (
    <div className="flex gap-2">
      <span aria-hidden className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${destacado ? "bg-danger" : "bg-accent"}`} />
      <div className="min-w-0">
        <p className={`text-[13.5px] text-text ${destacado ? "font-semibold" : "font-normal"}`}>{hallazgo.titulo}</p>
        <p className="mt-0.5 text-[12.5px] text-text-muted">{hallazgo.porQué}</p>
        <p className="mt-1 text-[12.5px] text-text">💡 {hallazgo.sugerencia}</p>
        <button
          type="button"
          onClick={() => onIrA(destino.id, destino.requiereDetalles)}
          className="mt-1.5 text-[11.5px] font-medium text-accent-hover underline hover:no-underline"
        >
          {destino.etiqueta}
        </button>
      </div>
    </div>
  );
}

/** PHASE-2-IMPLEMENTACION-3B (diseño congelado en PHASE-2-COPILOTO-UX-
 * DESIGN): solo lectura de los hallazgos ya filtrados por escena y
 * clasificados por prioridad en `director-creativo.ts` — Alta siempre
 * visible, Media visible con menor peso, Baja detrás de "Ver N sugerencias
 * menores". Ya no muestra `decisionesDeProduccion` (regla congelada: un
 * único lugar de resolución por recomendación — esas decisiones ahora
 * viven en el checklist, ver `FilaChecklist`). No implementa ninguna
 * clasificación acá, solo consume `hallazgosAgrupados` ya armado. */
function OpinionDirectorCreativo({
  hallazgosAgrupados,
  onIrA,
}: {
  hallazgosAgrupados: HallazgosAgrupadosPorPrioridad;
  onIrA: (id: string, requiereDetalles: boolean) => void;
}) {
  const { alta, media, baja } = hallazgosAgrupados;
  if (alta.length === 0 && media.length === 0 && baja.length === 0) return null;

  return (
    <div className="rounded-xl border-y border-r border-border border-l-4 border-l-accent bg-surface p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Director Creativo</p>
      <div className="mt-2 space-y-3">
        {alta.map((h, i) => (
          <TarjetaHallazgo key={`alta-${i}`} hallazgo={h} destacado onIrA={onIrA} />
        ))}
        {media.map((h, i) => (
          <TarjetaHallazgo key={`media-${i}`} hallazgo={h} destacado={false} onIrA={onIrA} />
        ))}
      </div>
      {baja.length > 0 ? (
        <details className="mt-3">
          <summary className="inline-block cursor-pointer rounded-md border border-dashed border-border px-2 py-1 text-[11.5px] text-text-muted marker:content-none [&::-webkit-details-marker]:hidden">
            Ver {baja.length} sugerencia{baja.length > 1 ? "s" : ""} menor{baja.length > 1 ? "es" : ""} ▾
          </summary>
          <div className="mt-2.5 space-y-3 border-t border-border pt-3">
            {baja.map((h, i) => (
              <TarjetaHallazgo key={`baja-${i}`} hallazgo={h} destacado={false} onIrA={onIrA} />
            ))}
          </div>
        </details>
      ) : null}
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
  formato,
  cppOriginal,
  hallazgosAgrupados,
  decisionPersonaje,
  decisionLocacion,
  decisionRecurso,
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
  formato: string;
  cppOriginal: string | null;
  hallazgosAgrupados: HallazgosAgrupadosPorPrioridad;
  decisionPersonaje: AnalisisDirectorCreativo["decisionesDeProduccion"][number] | null;
  decisionLocacion: AnalisisDirectorCreativo["decisionesDeProduccion"][number] | null;
  decisionRecurso: AnalisisDirectorCreativo["decisionesDeProduccion"][number] | null;
  onSave: (escenaId: string, formData: FormData) => Promise<void>;
  onEstadoChange: (escenaId: string, estado: string) => Promise<void>;
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

  // PHASE-2-IMPLEMENTACION-3B: deep-link de una recomendación del Director
  // a su destino real en ESTA pantalla — mismo criterio de scroll+resaltado
  // que ya existe en Revisión (`irAPendienteDeDecision`), adaptado acá para
  // poder apuntar también a un campo dentro de "Ver detalles". `SeccionColapsable`
  // pasa a modo controlado solo para esta instancia (par abierto/onAbiertoChange)
  // — irA() la abre directamente, un simple setState en un manejador de
  // evento, nada de efectos ni refs durante el render.
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [detallesAbiertos, setDetallesAbiertos] = useState(false);

  function irA(idDestino: string, requiereVerDetalles: boolean) {
    if (requiereVerDetalles) setDetallesAbiertos(true);
    const demora = requiereVerDetalles ? 350 : 0;
    setTimeout(() => {
      const el = document.getElementById(idDestino);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setResaltado(idDestino);
      setTimeout(() => setResaltado((actual) => (actual === idDestino ? null : actual)), 2200);
    }, demora);
  }

  function clasesResaltado(idDestino: string) {
    return resaltado === idDestino
      ? "-m-1.5 rounded-lg p-1.5 ring-2 ring-accent transition-shadow duration-300"
      : "-m-1.5 rounded-lg p-1.5 ring-2 ring-transparent transition-shadow duration-300";
  }

  const indice = escenas.findIndex((e) => e.id === escena.id);
  const planoActual = planos.find((p) => p.id === escena.planoId);
  const locacionActual = locaciones.find((a) => a.id === escena.locacionId);
  const recomendacionBase = planoActual ? recomendacionBaseParaPlano(planoActual.nombre) : null;

  // SPRINT_EXECUTION_2: respaldo de solo lectura para "Antes de grabar" —
  // si Plano/Locación/Personajes no tienen vínculo de Biblioteca, cae al
  // nombre crudo que declaró el CPP original, nunca a "Falta elegir X".
  const escenaCpp = useMemo(
    () => buscarEscenaOriginalCpp(cppOriginal, escena.numeroEnAnalisisDirector),
    [cppOriginal, escena.numeroEnAnalisisDirector],
  );
  const planoNombreParaChecklist = planoActual?.nombre ?? escenaCpp?.plano ?? "";
  const locacionNombreParaChecklist = locacionActual?.nombre ?? escenaCpp?.locacion ?? "";
  const personajesNombresParaChecklist =
    personajeIds.length > 0
      ? personajeIds.map((id) => personajes.find((p) => p.id === id)?.nombre).filter(Boolean).join(", ")
      : (escenaCpp?.personajes ?? []).join(", ");

  // Decision Engine — Movimiento de cámara (Automático): el plano ya
  // resuelto es señal suficientemente fuerte como para pre-llenar sin
  // pedir confirmación; solo se calcula si el campo real está vacío, así
  // nunca pisa lo que trajo el CBD o lo que el usuario ya escribió. Estado
  // controlado (UX-MIGRATION — Decision Engine Visual Language) para poder
  // apagar `movimientoEsSugerencia` en cuanto el usuario edita el campo —
  // antes solo existía una leyenda de texto que quedaba pegada aunque el
  // valor ya fuera del usuario.
  const movimientoSugeridoInicial = !escena.movimientoCamara.trim() && planoActual
    ? movimientoSugeridoParaPlano(planoActual.nombre)
    : null;
  const [movimientoCamara, setMovimientoCamara] = useState(escena.movimientoCamara || movimientoSugeridoInicial || "");
  const [movimientoEsSugerencia, setMovimientoEsSugerencia] = useState(!!movimientoSugeridoInicial);

  // Decision Engine (PRODUCT-ARCHITECTURE) — Emoción es Nivel Sugerido:
  // necesita estado controlado porque el botón "usar" de SugerenciaCampo
  // debe poder escribir en el campo sin pasar por un ref sobre el <Input>
  // compartido (que no reenvía refs). `emocionEsSugerencia` es aparte:
  // arranca en false (Sugerido nunca se pre-llena solo) y pasa a true
  // cuando el usuario acepta la sugerencia con "usar" — el valor sigue
  // siendo el que propuso el Decision Engine hasta que el usuario lo edite.
  const [emocion, setEmocion] = useState(escena.emocion);
  const [emocionEsSugerencia, setEmocionEsSugerencia] = useState(false);
  // Decision Engine — Emoción (Sugerido): mismo criterio de "solo si está
  // vacío", pero acá nunca se pre-llena sola — se ofrece y hace falta un
  // clic para aceptarla.
  const emocionSugerida = !emocion.trim() ? emocionSugeridaParaTipo(tipoEscena) : null;

  // PREPARACION-FIX-1B — Nivel B: borradores de prompt de Imagen/Video
  // ensamblados de forma determinista (`escena-prompt-compiler.ts`), mismo
  // criterio "solo si está vacío" que Movimiento de cámara — se calculan
  // una sola vez a partir de los datos con los que arrancó la escena, no
  // en cada tecla que el usuario escribe.
  const personajesAsignados = personajes.filter((p) => escena.personajeIds.includes(p.id));
  const promptImagenSugeridoInicial = !escena.promptIa.trim()
    ? promptImagenSugerido({ escena, personajes: personajesAsignados, plano: planoActual, locacion: locacionActual, formato })
    : "";
  const [promptIa, setPromptIa] = useState(escena.promptIa || promptImagenSugeridoInicial);
  const [promptIaEsSugerencia, setPromptIaEsSugerencia] = useState(!!promptImagenSugeridoInicial);

  const promptVideoSugeridoInicial = !escena.promptVideoIa.trim()
    ? promptVideoSugerido({ escena, personajes: personajesAsignados, plano: planoActual, locacion: locacionActual, formato })
    : "";
  const [promptVideoIa, setPromptVideoIa] = useState(escena.promptVideoIa || promptVideoSugeridoInicial);
  const [promptVideoIaEsSugerencia, setPromptVideoIaEsSugerencia] = useState(!!promptVideoSugeridoInicial);

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
        <Link href={`${base}/escenas`} className="hover:text-accent">
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

        {/* 2. Qué debes decir — el libreto, no un textarea de formulario.
            id="campo-guion": destino de deep-link de los hallazgos
            narrativos del Director (PHASE-2-IMPLEMENTACION-3B). */}
        <Card id="campo-guion" className={clasesResaltado("campo-guion")}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Guion</p>
          <textarea
            id="textoHablado"
            name="textoHablado"
            defaultValue={escena.textoHablado}
            placeholder="Lo que vas a decir frente a cámara..."
            className="mt-2 min-h-[130px] w-full resize-none border-none bg-transparent p-0 font-display text-[19px] leading-relaxed text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-0"
          />
        </Card>

        {/* 3. Qué necesitas preparar — checklist resumido, no tres selects.
            Cada fila incluye la nota del Director sobre ese mismo campo
            cuando existe (PHASE-2-IMPLEMENTACION-3B) — un único lugar de
            resolución, nunca una tarjeta aparte hablando del mismo problema. */}
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Antes de grabar</p>
          <div className="mt-2 space-y-1.5">
            <FilaChecklist
              resuelto={!!planoActual || !!escenaCpp?.plano}
              etiqueta="elegir plano"
              valor={planoNombreParaChecklist}
            />
            <FilaChecklist
              resuelto={!!locacionActual || !!escenaCpp?.locacion}
              etiqueta="elegir locación"
              valor={locacionNombreParaChecklist}
              nota={
                decisionLocacion
                  ? {
                      texto: decisionLocacion.porQué,
                      etiquetaAccion: "Elegir ahora →",
                      onAccion: () => irA("campo-locacion", true),
                    }
                  : undefined
              }
            />
            {personajes.length > 0 ? (
              <FilaChecklist
                resuelto={personajeIds.length > 0 || !!escenaCpp?.personajes?.length}
                etiqueta="elegir personajes"
                valor={personajesNombresParaChecklist}
                nota={
                  decisionPersonaje
                    ? {
                        texto: decisionPersonaje.porQué,
                        etiquetaAccion: "Elegir ahora →",
                        onAccion: () => irA("campo-personajes", true),
                      }
                    : undefined
                }
              />
            ) : null}
            <FilaChecklist
              resuelto={escena.duracionSegundos > 0}
              etiqueta="estimar duración"
              valor={`Duración estimada: ${formatoDuracion(escena.duracionSegundos)}`}
            />
            {decisionRecurso ? (
              <div>
                <p className="flex items-center gap-1.5 text-[14px] text-accent">
                  <span aria-hidden>🎬</span>
                  Recurso sugerido: {decisionRecurso.necesidad}
                </p>
                <p className="ml-5 mt-0.5 border-l-2 border-l-accent-soft pl-2 text-[12px] text-text-muted">
                  {decisionRecurso.porQué}{" "}
                  <button
                    type="button"
                    onClick={() => irA("campo-recursos", true)}
                    className="font-medium text-accent-hover underline hover:no-underline"
                  >
                    Ver recursos necesarios →
                  </button>
                </p>
              </div>
            ) : null}
          </div>
        </Card>

        {/* Opinión del Director Creativo para ESTA escena (PHASE-2-
            IMPLEMENTACION-3A) — solo lectura, ya generada en Revisión. */}
        <OpinionDirectorCreativo hallazgosAgrupados={hallazgosAgrupados} onIrA={irA} />

        {/* 4. Cómo recomiendo grabarla — Nivel 1 (sin IA), ver RecomendacionPlano. */}
        {recomendacionBase && planoActual ? (
          <Card>
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Recomendación</p>
            <div className="mt-2">
              <RecomendacionPlano planoNombre={planoActual.nombre} recomendacionBase={recomendacionBase} />
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
              <Textarea
                id="promptIa"
                name="promptIa"
                value={promptIa}
                onChange={(e) => {
                  setPromptIa(e.target.value);
                  setPromptIaEsSugerencia(false);
                }}
                sugerido={promptIaEsSugerencia}
              />
              {promptIaEsSugerencia ? (
                <p className="mt-1 text-[12px] text-text-muted">
                  💡 Borrador armado con los datos de la escena — editable.
                </p>
              ) : null}
              <Label htmlFor="promptVideoIa">Generar prompt de video</Label>
              <Textarea
                id="promptVideoIa"
                name="promptVideoIa"
                value={promptVideoIa}
                onChange={(e) => {
                  setPromptVideoIa(e.target.value);
                  setPromptVideoIaEsSugerencia(false);
                }}
                sugerido={promptVideoIaEsSugerencia}
              />
              {promptVideoIaEsSugerencia ? (
                <p className="mt-1 text-[12px] text-text-muted">
                  💡 Borrador armado con los datos de la escena — editable.
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        {/* Todo lo que no responde ninguna de las 5 preguntas — incluye los
            controles reales de edición de Plano/Locación/Personajes que el
            checklist de arriba solo resume. Un único "Ver detalles", no
            tres acordeones separados (eso ya se sentía como formulario). */}
        <SeccionColapsable
          titulo="Ver detalles"
          tieneContenido={true}
          abierto={detallesAbiertos}
          onAbiertoChange={setDetallesAbiertos}
        >
          <Label>¿En qué etapa está?</Label>
          <EstadoProduccionSelect escenaId={escena.id} estado={escena.estadoProduccion} onChange={onEstadoChange} />

          <Label htmlFor="planoId">Plano</Label>
          <select
            id="planoId"
            name="planoId"
            defaultValue={escena.planoId ?? ""}
            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text"
          >
            <option value="">Todavía no elegiste</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          {/* id="campo-locacion": destino de deep-link de la fila
              "elegir locación" del checklist (PHASE-2-IMPLEMENTACION-3B). */}
          <div id="campo-locacion" className={clasesResaltado("campo-locacion")}>
            <Label htmlFor="locacionId">Locación</Label>
            <select
              id="locacionId"
              name="locacionId"
              defaultValue={escena.locacionId ?? ""}
              className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text"
            >
              <option value="">Todavía no elegiste</option>
              {locaciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          {personajes.length > 0 ? (
            <div id="campo-personajes" className={clasesResaltado("campo-personajes")}>
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
            </div>
          ) : null}
          <Label htmlFor="movimientoCamara">Movimiento de cámara</Label>
          <Input
            id="movimientoCamara"
            name="movimientoCamara"
            value={movimientoCamara}
            onChange={(e) => {
              setMovimientoCamara(e.target.value);
              setMovimientoEsSugerencia(false);
            }}
            sugerido={movimientoEsSugerencia}
          />
          {movimientoEsSugerencia ? (
            <p className="mt-1 text-[12px] text-text-muted">💡 Sugerido según el plano — editable.</p>
          ) : null}
          {/* id="campo-recursos": destino de deep-link de "Recurso sugerido"
              (PHASE-2-IMPLEMENTACION-3B). */}
          <div id="campo-recursos" className={clasesResaltado("campo-recursos")}>
            <Label htmlFor="recursosNecesarios">Recursos necesarios</Label>
            <Textarea id="recursosNecesarios" name="recursosNecesarios" defaultValue={escena.recursosNecesarios} />
          </div>

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
          <Input
            id="emocion"
            name="emocion"
            value={emocion}
            onChange={(e) => {
              setEmocion(e.target.value);
              setEmocionEsSugerencia(false);
            }}
            sugerido={emocionEsSugerencia}
          />
          {emocionSugerida ? (
            <SugerenciaCampo
              sugerencia={emocionSugerida}
              onUsar={() => {
                setEmocion(emocionSugerida);
                setEmocionEsSugerencia(true);
              }}
            />
          ) : null}
          <Label htmlFor="valorEspectador">Valor para el espectador</Label>
          <Input id="valorEspectador" name="valorEspectador" defaultValue={escena.valorEspectador} />
          {/* id="campo-duracion": destino de deep-link de los hallazgos
              categoría Duración (PHASE-2-IMPLEMENTACION-3B). */}
          <div id="campo-duracion" className={clasesResaltado("campo-duracion")}>
            <Label htmlFor="duracionSegundos">¿Cuánto dura? (segundos)</Label>
            <Input
              id="duracionSegundos"
              name="duracionSegundos"
              type="number"
              min={0}
              defaultValue={escena.duracionSegundos}
            />
          </div>

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
