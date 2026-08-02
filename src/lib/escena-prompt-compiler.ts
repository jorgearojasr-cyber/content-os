import { compilarPersonaje, linea, unir } from "./personaje-compiler";
import { recomendacionBaseParaPlano } from "./recomendaciones-audiovisuales";
import { movimientoSugeridoParaPlano } from "./decision-engine";
import { parseFotosPersonaje } from "./types";
import type { Activo, Personaje, Plano, StoryboardEscenaConPersonajes } from "./types";

/**
 * Compilador de prompts de Imagen/Video por escena — PREPARACION-FIX-1B.
 * Nivel B (ARCHITECTURE-MIGRATION): heurística local que nunca sale de
 * Content OS — ensamblado determinista puro, sin IA y sin llamada externa,
 * mismo principio y mismos helpers (`linea`/`unir`) que
 * `compilarPersonaje()`. Patrón 1 (fire-and-forget, ver
 * `docs/arquitectura/prompt-oficial.md`): Content OS solo arma el borrador
 * para que el usuario lo copie y lo corra en el generador de imagen/video
 * que prefiera — nunca necesita leer un resultado de vuelta.
 *
 * Reutiliza, sin reimplementar nada: los prompts de Personaje ya
 * compilados (`PromptsPersonaje.imagen`/`.video`), las heurísticas de
 * Plano ya existentes (`recomendacionBaseParaPlano`,
 * `movimientoSugeridoParaPlano`), el patrón de "usá la foto real en vez de
 * describir" ya usado para fotos de Personaje y de Activos visuales
 * (`identity-compiler.ts`), y el Formato ya elegido de la Producción para
 * sugerir relación de aspecto.
 *
 * El equivalente a `elementoConcreto` (Bloques) queda fuera a propósito:
 * hoy no hay forma determinista sólida de obtenerlo sin agregar un campo
 * nuevo a `StoryboardEscena` o sin recurrir a IA — ninguna de las dos
 * encaja en el alcance de esta ronda.
 */

const ASPECTO_POR_FORMATO: Record<string, string> = {
  "Post Instagram": "4:5 (vertical)",
  "Reel Instagram": "9:16 (vertical)",
  "Historia Instagram": "9:16 (vertical)",
  "Carrusel Instagram": "4:5 (vertical)",
  "Post Facebook": "4:5 (vertical)",
  "Historia Facebook": "9:16 (vertical)",
  TikTok: "9:16 (vertical)",
  "Video YouTube": "16:9 (horizontal)",
};

/** `null` para formatos sin relación de aspecto fija ("Imagen", "Nota
 * manual", "Otro formato") — mismo criterio que las tablas del Decision
 * Engine: nunca inventar un valor genérico cuando no hay uno real. */
function aspectoSugerido(formato: string): string | null {
  return ASPECTO_POR_FORMATO[formato] ?? null;
}

function bloquePersonajes(personajes: Personaje[], campo: "imagen" | "video"): string {
  if (personajes.length === 0) return "";
  const bloques = personajes.map((p) => {
    const fotos = parseFotosPersonaje(p.fotosUrlsJson);
    return compilarPersonaje(p, { fotos })[campo];
  });
  return personajes.length === 1
    ? bloques[0]
    : bloques.map((b, i) => `Personaje ${i + 1}:\n${b}`).join("\n\n");
}

function bloquePlano(plano: Plano | undefined): string {
  if (!plano) return "";
  return unir(linea("Plano", plano.nombre), recomendacionBaseParaPlano(plano.nombre) ?? "");
}

function bloqueLocacion(locacion: Activo | undefined): string {
  if (!locacion) return "";
  if (!locacion.valor) return linea("Locación", locacion.nombre);
  return `Locación: ${locacion.nombre}.\nUsa esta foto real del lugar como referencia (${locacion.valor}) en vez de describirlo desde cero.`;
}

function bloqueContenido(escena: StoryboardEscenaConPersonajes): string {
  return unir(
    linea("Qué pasa en la escena", escena.objetivoNarrativo),
    linea("Texto hablado", escena.textoHablado),
    linea("Texto en pantalla", escena.textoPantalla),
    linea("Emoción", escena.emocion),
  );
}

type ParametrosPrompt = {
  escena: StoryboardEscenaConPersonajes;
  personajes: Personaje[];
  plano: Plano | undefined;
  locacion: Activo | undefined;
  formato: string;
};

/** Borrador de prompt de Imagen — se ensambla igual para toda escena que
 * tenga al menos un dato resuelto; los bloques vacíos simplemente no
 * aparecen (`unir` los filtra), nunca un placeholder. */
export function promptImagenSugerido(params: ParametrosPrompt): string {
  const { escena, personajes, plano, locacion, formato } = params;
  const aspecto = aspectoSugerido(formato);
  return unir(
    bloquePersonajes(personajes, "imagen"),
    bloquePlano(plano),
    bloqueLocacion(locacion),
    bloqueContenido(escena),
    aspecto ? `Relación de aspecto: ${aspecto}.` : "",
  );
}

/** Borrador de prompt de Video — mismos bloques que Imagen más movimiento
 * de cámara y duración, que solo aplican a video. Prefiere el
 * `movimientoCamara` ya guardado en la escena (puede venir del CBD o de la
 * sugerencia Automática del Decision Engine, ya aceptada); si está vacío,
 * recurre a la misma heurística de Plano en vez de dejarlo afuera. */
export function promptVideoSugerido(params: ParametrosPrompt): string {
  const { escena, personajes, plano, locacion, formato } = params;
  const aspecto = aspectoSugerido(formato);
  const movimiento = escena.movimientoCamara.trim() || (plano ? movimientoSugeridoParaPlano(plano.nombre) : null);
  return unir(
    bloquePersonajes(personajes, "video"),
    bloquePlano(plano),
    movimiento ? linea("Movimiento de cámara", movimiento) : "",
    bloqueLocacion(locacion),
    bloqueContenido(escena),
    escena.duracionSegundos > 0 ? linea("Duración aproximada", `${escena.duracionSegundos} segundos`) : "",
    aspecto ? `Relación de aspecto: ${aspecto}.` : "",
  );
}
