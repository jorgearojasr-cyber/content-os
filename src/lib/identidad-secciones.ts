import {
  calcularMadurezIdentidad,
  estadoBloque,
  type CampoParaMadurez,
  type EstadoBloque,
  type NivelCampo,
  type ResultadoMadurez,
} from "./madurez";
import type { Identidad } from "./types";

/**
 * AGRUPACIÓN TEMÁTICA de la pantalla Identidad ("entrenamiento permanente
 * de marca") — SOLO presentación: los campos conservan su nombre en la
 * base de datos y en el compilador; acá solo se decide en qué sección
 * plegable vive cada uno y cómo se calcula el progreso "n/m completados".
 *
 * `logoUrl` cuenta para el progreso de Visual pero se renderiza con su
 * propio FileUploader (no un FieldWithHelp) — ver identidad/page.tsx.
 * Contacto queda fuera de estas 6 secciones: sigue siendo su propia
 * sección opcional, sin contar para el "entrenamiento".
 */
export type CampoDeSeccion = keyof Pick<
  Identidad,
  | "historia"
  | "valores"
  | "promesa"
  | "posicionamiento"
  | "arquetipo"
  | "manifiesto"
  | "objetivo"
  | "manualMarca"
  | "audiencia"
  | "emociones"
  | "impactoEsperado"
  | "adaptacionAudiencia"
  | "voz"
  | "formalidad"
  | "humor"
  | "nivelTecnico"
  | "palabrasSiempre"
  | "palabrasNunca"
  | "frasesCaracteristicas"
  | "estructuraContenidos"
  | "reglas"
  | "estructuraCta"
  | "ctaHabituales"
  | "hashtagsFrecuentes"
  | "respuestaCriticas"
  | "paleta"
  | "tipografia"
  | "look"
  | "camara"
  | "ritmo"
  | "logoUrl"
  | "restricciones"
  | "competidores"
  | "diferenciadores"
>;

export type SeccionIdentidad = {
  id: string;
  titulo: string;
  subtitulo: string;
  campos: readonly CampoDeSeccion[];
};

export const SECCIONES_IDENTIDAD: readonly SeccionIdentidad[] = [
  {
    id: "esencia",
    titulo: "Esencia",
    subtitulo: "Qué es la marca y por qué existe — la base de todo lo demás.",
    campos: ["historia", "valores", "promesa", "posicionamiento", "arquetipo", "manifiesto", "objetivo", "manualMarca"],
  },
  {
    id: "audiencia",
    titulo: "Audiencia",
    subtitulo: "A quién le habla, qué debe sentir y pensar — los Avatares de abajo son los perfiles detallados.",
    campos: ["audiencia", "emociones", "impactoEsperado", "adaptacionAudiencia"],
  },
  {
    id: "voz",
    titulo: "Voz y estilo",
    subtitulo: "Cómo suena la marca: tono, formalidad, humor y las palabras que la delatan.",
    campos: [
      "voz",
      "formalidad",
      "humor",
      "nivelTecnico",
      "palabrasSiempre",
      "palabrasNunca",
      "frasesCaracteristicas",
    ],
  },
  {
    id: "contenido",
    titulo: "Contenido",
    subtitulo: "Cómo se estructura y cierra cada pieza, y cómo responde la marca.",
    campos: [
      "estructuraContenidos",
      "reglas",
      "estructuraCta",
      "ctaHabituales",
      "hashtagsFrecuentes",
      "respuestaCriticas",
    ],
  },
  {
    id: "visual",
    titulo: "Visual",
    subtitulo: "Cómo se ve cada pieza — colores, tipografía, look y cámara.",
    campos: ["paleta", "tipografia", "look", "camara", "ritmo", "logoUrl"],
  },
  {
    id: "limites",
    titulo: "Límites",
    subtitulo: "Lo que la marca jamás haría, y frente a quién se diferencia.",
    campos: ["restricciones", "competidores", "diferenciadores"],
  },
];

/** Progreso "n de m" de una sección — campos con contenido / total. */
export function progresoSeccion(
  identidad: Identidad,
  seccion: SeccionIdentidad,
): { completados: number; total: number } {
  const completados = seccion.campos.filter((campo) => identidad[campo].trim().length > 0).length;
  return { completados, total: seccion.campos.length };
}

/** El primer campo con contenido de la sección — para el resumen de una
 * línea cuando la sección está plegada. */
export function primerCampoConContenido(identidad: Identidad, seccion: SeccionIdentidad): string {
  for (const campo of seccion.campos) {
    const valor = identidad[campo];
    if (valor.trim().length > 0) return valor.trim();
  }
  return "";
}

/**
 * MADUREZ DE MARCA — clasificación de los 34 campos "de entrenamiento"
 * (las 6 secciones de arriba; Contacto queda fuera, como siempre) en 3
 * niveles de importancia para la calidad del contexto exportado. Es
 * SOLO una capa visual/UX: `compileIdentity` no cambia, no reordena ni
 * filtra nada — un campo opcional vacío sigue sin aparecer en el texto
 * igual que hoy, y uno lleno aparece igual que hoy.
 *
 * Ajustes de criterio sobre la sugerencia inicial (reportados, no son
 * silenciosos): se subieron a 🟢 Esencial `reglas` (principios
 * editoriales — moldea CADA pieza de texto tanto como `voz`) y
 * `restricciones` (guardrail de marca, ya era el campo más enfatizado en
 * los ejemplos de la pestaña). El resto de campos no mencionados
 * explícitamente en la sugerencia se ubicó por cercanía temática al
 * campo más parecido que sí fue clasificado.
 */
export const NIVELES_CAMPOS_IDENTIDAD: Record<CampoDeSeccion, NivelCampo> = {
  // Esencia
  historia: "esencial",
  valores: "esencial",
  promesa: "esencial",
  posicionamiento: "esencial",
  arquetipo: "esencial",
  manifiesto: "recomendado",
  objetivo: "esencial",
  manualMarca: "opcional",
  // Audiencia
  audiencia: "esencial",
  emociones: "recomendado",
  impactoEsperado: "recomendado",
  adaptacionAudiencia: "recomendado",
  // Voz y estilo
  voz: "esencial",
  formalidad: "recomendado",
  humor: "opcional",
  nivelTecnico: "recomendado",
  palabrasSiempre: "recomendado",
  palabrasNunca: "opcional",
  frasesCaracteristicas: "recomendado",
  // Contenido
  estructuraContenidos: "recomendado",
  reglas: "esencial",
  estructuraCta: "opcional",
  ctaHabituales: "recomendado",
  hashtagsFrecuentes: "recomendado",
  respuestaCriticas: "opcional",
  // Visual
  paleta: "recomendado",
  tipografia: "opcional",
  look: "recomendado",
  camara: "recomendado",
  ritmo: "opcional",
  logoUrl: "opcional",
  // Límites
  restricciones: "esencial",
  competidores: "recomendado",
  diferenciadores: "recomendado",
};

function camposParaMadurez(identidad: Identidad, campos: readonly CampoDeSeccion[]): CampoParaMadurez[] {
  return campos.map((campo) => ({ valor: identidad[campo], nivel: NIVELES_CAMPOS_IDENTIDAD[campo] }));
}

/** Madurez ponderada de una sección sola — usada para el detalle interno;
 * el estado ✓/⚠/○ del encabezado usa `estadoSeccion` (no ponderado). */
export function madurezSeccion(identidad: Identidad, seccion: SeccionIdentidad): ResultadoMadurez {
  return calcularMadurezIdentidad(camposParaMadurez(identidad, seccion.campos));
}

/** ✓ Completo / ⚠ Parcial / ○ Pendiente de una sección, calculado
 * automáticamente a partir de cuántos de sus campos tienen contenido. */
export function estadoSeccion(identidad: Identidad, seccion: SeccionIdentidad): EstadoBloque {
  return estadoBloque(camposParaMadurez(identidad, seccion.campos));
}

/** Madurez ponderada de TODA la Identidad (las 34 campos de las 6
 * secciones) — la barra de progreso principal de la pestaña. */
export function madurezIdentidadCompleta(identidad: Identidad): ResultadoMadurez {
  const todos = SECCIONES_IDENTIDAD.flatMap((s) => camposParaMadurez(identidad, s.campos));
  return calcularMadurezIdentidad(todos);
}
