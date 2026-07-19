import { parseFotosPersonaje, parsePersonajeIds } from "./types";
import type { Bloque, Personaje } from "./types";

export type ChequeoConsistencia = { ok: boolean; etiqueta: string };

export type ResultadoConsistencia = {
  usoPersonaje: ChequeoConsistencia;
  exportoConPersonaje: ChequeoConsistencia;
  incluyeFotos: ChequeoConsistencia;
};

function bloqueUsaPersonaje(bloque: Bloque, personajeId: string): boolean {
  return bloque.personajeId === personajeId || parsePersonajeIds(bloque.personajeIdsJson).includes(personajeId);
}

/**
 * VALIDADOR DE CONSISTENCIA — alcance limitado a propósito: solo
 * verificaciones ESTRUCTURALES deterministas, sin IA de visión.
 * (1) ¿la pieza usó este Personaje?
 * (2) ¿se exportó el contexto con este Personaje incluido? — mismo dato
 *     que (1): `bloque.personajeId`/`personajeIdsJson` solo se graban
 *     cuando el Personaje formaba parte de la selección al "Estructurar"
 *     el contexto exportado (ver `crear-modos.tsx`), así que ambas
 *     preguntas comparten la misma señal en el modelo de datos actual.
 * (3) ¿la guía de producción de esta pieza incluye sus fotos de
 *     referencia? — solo aplica si la pieza usó el Personaje.
 *
 * EXTENSIÓN FUTURA POSIBLE (fuera de alcance de esta ronda): verificación
 * visual real contra la imagen generada (color de casco, edad aparente,
 * vestuario correcto) — requeriría un modelo de visión, no lógica
 * determinista de texto.
 */
export function evaluarConsistenciaPersonaje(bloque: Bloque, personaje: Personaje): ResultadoConsistencia {
  const usado = bloqueUsaPersonaje(bloque, personaje.id);
  const tieneFotos = parseFotosPersonaje(personaje.fotosUrlsJson).length > 0;

  return {
    usoPersonaje: {
      ok: usado,
      etiqueta: usado ? "Personaje correctamente vinculado" : "Esta pieza no usó este Personaje",
    },
    exportoConPersonaje: {
      ok: usado,
      etiqueta: usado
        ? "Se exportó el contexto con este Personaje incluido"
        : "El contexto exportado no incluyó a este Personaje",
    },
    incluyeFotos: {
      ok: usado && tieneFotos,
      etiqueta:
        usado && tieneFotos
          ? "La guía de producción incluye sus fotos de referencia"
          : usado
            ? "Esta pieza no incluyó las fotos de referencia (el Personaje no tiene fotos cargadas)"
            : "No aplica — la pieza no usó este Personaje",
    },
  };
}
