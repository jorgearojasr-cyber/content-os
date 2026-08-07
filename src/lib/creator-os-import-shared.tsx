import type { EntidadBiblioteca } from "@/lib/actions";
import type { EscenaCPP } from "@/lib/creator-os-package";
import { normalizarTexto } from "./similitud";
import { type Campo, resolverCampo } from "./blueprint-import-shared";

/** Piezas puras del importador de CreatorOS Production Package (CPP) —
 * mismo mecanismo de resolución de nombres libres (Personaje/Locación/
 * Plano) que el importador de Blueprint/CBD ya construido: reutiliza
 * `resolverCampo`/`Campo` de `blueprint-import-shared.tsx` sin
 * reimplementar la lógica de similitud (regla congelada, RFC-002 sección
 * 1: "reutiliza el motor de similitud ya existente"). Este archivo solo
 * agrega el adaptador de forma (`EscenaCPP` en vez de `EscenaCBD`) — la
 * resolución en sí es la misma pieza que ya existe. */

export type EscenaCppEnRevision = {
  escena: EscenaCPP;
  personajes: Campo[];
  locacion: Campo | null;
  plano: Campo | null;
};

export function construirRevisionCpp(
  escenas: EscenaCPP[],
  personajesDisponibles: EntidadBiblioteca[],
  locacionesDisponibles: EntidadBiblioteca[],
  planosDisponibles: EntidadBiblioteca[],
): EscenaCppEnRevision[] {
  return escenas.map((escena) => ({
    escena,
    personajes: (escena.personajes ?? []).map((n) => resolverCampo(n, personajesDisponibles)),
    locacion: escena.locacion ? resolverCampo(escena.locacion, locacionesDisponibles) : null,
    plano: escena.plano ? resolverCampo(escena.plano, planosDisponibles) : null,
  }));
}

export function faltanDecisionesCpp(escenas: EscenaCppEnRevision[]): boolean {
  return escenas.some(
    (e) =>
      e.personajes.some((c) => !c.resuelto && c.decision === undefined) ||
      (e.locacion && !e.locacion.resuelto && e.locacion.decision === undefined) ||
      (e.plano && !e.plano.resuelto && e.plano.decision === undefined),
  );
}

export type TipoCampoPendienteCpp = "plano" | "locacion" | "personaje";

export type CampoPendienteCpp = {
  tipo: TipoCampoPendienteCpp;
  campo: Extract<Campo, { resuelto: false }>;
  ocurrencias: number;
};

/** Mismo criterio que `agruparPendientes` (Blueprint): un mismo nombre
 * mencionado en varias escenas se resuelve una sola vez, no una tarjeta
 * por escena. */
export function agruparPendientesCpp(escenas: EscenaCppEnRevision[]): CampoPendienteCpp[] {
  const vistos = new Map<string, CampoPendienteCpp>();

  function agregar(tipo: TipoCampoPendienteCpp, campo: Campo | null) {
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
