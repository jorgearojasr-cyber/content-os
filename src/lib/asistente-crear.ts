import { contarCoincidencias, extraerPalabrasClave } from "./reutilizacion";
import type { MotorIA, Personaje } from "./types";

/**
 * ASISTENTE DE CREAR — "piensa por ti"
 * ------------------------------------------------------------------
 * Todo acá es texto plano y coincidencia por palabras clave (mismo motor
 * que ya usan Motor IA y Reutilización Inteligente) — CERO llamadas a IA.
 * La animación de "análisis" en el flujo (ver animacion-analisis.tsx) es
 * puro teatro de UI sobre estas funciones, que ya resuelven todo de forma
 * síncrona e instantánea antes de que la animación siquiera empiece.
 * ------------------------------------------------------------------
 */

export type PasoAnimado = { id: string; etiqueta: string };

export const PASOS_ANIMACION: PasoAnimado[] = [
  { id: "tematica", etiqueta: "Detectando temática" },
  { id: "personaje", etiqueta: "Buscando personaje" },
  { id: "narrativa", etiqueta: "Buscando narrativa" },
  { id: "conocimiento", etiqueta: "Revisando conocimiento" },
  { id: "duracion", etiqueta: "Preparando duración y escenas" },
  { id: "listo", etiqueta: "Contexto listo" },
];

export type PersonajeSugerido = { personaje: Personaje; score: number };

/** Sugiere el Personaje cuyo rol/historia/contexto mejor coincide con la
 * idea — mismas `extraerPalabrasClave`/`contarCoincidencias` que ya usan
 * Motor IA y Conocimiento (reutilizacion.ts), sin duplicar el concepto.
 * `null` = sin coincidencia real (score 0) o sin Personajes disponibles;
 * el llamador debe caer a "Ninguno" en ese caso, no adivinar. */
export function personajeSugeridoPorIdea(
  personajes: Personaje[],
  personajesEstudio: Personaje[],
  idea: string,
): PersonajeSugerido | null {
  const todos = [...personajes, ...personajesEstudio];
  const palabrasClave = extraerPalabrasClave(idea);
  if (todos.length === 0 || palabrasClave.length === 0) return null;

  const puntuados = todos
    .map((personaje) => ({
      personaje,
      score: contarCoincidencias(
        `${personaje.nombre} ${personaje.rolEcosistema} ${personaje.historia} ${personaje.contexto} ${personaje.personalidad}`,
        palabrasClave,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return puntuados[0].score > 0 ? puntuados[0] : null;
}

export type DefaultsFormato = {
  tipoProduccion: string;
  duracion: string;
  numeroEscenas: string;
  numeroPaginas: string;
  estiloImagen: string;
};

/** Valores por defecto razonables según el Formato — el mismo criterio que
 * ya usan las opciones existentes de Paso 4 (nunca un valor inventado):
 * "IA decide automáticamente" ya es una opción real de Paso 2 para
 * cualquier Formato, así que es el default seguro para "cómo comunicarlo"
 * en todos los casos; duración/escenas/páginas/estilo solo se fijan donde
 * el Formato realmente tiene esos campos (ver mostrarPaso4 en
 * crear-campos.tsx — Historia no tiene ninguno). */
export function defaultsPorFormato(tipoContenido: string): DefaultsFormato {
  const base: DefaultsFormato = {
    tipoProduccion: "IA decide automáticamente",
    duracion: "",
    numeroEscenas: "",
    numeroPaginas: "",
    estiloImagen: "",
  };
  if (tipoContenido === "Video Corto") return { ...base, duracion: "30s", numeroEscenas: "5" };
  if (tipoContenido === "Carrusel") return { ...base, numeroPaginas: "7" };
  if (tipoContenido === "Imagen") return { ...base, estiloImagen: "Fotografía realista" };
  return base;
}

/** Divide `estructuraNarrativa` de un Motor ("1) Paso uno. 2) Paso dos...")
 * en pasos individuales cortos — reutilizado tal cual (el mismo texto que
 * ya se le muestra al usuario en la ficha del Motor) para poblar el Plan
 * de Producción con roles reales del Motor elegido, en vez de placeholders
 * genéricos. */
export function parsearPasosEstructura(estructuraNarrativa: string): string[] {
  return estructuraNarrativa
    .split(/\d+\)\s*/)
    .map((paso) => paso.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

function rolesEscenas(n: number, motor: MotorIA | null): string[] {
  if (n <= 1) return ["Contenido"];
  const pasos = motor ? parsearPasosEstructura(motor.estructuraNarrativa) : [];
  const roles: string[] = ["Gancho inicial"];
  const huecos = n - 2;
  for (let i = 0; i < huecos; i++) {
    roles.push(pasos[i] ?? `Desarrollo — parte ${i + 1}`);
  }
  roles.push("CTA / Cierre");
  return roles;
}

export type ItemPlan = { numero: number; rol: string };
export type EsqueletoPlan = { escenas: ItemPlan[]; extras: string[] };

/** Los Formatos cuya plantilla de exportación (`bloqueFormatoSalida` en
 * exportar-contexto.ts) no incluye "## Miniatura" — Imagen es la pieza
 * misma (no necesita portada aparte) e Historia no lleva portada. Debe
 * reflejar exactamente esa plantilla para que el Plan de Producción no
 * prometa una sección que el Kit final no va a traer. */
const FORMATOS_SIN_MINIATURA = new Set(["Imagen", "Historia"]);

/** Arma la ESTRUCTURA del Plan de Producción (roles narrativos por escena +
 * las secciones finales) antes de generar ningún prompt — determinista,
 * derivada de la misma cantidad de escenas/láminas que ya calcula
 * `defaultsPorFormato`/Paso 4, y del Motor elegido si hay uno. Es solo una
 * VISTA PREVIA de lo que el Kit real va a traer (ver `bloqueFormatoSalida`
 * en exportar-contexto.ts, que sigue siendo la única fuente de verdad de
 * la estructura real exportada). */
export function generarEsqueletoPlan(
  tipoContenido: string,
  config: { numeroEscenas: string; numeroPaginas: string },
  motor: MotorIA | null,
): EsqueletoPlan {
  let n: number;
  if (tipoContenido === "Imagen" || tipoContenido === "Historia") n = 1;
  else if (tipoContenido === "Carrusel") n = Number(config.numeroPaginas) || 7;
  else n = Number(config.numeroEscenas) || 5;

  const escenas = rolesEscenas(n, motor).map((rol, i) => ({ numero: i + 1, rol }));
  const extras = ["Copy", "Hashtags", "CTA"];
  if (!FORMATOS_SIN_MINIATURA.has(tipoContenido)) extras.push("Miniatura");

  return { escenas, extras };
}
