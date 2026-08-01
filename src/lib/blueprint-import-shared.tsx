"use client";

import type { EntidadBiblioteca, AnalisisBlueprint } from "@/lib/actions";
import type { EscenaCBD } from "@/lib/blueprint-parser";

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

/** Una referencia (Personaje/Locación/Plano) ya resuelta a un id real, o
 * pendiente de que el usuario decida — `decision === undefined` es
 * "todavía no decidió", distinto de `null` ("decidió dejarla en blanco a
 * propósito"). Esa distinción es la que habilita o no el botón Confirmar.
 * Cuando el nombre coincide con 2+ entradas de la Biblioteca, se trata
 * igual que "no encontrado" (no se puede adivinar cuál es) pero se listan
 * los `candidatos` reales en vez del combo completo. */
export type Campo =
  | { resuelto: true; id: string; nombre: string }
  | { resuelto: false; nombre: string; decision: string | null | undefined; candidatos?: EntidadBiblioteca[] };

export type EscenaEnRevision = {
  cbd: EscenaCBD;
  personajes: Campo[];
  locacion: Campo | null;
  plano: Campo | null;
};

export function resolverCampo(nombre: string, disponibles: EntidadBiblioteca[]): Campo {
  const coincidencias = disponibles.filter((d) => d.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
  if (coincidencias.length === 1) {
    return { resuelto: true, id: coincidencias[0].id, nombre };
  }
  return {
    resuelto: false,
    nombre,
    decision: undefined,
    candidatos: coincidencias.length > 1 ? coincidencias : undefined,
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

export function SelectorResolucion({
  campo,
  disponibles,
  onDecidir,
}: {
  campo: Campo;
  disponibles: EntidadBiblioteca[];
  onDecidir: (valor: string) => void;
}) {
  if (campo.resuelto) {
    return <span className="text-text">{campo.nombre}</span>;
  }
  const valorActual = campo.decision === undefined ? "" : campo.decision === null ? SIN_VINCULAR : campo.decision;
  const ambiguo = (campo.candidatos?.length ?? 0) > 1;
  const opciones = ambiguo ? campo.candidatos! : disponibles;
  return (
    <div className="rounded-lg border border-danger/40 bg-danger/5 p-2">
      <p className="text-[12px] text-danger">
        {ambiguo
          ? `“${campo.nombre}” coincide con ${campo.candidatos!.length} entradas de tu Biblioteca — elegí cuál es.`
          : `“${campo.nombre}” no coincide con nada existente.`}
      </p>
      <select
        value={valorActual}
        onChange={(e) => onDecidir(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[12.5px] text-text"
      >
        <option value="">— Elegí una opción —</option>
        {opciones.map((d) => (
          <option key={d.id} value={d.id}>
            Vincular a: {d.nombre}
            {ambiguo ? ` (id ${d.id.slice(0, 8)})` : ""}
          </option>
        ))}
        <option value={SIN_VINCULAR}>Dejar sin vincular (revisar después)</option>
      </select>
    </div>
  );
}
