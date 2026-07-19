import {
  calcularMadurezIdentidad,
  estadoBloque,
  type CampoParaMadurez,
  type EstadoBloque,
  type NivelCampo,
  type ResultadoMadurez,
} from "./madurez";
import type { Personaje } from "./types";

/**
 * AGRUPACIÓN TEMÁTICA de la ficha de Personaje ("sistema de identidad
 * completo") — mismo principio que `identidad-secciones.ts`: los campos
 * conservan su nombre en la base de datos, acá solo se decide en qué
 * sección plegable vive cada uno. Los campos que YA EXISTÍAN antes de esta
 * ronda (`personalidad`, `fisica`, `vestuario`, `vozDescrita`, `gestos`,
 * `muletillas`, `historia`, `edad`, `profesion`, `contexto`) se REUBICAN
 * acá, no se duplican — ver mapeo completo en el commit de esta ronda.
 *
 * `nombre`, los prompts maestros manuales y `notas` quedan fuera de estas
 * 7 secciones (viven en su propio lugar del formulario, sin cambios).
 */
export type CampoDeSeccionPersonaje = keyof Pick<
  Personaje,
  | "rolEcosistema"
  | "lugarOrigen"
  | "relacionOtrosPersonajes"
  | "contexto"
  | "personalidad"
  | "temperamento"
  | "nivelEnergia"
  | "formaEnsenar"
  | "formaResponder"
  | "emocionesTransmite"
  | "defectos"
  | "fortalezas"
  | "valores"
  | "queNuncaHaria"
  | "vozDescrita"
  | "muletillas"
  | "acento"
  | "velocidad"
  | "tono"
  | "volumen"
  | "palabrasFavoritas"
  | "palabrasProhibidas"
  | "formalidad"
  | "humor"
  | "nivelTecnico"
  | "fisica"
  | "vestuario"
  | "edad"
  | "altura"
  | "complexion"
  | "edadAparente"
  | "colorPiel"
  | "cabello"
  | "barba"
  | "ojos"
  | "expresionesHabituales"
  | "postura"
  | "accesorios"
  | "gestos"
  | "gestoManos"
  | "gestoMirada"
  | "gestoSonrisa"
  | "gestoSenalar"
  | "formaCaminar"
  | "formaPararse"
  | "formaInteractuar"
  | "historia"
  | "herramientasQueUsa"
  | "materialesQueMuestra"
  | "ambientesProhibidos"
  | "elementosInvariables"
>;

export type SeccionPersonaje = {
  id: string;
  titulo: string;
  subtitulo: string;
  campos: readonly CampoDeSeccionPersonaje[];
};

export const SECCIONES_PERSONAJE: readonly SeccionPersonaje[] = [
  {
    id: "identidad",
    titulo: "Identidad",
    subtitulo: "Quién es dentro del ecosistema de contenido y de dónde viene.",
    campos: ["rolEcosistema", "lugarOrigen", "relacionOtrosPersonajes", "contexto", "historia"],
  },
  {
    id: "personalidad",
    titulo: "Personalidad",
    subtitulo: "Cómo es por dentro — temperamento, valores y lo que nunca haría.",
    campos: [
      "personalidad",
      "temperamento",
      "nivelEnergia",
      "formaEnsenar",
      "formaResponder",
      "emocionesTransmite",
      "defectos",
      "fortalezas",
      "valores",
      "queNuncaHaria",
    ],
  },
  {
    id: "comunicacion",
    titulo: "Comunicación",
    subtitulo: "Cómo habla — acento, ritmo, palabras propias y el tono heredado de la marca.",
    campos: [
      "vozDescrita",
      "muletillas",
      "acento",
      "velocidad",
      "tono",
      "volumen",
      "palabrasFavoritas",
      "palabrasProhibidas",
      "formalidad",
      "humor",
      "nivelTecnico",
    ],
  },
  {
    id: "apariencia",
    titulo: "Apariencia física",
    subtitulo: "Cómo se ve — para que la IA de imagen lo dibuje siempre igual.",
    campos: [
      "fisica",
      "vestuario",
      "edad",
      "altura",
      "complexion",
      "edadAparente",
      "colorPiel",
      "cabello",
      "barba",
      "ojos",
      "expresionesHabituales",
      "postura",
      "accesorios",
    ],
  },
  {
    id: "gestos",
    titulo: "Gestos",
    subtitulo: "Cómo se mueve — alimenta específicamente el Prompt Video.",
    campos: [
      "gestos",
      "gestoManos",
      "gestoMirada",
      "gestoSonrisa",
      "gestoSenalar",
      "formaCaminar",
      "formaPararse",
      "formaInteractuar",
    ],
  },
  {
    id: "contexto-aparicion",
    titulo: "Contexto de aparición",
    subtitulo: "Qué herramientas usa, qué muestra y qué ambientes nunca deberían aparecer.",
    campos: ["herramientasQueUsa", "materialesQueMuestra", "ambientesProhibidos"],
  },
  {
    id: "invariables",
    titulo: "Elementos Invariables",
    subtitulo: "Vestuario que nunca cambia + lo que jamás haría físicamente — máxima prioridad.",
    campos: ["elementosInvariables"],
  },
];

/** Clasificación en 3 niveles — mismo criterio que Identidad: los campos
 * generales/resumen (nombre implícito, personalidad, fisica, vozDescrita)
 * y el rol pesan más que las facetas granulares, que a su vez pesan más
 * que los detalles de nicho. Elementos Invariables es Esencial: es lo
 * primero que entra a cada prompt. */
export const NIVELES_CAMPOS_PERSONAJE: Record<CampoDeSeccionPersonaje, NivelCampo> = {
  rolEcosistema: "esencial",
  lugarOrigen: "opcional",
  relacionOtrosPersonajes: "opcional",
  contexto: "recomendado",
  historia: "recomendado",
  personalidad: "esencial",
  temperamento: "recomendado",
  nivelEnergia: "recomendado",
  formaEnsenar: "recomendado",
  formaResponder: "recomendado",
  emocionesTransmite: "recomendado",
  defectos: "recomendado",
  fortalezas: "recomendado",
  valores: "recomendado",
  queNuncaHaria: "recomendado",
  vozDescrita: "esencial",
  muletillas: "recomendado",
  acento: "opcional",
  velocidad: "opcional",
  tono: "recomendado",
  volumen: "opcional",
  palabrasFavoritas: "recomendado",
  palabrasProhibidas: "opcional",
  formalidad: "opcional",
  humor: "opcional",
  nivelTecnico: "opcional",
  fisica: "esencial",
  vestuario: "recomendado",
  edad: "opcional",
  altura: "opcional",
  complexion: "opcional",
  edadAparente: "recomendado",
  colorPiel: "opcional",
  cabello: "recomendado",
  barba: "opcional",
  ojos: "recomendado",
  expresionesHabituales: "opcional",
  postura: "opcional",
  accesorios: "opcional",
  gestos: "recomendado",
  gestoManos: "recomendado",
  gestoMirada: "recomendado",
  gestoSonrisa: "recomendado",
  gestoSenalar: "opcional",
  formaCaminar: "recomendado",
  formaPararse: "opcional",
  formaInteractuar: "recomendado",
  herramientasQueUsa: "recomendado",
  materialesQueMuestra: "recomendado",
  ambientesProhibidos: "opcional",
  elementosInvariables: "esencial",
};

function camposParaMadurez(personaje: Personaje, campos: readonly CampoDeSeccionPersonaje[]): CampoParaMadurez[] {
  return campos.map((campo) => ({ valor: personaje[campo], nivel: NIVELES_CAMPOS_PERSONAJE[campo] }));
}

export function madurezSeccionPersonaje(personaje: Personaje, seccion: SeccionPersonaje): ResultadoMadurez {
  return calcularMadurezIdentidad(camposParaMadurez(personaje, seccion.campos));
}

export function estadoSeccionPersonaje(personaje: Personaje, seccion: SeccionPersonaje): EstadoBloque {
  return estadoBloque(camposParaMadurez(personaje, seccion.campos));
}

/** Nivel de entrenamiento de TODO el Personaje — reutiliza el mismo motor
 * que la Identidad de marca (Fase A), sobre los campos de las 7 secciones
 * de arriba. */
export function madurezPersonajeCompleta(personaje: Personaje): ResultadoMadurez {
  const todos = SECCIONES_PERSONAJE.flatMap((s) => camposParaMadurez(personaje, s.campos));
  return calcularMadurezIdentidad(todos);
}

export function progresoSeccionPersonaje(
  personaje: Personaje,
  seccion: SeccionPersonaje,
): { completados: number; total: number } {
  // `?? ""` — defensivo ante un `personaje` incompleto (nunca debería pasar
  // con una fila real de la base de datos, pero evita un TypeError si algún
  // llamador futuro pasa un objeto parcial en vez de `null`).
  const completados = seccion.campos.filter((campo) => (personaje[campo] ?? "").trim().length > 0).length;
  return { completados, total: seccion.campos.length };
}
