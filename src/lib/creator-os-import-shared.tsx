import type { EntidadBiblioteca } from "@/lib/actions";
import type { EscenaCPP } from "@/lib/creator-os-package";
import { type Campo, resolverCampo } from "./blueprint-import-shared";

/** Piezas puras del importador de CreatorOS Production Package (CPP) —
 * mismo mecanismo de resolución de nombres libres (Personaje/Locación/
 * Plano) que el importador de Blueprint/CBD ya construido: reutiliza
 * `resolverCampo`/`Campo` de `blueprint-import-shared.tsx` sin
 * reimplementar la lógica de similitud (regla congelada, RFC-002 sección
 * 1: "reutiliza el motor de similitud ya existente"). Este archivo solo
 * agrega el adaptador de forma (`EscenaCPP` en vez de `EscenaCBD`) — la
 * resolución en sí es la misma pieza que ya existe.
 *
 * SPRING_REFACTOR_1: la resolución nunca bloquea — `resolverCampo` sigue
 * vinculando en silencio cuando hay coincidencia exacta o fuerte, y deja
 * `decision: undefined` (sin vincular) cuando no la hay. Ya no existe
 * ninguna pieza que agrupe "pendientes" para pedirle al usuario que
 * decida — un campo sin vincular queda así, sin bloquear la importación
 * ni la ejecución de la Producción. */

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
