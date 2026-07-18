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
