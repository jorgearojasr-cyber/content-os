"use client";

import { useState } from "react";
import type { EntidadBiblioteca, AnalisisBlueprint } from "@/lib/actions";
import type { EscenaCBD } from "@/lib/blueprint-parser";
import { explicarError } from "@/lib/errores";
import { similitudTexto, UMBRAL_SUGERENCIA_FUERTE, UMBRAL_SUGERENCIA_MINIMA } from "@/lib/similitud";

/** Piezas compartidas entre `ImportarBlueprintModal` (entrada dentro de un
 * Proyecto ya elegido) e `ImportarBlueprintGlobalModal` (entrada sin
 * Proyecto elegido todavía, que primero resuelve cuál es) — la resolución
 * de Personajes/Locación/Plano dentro de cada escena es idéntica en
 * ambos casos una vez que el Proyecto ya está determinado. */

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

/** Una referencia (Personaje/Locación/Plano) ya resuelta a un id real, o
 * pendiente de que el usuario decida — `decision === undefined` es
 * "todavía no decidió", distinto de `null` ("decidió dejarla en blanco a
 * propósito"). Esa distinción es la que habilita o no el botón Confirmar.
 * Cuando el nombre coincide EXACTO (ignorando mayúsculas/tildes) con 2+
 * entradas de la Biblioteca, se trata igual que "no encontrado" (no se
 * puede adivinar cuál es) pero se listan los `candidatos` reales en vez
 * del combo completo. Cuando no hay ninguna coincidencia exacta, se
 * ofrecen `sugerencias` por similitud (UX Migration 1.2) — nunca ambas
 * cosas a la vez, y ninguna de las dos se autoselecciona jamás. */
export type Campo =
  | { resuelto: true; id: string; nombre: string }
  | {
      resuelto: false;
      nombre: string;
      decision: string | null | undefined;
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
 * exactamente como en Migration 1; si hay 0 exactas, se ofrecen
 * `sugerencias` ordenadas por similitud, filtradas por
 * `UMBRAL_SUGERENCIA_MINIMA` — pero la decisión siempre queda pendiente
 * hasta que el usuario haga clic, sin importar qué tan alta sea la
 * similitud (filosofía QA-1: ninguna decisión aproximada en silencio). */
export function resolverCampo(nombre: string, disponibles: EntidadBiblioteca[]): Campo {
  const coincidenciasExactas = disponibles.filter(
    (d) => similitudTexto(d.nombre, nombre) === 1,
  );
  if (coincidenciasExactas.length === 1) {
    return { resuelto: true, id: coincidenciasExactas[0].id, nombre };
  }
  if (coincidenciasExactas.length > 1) {
    return { resuelto: false, nombre, decision: undefined, candidatos: coincidenciasExactas };
  }

  const sugerencias = disponibles
    .map((d) => ({ ...d, similitud: similitudTexto(nombre, d.nombre) }))
    .filter((c) => c.similitud >= UMBRAL_SUGERENCIA_MINIMA)
    .sort((a, b) => b.similitud - a.similitud);

  return {
    resuelto: false,
    nombre,
    decision: undefined,
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

/**
 * Resuelve un campo pendiente (Personaje/Locación/Plano) — lista de radios
 * en vez del `<select>` de Migration 1, para poder distinguir visualmente
 * la sugerencia fuerte (>= `UMBRAL_SUGERENCIA_FUERTE`) sin nunca marcarla
 * como elegida por su cuenta: ningún radio queda tildado hasta que el
 * usuario hace clic, sin importar la similitud (UX Migration 1.2).
 * `onCrearNuevo`, si se pasa, agrega la opción "Crear nuevo" — hoy solo
 * tiene sentido para Personaje (Locación necesita una foto real y Plano
 * todavía no tiene administración propia, ver `getPlanos`). */
export function SelectorResolucion({
  campo,
  onDecidir,
  onCrearNuevo,
}: {
  campo: Campo;
  onDecidir: (valor: string) => void;
  onCrearNuevo?: (nombre: string) => Promise<{ id: string }>;
}) {
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  if (campo.resuelto) {
    return <span className="text-text">{campo.nombre}</span>;
  }

  const ambiguo = Boolean(campo.candidatos);
  const opciones: (EntidadBiblioteca & { similitud?: number })[] = ambiguo
    ? campo.candidatos!
    : (campo.sugerencias ?? []);
  const valorActual = campo.decision === undefined ? "" : campo.decision === null ? SIN_VINCULAR : campo.decision;

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

  return (
    <div className="rounded-lg border border-danger/40 bg-danger/5 p-2">
      <p className="text-[12px] text-danger">
        {ambiguo
          ? `“${campo.nombre}” coincide con ${campo.candidatos!.length} entradas de tu Biblioteca — elegí cuál es.`
          : opciones.length > 0
            ? `“${campo.nombre}” no coincide exacto con nada — ¿es alguna de estas?`
            : `“${campo.nombre}” no coincide con nada existente.`}
      </p>
      <div className="mt-1.5 space-y-1">
        {opciones.map((d, i) => {
          const fuerte = !ambiguo && i === 0 && (d.similitud ?? 0) >= UMBRAL_SUGERENCIA_FUERTE;
          return (
            <label key={d.id} className="flex items-center gap-1.5 text-[12.5px] text-text">
              <input type="radio" checked={valorActual === d.id} onChange={() => onDecidir(d.id)} />
              {fuerte ? (
                <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-medium text-accent">
                  Sugerido
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
            {creando ? "Creando…" : `Crear nuevo Personaje: “${campo.nombre}”`}
          </label>
        ) : null}
        <label className="flex items-center gap-1.5 text-[12.5px] text-text">
          <input type="radio" checked={valorActual === SIN_VINCULAR} onChange={() => onDecidir(SIN_VINCULAR)} />
          Dejar sin vincular (revisar después)
        </label>
      </div>
      {error ? <p className="mt-1 text-[12.5px] text-danger">{error}</p> : null}
    </div>
  );
}
