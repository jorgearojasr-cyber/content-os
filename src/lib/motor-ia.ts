import type { Identidad, MotorIA, Personaje } from "./types";

/**
 * MOTORES IA — capa de ESTRATEGIA NARRATIVA (cómo contar la idea: educativo,
 * comparativo, storytelling…). El Formato (Video Corto/Carrusel/Imagen/
 * Historia) sigue determinando la ESTRUCTURA de salida — ver
 * `construirPlantillaExportacion` en exportar-contexto.ts, que combina
 * ambas capas sin que una reemplace a la otra. Todo este módulo es texto
 * plano determinista: sin `fetch`, sin IA.
 */

const chips = (valor: string): string[] =>
  valor
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

export type MotorSugerido = { motor: MotorIA; porcentaje: number; coincidencias: string[] };

/**
 * Compara la idea escrita (Paso 3 de Crear) contra `palabrasClave` de cada
 * Motor — texto plano, sin IA. El % es la proporción de palabras clave del
 * Motor que aparecen en la idea (no al revés: un Motor con pocas palabras
 * clave muy específicas puede llegar a 100% con una idea corta). Solo
 * motores con al menos 1 coincidencia entran al resultado, ordenados por
 * % desc y, en empate, por `prioridad` desc.
 */
export function detectarMotoresSugeridos(idea: string, motores: readonly MotorIA[]): MotorSugerido[] {
  const ideaNormalizada = idea.toLowerCase();
  if (!ideaNormalizada.trim()) return [];

  const resultados: MotorSugerido[] = [];
  for (const motor of motores) {
    const palabras = chips(motor.palabrasClave);
    if (palabras.length === 0) continue;
    const coincidencias = palabras.filter((p) => ideaNormalizada.includes(p));
    if (coincidencias.length === 0) continue;
    resultados.push({
      motor,
      porcentaje: Math.round((coincidencias.length / palabras.length) * 100),
      coincidencias,
    });
  }

  return resultados.sort((a, b) => b.porcentaje - a.porcentaje || b.motor.prioridad - a.motor.prioridad);
}

export type ContextoVariablesMotor = {
  idea: string;
  identidad: Identidad | null;
  identidadCompilada: string;
  personaje?: Personaje | null;
  formato: string;
  plataforma?: string;
  conocimientoRelevante?: string;
  activosTexto?: string;
  proyectoNombre?: string;
};

/** Resuelve las 14 {{VARIABLES}} soportadas a partir de datos ya
 * disponibles al momento de exportar — nunca llama a compileIdentity de
 * nuevo, reutiliza lo que Crear ya calculó (identidadCompilada) más los
 * campos sueltos de Identidad para las variables más específicas. */
export function construirVariablesMotor(ctx: ContextoVariablesMotor): Record<string, string> {
  const id = ctx.identidad;
  return {
    IDEA: ctx.idea,
    MARCA: ctx.proyectoNombre ?? "",
    IDENTIDAD: ctx.identidadCompilada,
    PERSONAJE: ctx.personaje?.nombre ?? "",
    AUDIENCIA: id?.audiencia ?? "",
    ESTILO: id?.look ?? "",
    VOZ: id?.voz ?? "",
    CTA: id?.ctaHabituales ?? "",
    HASHTAGS: id?.hashtagsFrecuentes ?? "",
    CONOCIMIENTO: ctx.conocimientoRelevante ?? "",
    ACTIVOS: ctx.activosTexto ?? "",
    OBJETIVO: id?.objetivo ?? "",
    FORMATO: ctx.formato,
    PLATAFORMA: ctx.plataforma ?? "",
  };
}

/** Reemplazo determinista de {{VARIABLE}} por su valor resuelto — una
 * variable sin valor se reemplaza por "" (no deja el token a la vista). */
export function reemplazarVariablesMotor(promptMaestro: string, variables: Record<string, string>): string {
  return promptMaestro.replace(/\{\{(\w+)\}\}/g, (coincidencia, nombre) => variables[nombre] ?? "");
}

/** El bloque "## Estrategia narrativa" que se inyecta DENTRO de la
 * plantilla ya ramificada por Formato (nunca la reemplaza) — ver
 * `construirPlantillaExportacion`. "" si no hay Motor seleccionado. */
export function bloqueEstrategiaNarrativa(motor: MotorIA | null, variables: Record<string, string>): string {
  if (!motor) return "";
  const promptResuelto = reemplazarVariablesMotor(motor.promptMaestro, variables).trim();
  return (
    `## Estrategia narrativa: ${motor.nombre}\n` +
    `Cuenta esta idea siguiendo esta estrategia — define el ÁNGULO Y EL TONO narrativo, ` +
    `no la estructura de salida (esa la define el Formato más abajo):\n` +
    (promptResuelto || motor.descripcion)
  );
}
