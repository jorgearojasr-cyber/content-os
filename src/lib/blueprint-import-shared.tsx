"use client";

import { useState } from "react";
import type { EntidadBiblioteca, AnalisisBlueprint } from "@/lib/actions";
import type { EscenaCBD } from "@/lib/blueprint-parser";
import { explicarError } from "./errores";
import { normalizarTexto, similitudTexto, UMBRAL_SUGERENCIA_FUERTE, UMBRAL_SUGERENCIA_MINIMA } from "./similitud";

/** Piezas puras usadas por `RevisionBlueprint` (UX Migration 2) — la
 * resolución de Personajes/Locación/Plano dentro de cada escena, igual
 * sin importar si el Proyecto llegó pre-resuelto o se resolvió recién en
 * la propia pantalla. Importa `errores`/`similitud` con ruta relativa (no
 * `@/lib/...`) a propósito — Vitest no resuelve alias de path, y este
 * archivo necesita ser testeable directamente (`resolverCampo` es la
 * pieza central de la automatización de UX Migration 4A). Los imports de
 * tipo (`EntidadBiblioteca`, `AnalisisBlueprint`, `EscenaCBD`) se borran
 * en build y no necesitan el mismo tratamiento.
 *
 * UX Migration 4A — "automatización primero": `resolverCampo` ya no deja
 * como pendiente una coincidencia fuerte sin competencia (ver el umbral en
 * `similitud.ts`); la vincula sola, de forma visible y reversible (ver
 * `SelectorResolucion`). Cuando sí hace falta preguntar, el `Campo`
 * resultante trae su propio `motivo` explicado y, si existe, la
 * `recomendacion` del sistema — nunca una etiqueta fija en el componente,
 * para que una recomendación real (IA, más adelante) pueda ocupar el mismo
 * lugar sin tocar la UI de nuevo. */

export const ETIQUETAS_TIPO_ESCENA: Record<string, string> = {
  GANCHO: "Gancho",
  PROBLEMA: "Problema",
  DESCUBRIMIENTO: "Descubrimiento",
  SOLUCION: "Solución",
  CTA: "CTA",
  BROLL: "B-roll",
  TRANSICION: "Transición",
  OTRA: "Otra",
};

export const SIN_VINCULAR = "__sin_vincular__";

export type CandidatoSimilitud = EntidadBiblioteca & { similitud: number };

/** La recomendación del propio sistema para un campo pendiente — existe
 * incluso cuando no alcanza para autovincular (ver `resolverCampo`), para
 * que `SelectorResolucion` siempre pueda mostrar "esto es lo que yo
 * elegiría" en vez de una lista neutra sin opinión (UX Migration 4A). */
export type Recomendacion = { id: string; nombre: string; similitud: number };

/** Una referencia (Personaje/Locación/Plano) ya resuelta a un id real, o
 * pendiente de que el usuario decida — `decision === undefined` es
 * "todavía no decidió", distinto de `null` ("decidió dejarla en blanco a
 * propósito"). Esa distinción es la que habilita o no el botón Confirmar.
 * Cuando el nombre coincide EXACTO (ignorando mayúsculas/tildes) con 2+
 * entradas de la Biblioteca, se trata igual que "no encontrado" (no se
 * puede adivinar cuál es) pero se listan los `candidatos` reales en vez
 * del combo completo. Cuando no hay ninguna coincidencia exacta, se
 * ofrecen `sugerencias` por similitud (UX Migration 1.2).
 *
 * `autoResuelto` (UX Migration 4A): true cuando `resolverCampo` ya dejó
 * `decision` prellenada con una sugerencia fuerte sin competencia —
 * sigue siendo `resuelto: false` (no es una coincidencia exacta, sigue
 * siendo reversible) pero no bloquea "Crear video". `motivo` explica en
 * lenguaje llano por qué este campo necesita atención (o por qué se
 * autovinculó); `recomendacion`, si existe, es la mejor opción según el
 * sistema aunque no haya alcanzado para autovincular sola. */
export type Campo =
  | { resuelto: true; id: string; nombre: string }
  | {
      resuelto: false;
      nombre: string;
      decision: string | null | undefined;
      autoResuelto: boolean;
      motivo: string;
      recomendacion?: Recomendacion;
      candidatos?: EntidadBiblioteca[];
      sugerencias?: CandidatoSimilitud[];
    };

export type EscenaEnRevision = {
  cbd: EscenaCBD;
  personajes: Campo[];
  locacion: Campo | null;
  plano: Campo | null;
};

/** Ahora que el Creative Blueprint pide nombres "narrativos naturales"
 * (Presentador, Oficina, Primer plano — no el nombre exacto de la
 * Biblioteca, ver UX Migration 1.2), la coincidencia exacta rara vez
 * ocurre por casualidad — la resolución por similitud es el camino
 * normal, no la excepción. La coincidencia exacta (ignorando mayúsculas
 * y tildes) sigue resolviéndose sola cuando hay una sola candidata,
 * exactamente como en Migration 1.
 *
 * UX Migration 4A — automatización primero: si hay 0 exactas, se ofrecen
 * `sugerencias` ordenadas por similitud, filtradas por
 * `UMBRAL_SUGERENCIA_MINIMA`. Cuando la mejor sugerencia cruza
 * `UMBRAL_SUGERENCIA_FUERTE` y ninguna otra la acompaña por encima de ese
 * mismo umbral (no hay ambigüedad real), se vincula sola: `autoResuelto:
 * true` y `decision` ya prellenada — sigue siendo reversible desde
 * `SelectorResolucion`, nunca oculta. Cuando hay dos o más candidatas
 * fuertes reñidas, o la mejor no llega al umbral fuerte, sigue siendo una
 * decisión real del usuario — pero `recomendacion` igual queda expuesta
 * con la mejor opción encontrada, para que la pregunta nunca sea "elegí a
 * ciegas" sino "¿confirmás esto, o preferís otra?". */
export function resolverCampo(nombre: string, disponibles: EntidadBiblioteca[]): Campo {
  const coincidenciasExactas = disponibles.filter((d) => similitudTexto(d.nombre, nombre) === 1);
  if (coincidenciasExactas.length === 1) {
    return { resuelto: true, id: coincidenciasExactas[0].id, nombre };
  }
  if (coincidenciasExactas.length > 1) {
    return {
      resuelto: false,
      nombre,
      decision: undefined,
      autoResuelto: false,
      motivo: `Hay ${coincidenciasExactas.length} entradas en tu Biblioteca con el mismo nombre — no puedo saber sola cuál es.`,
      candidatos: coincidenciasExactas,
    };
  }

  const sugerencias = disponibles
    .map((d) => ({ ...d, similitud: similitudTexto(nombre, d.nombre) }))
    .filter((c) => c.similitud >= UMBRAL_SUGERENCIA_MINIMA)
    .sort((a, b) => b.similitud - a.similitud);

  const mejor = sugerencias[0];
  const segunda = sugerencias[1];
  const autoResuelto =
    mejor !== undefined &&
    mejor.similitud >= UMBRAL_SUGERENCIA_FUERTE &&
    (segunda === undefined || segunda.similitud < UMBRAL_SUGERENCIA_FUERTE);

  const motivo =
    mejor === undefined
      ? `No encontré nada parecido a "${nombre}" en tu Biblioteca.`
      : autoResuelto
        ? `"${nombre}" se parece mucho a "${mejor.nombre}" de tu Biblioteca — lo vinculé sola.`
        : mejor.similitud >= UMBRAL_SUGERENCIA_FUERTE
          ? `Hay más de una opción de tu Biblioteca muy parecida a "${nombre}" — no quiero adivinar cuál preferís.`
          : `"${nombre}" no coincide exacto con nada — lo más parecido que encontré es "${mejor.nombre}", pero no estoy segura.`;

  return {
    resuelto: false,
    nombre,
    decision: autoResuelto ? mejor.id : undefined,
    autoResuelto,
    motivo,
    recomendacion: mejor ? { id: mejor.id, nombre: mejor.nombre, similitud: mejor.similitud } : undefined,
    sugerencias: sugerencias.length > 0 ? sugerencias : undefined,
  };
}

export function construirRevision(escenas: EscenaCBD[], analisis: AnalisisBlueprint): EscenaEnRevision[] {
  return escenas.map((cbd) => ({
    cbd,
    personajes: cbd.personajes.map((n) => resolverCampo(n, analisis.personajesDisponibles)),
    locacion: cbd.locacion ? resolverCampo(cbd.locacion, analisis.locacionesDisponibles) : null,
    plano: cbd.plano ? resolverCampo(cbd.plano, analisis.planosDisponibles) : null,
  }));
}

export function faltanDecisiones(escenas: EscenaEnRevision[]): boolean {
  return escenas.some(
    (e) =>
      e.personajes.some((c) => !c.resuelto && c.decision === undefined) ||
      (e.locacion && !e.locacion.resuelto && e.locacion.decision === undefined) ||
      (e.plano && !e.plano.resuelto && e.plano.decision === undefined),
  );
}

export type TipoCampoPendiente = "plano" | "locacion" | "personaje";

export type CampoPendiente = {
  tipo: TipoCampoPendiente;
  campo: Extract<Campo, { resuelto: false }>;
  /** En cuántas escenas aparece este mismo nombre — solo informativo. */
  ocurrencias: number;
};

/** UX-MIGRATION-5 — agrupa los campos genuinamente pendientes (ni
 * resueltos, ni auto-resueltos por 4A, ni ya decididos) por nombre
 * normalizado, sin importar en cuántas escenas aparezcan: el mismo
 * Personaje/Locación/Plano mencionado varias veces en el mismo guion
 * pegado se resuelve en una sola tarjeta, nunca una por escena — decidir
 * ahí (ver `SelectorResolucion` con `soloEstado`) aplica la misma
 * decisión a todas las apariciones. Los campos auto-resueltos no entran
 * acá — siguen viviendo en el lugar, livianos y reversibles. */
export function agruparPendientes(escenas: EscenaEnRevision[]): CampoPendiente[] {
  const vistos = new Map<string, CampoPendiente>();

  function agregar(tipo: TipoCampoPendiente, campo: Campo | null) {
    if (!campo || campo.resuelto || campo.autoResuelto || campo.decision !== undefined) return;
    const clave = `${tipo}:${normalizarTexto(campo.nombre)}`;
    const existente = vistos.get(clave);
    if (existente) existente.ocurrencias += 1;
    else vistos.set(clave, { tipo, campo, ocurrencias: 1 });
  }

  for (const e of escenas) {
    agregar("plano", e.plano);
    agregar("locacion", e.locacion);
    for (const c of e.personajes) agregar("personaje", c);
  }

  return [...vistos.values()];
}

/** Se muestra en todo campo genuinamente pendiente — la misma respuesta a
 * "¿qué pasa si no hago nada?" sin importar el tipo de campo (UX Migration
 * 4A, principio "las preguntas deben tener contexto").
 *
 * PREPARACION-FIX-1, FIX 3: hasta acá el texto decía "no bloquea crear el
 * video", pero el botón SÍ queda deshabilitado (`faltanDecisiones`) hasta
 * elegir una opción — incluida "No lo sé todavía". Esa era la
 * contradicción a resolver: se optó por corregir el texto (no por
 * preseleccionar la opción sola), porque el flujo de "Antes de continuar"
 * ya depende de que el campo quede genuinamente pendiente hasta que el
 * usuario lo toque — preseleccionarlo lo sacaría de ese bloque sin que
 * nadie lo haya decidido de verdad. */
const QUE_PASA_SI_NO_DECIDIS =
  "Podés dejarlo sin vincular y resolverlo después desde Escenas — elegí “No lo sé todavía” para poder crear el video sin resolverlo ahora.";

/**
 * Resuelve un campo pendiente (Personaje/Locación/Plano) — lista de radios
 * en vez del `<select>` de Migration 1, para poder distinguir visualmente
 * la recomendación del sistema sin nunca marcarla como elegida por su
 * cuenta cuando de verdad hace falta una decisión (UX Migration 1.2).
 *
 * UX Migration 4A: cuando `campo.autoResuelto` es true y el usuario
 * todavía no tocó nada, se muestra como una línea liviana ya resuelta
 * ("Vinculé... — cambiar"), no como una tarjeta de decisión — la elección
 * ya está tomada, solo queda visible y reversible. Cuando sí hace falta
 * preguntar, la tarjeta explica el motivo, qué pasa si no se decide nada,
 * y marca la recomendación del sistema si existe — en un tono neutro, no
 * de error: el rojo queda solo para errores bloqueantes reales del CBD y
 * para Producción duplicada, en `RevisionBlueprint`.
 *
 * `onCrearNuevo`, si se pasa, agrega la opción "Crear nuevo" — hoy tiene
 * sentido para Personaje y Locación (PREPARACION-FIX-1, FIX 4: una
 * Locación creada así solo tiene nombre, sin foto — se completa después
 * desde Activos). Plano todavía no tiene administración propia (ver
 * `getPlanos`), así que no lo recibe. `etiquetaCrearNuevo` es la frase que
 * completa "Crear ___: nombre" ("nuevo Personaje" / "nueva Locación") —
 * el componente en sí es agnóstico al tipo de campo.
 *
 * `soloEstado` (UX-MIGRATION-5): true cuando este campo ya se resuelve en
 * el bloque consolidado "Antes de continuar" (ver `agruparPendientes`) —
 * acá solo refleja el resultado (nombre elegido, "Sin vincular", o un
 * aviso de que falta resolverlo arriba), nunca vuelve a mostrar la
 * tarjeta completa de decisión para el mismo nombre. */
export function SelectorResolucion({
  campo,
  onDecidir,
  onCrearNuevo,
  etiquetaCrearNuevo = "nuevo Personaje",
  soloEstado = false,
}: {
  campo: Campo;
  onDecidir: (valor: string) => void;
  onCrearNuevo?: (nombre: string) => Promise<{ id: string }>;
  etiquetaCrearNuevo?: string;
  soloEstado?: boolean;
}) {
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  const [revisando, setRevisando] = useState(false);

  if (campo.resuelto) {
    return <span className="text-text">{campo.nombre}</span>;
  }

  const ambiguo = Boolean(campo.candidatos);
  const opciones: (EntidadBiblioteca & { similitud?: number })[] = ambiguo
    ? campo.candidatos!
    : (campo.sugerencias ?? []);
  const valorActual = campo.decision === undefined ? "" : campo.decision === null ? SIN_VINCULAR : campo.decision;

  if (soloEstado) {
    if (campo.decision === null) return <span className="text-text-muted">Sin vincular</span>;
    if (campo.decision) {
      const elegido = opciones.find((o) => o.id === campo.decision);
      return <span className="text-text">{elegido?.nombre ?? campo.nombre}</span>;
    }
    return <span className="text-accent">⚠ Se resuelve arriba ↑</span>;
  }

  async function crearNuevo() {
    if (!onCrearNuevo || campo.resuelto) return;
    setCreando(true);
    setError("");
    try {
      const { id } = await onCrearNuevo(campo.nombre);
      onDecidir(id);
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCreando(false);
    }
  }

  if (campo.autoResuelto && !revisando) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-text">
        <span className="text-accent">✔</span>
        <span>
          Vinculé “{campo.nombre}” con <span className="font-medium">{campo.recomendacion?.nombre}</span> de tu
          Biblioteca.
        </span>
        <button type="button" onClick={() => setRevisando(true)} className="text-text-muted underline hover:text-text">
          cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent-soft p-2">
      <p className="text-[12px] text-text">{campo.motivo}</p>
      <p className="mt-0.5 text-[11px] text-text-muted">{QUE_PASA_SI_NO_DECIDIS}</p>
      <div className="mt-1.5 space-y-1">
        {opciones.map((d) => {
          const esRecomendacion =
            !ambiguo && campo.recomendacion?.id === d.id && (campo.recomendacion?.similitud ?? 0) >= UMBRAL_SUGERENCIA_FUERTE;
          return (
            <label key={d.id} className="flex items-center gap-1.5 text-[12.5px] text-text">
              <input type="radio" checked={valorActual === d.id} onChange={() => onDecidir(d.id)} />
              {esRecomendacion ? (
                <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-medium text-accent">
                  Mi recomendación
                </span>
              ) : null}
              {d.nombre}
              {typeof d.similitud === "number" ? (
                <span className="text-text-muted">({Math.round(d.similitud * 100)}%)</span>
              ) : ambiguo ? (
                <span className="text-text-muted">(id {d.id.slice(0, 8)})</span>
              ) : null}
            </label>
          );
        })}
        {onCrearNuevo ? (
          <label className="flex items-center gap-1.5 text-[12.5px] text-text">
            <input type="radio" checked={false} onChange={crearNuevo} disabled={creando} />
            {creando ? "Creando…" : `Crear ${etiquetaCrearNuevo}: “${campo.nombre}”`}
          </label>
        ) : null}
        <label className="flex items-center gap-1.5 text-[12.5px] text-text">
          <input type="radio" checked={valorActual === SIN_VINCULAR} onChange={() => onDecidir(SIN_VINCULAR)} />
          No lo sé todavía — lo resuelvo después
        </label>
      </div>
      {error ? <p className="mt-1 text-[12.5px] text-danger">{error}</p> : null}
    </div>
  );
}
