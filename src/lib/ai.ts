import { z } from "zod";
import { generarEstructurado } from "./ai-provider";

const PersonajeSchema = z.object({
  fisica: z.string().describe("Descripción física exacta, como instrucción para un fotógrafo"),
  vestuario: z.string().describe("Vestuario característico que usa siempre"),
  vozDescrita: z.string().describe("Cómo suena su voz: tono, ritmo, volumen"),
  personajePersonalidad: z.string().describe("Carácter: cómo reacciona, cómo trata a la audiencia"),
  gestos: z.string().describe("Manierismos físicos al hablar o moverse"),
  muletillas: z.string().describe("Frases que repite habitualmente"),
  look: z.string().describe("Sensación visual general de las piezas donde aparece"),
  camara: z.string().describe("Cómo se mueve la cámara cuando aparece en video"),
});

export type PersonajeSugerido = z.infer<typeof PersonajeSchema>;

/**
 * Genera un personaje/presentador coherente a partir de una descripción libre.
 * Si se pasa `contexto` (campos ya escritos por el usuario), la IA completa
 * solo lo que falta sin contradecir lo que ya existe — misma función que usan
 * "Generar personaje automáticamente" y "Sugerir el resto".
 */
export async function generarPersonaje(
  descripcion: string,
  contexto?: Partial<PersonajeSugerido>,
): Promise<PersonajeSugerido> {
  const prompt = contexto && Object.values(contexto).some((v) => v && v.trim())
    ? `Ya existe esta información parcial de un personaje para contenido: ${JSON.stringify(contexto)}. ` +
      `Completa SOLO los campos vacíos o pobres, de forma coherente con lo ya escrito, sin cambiar lo ` +
      `que ya tiene contenido sustancial. Descripción libre adicional del usuario: "${descripcion}".`
    : `Genera un personaje/presentador coherente para un creador de contenido a partir de esta ` +
      `descripción libre: "${descripcion}".`;

  return generarEstructurado(prompt, PersonajeSchema);
}

/** Alias de generarPersonaje: misma función, usada para "Sugerir el resto"
 * cuando el usuario ya escribió algunos campos del personaje. */
export const sugerirCamposPersonaje = generarPersonaje;

const AvatarSchema = z.object({
  nombreFicticio: z.string(),
  edad: z.string(),
  profesion: z.string(),
  nivelConocimiento: z.string(),
  problemasFrecuentes: z.string(),
  objetivos: z.string(),
  miedos: z.string(),
  queBuscaAprender: z.string(),
  comoConsumeContenido: z.string(),
  lenguaje: z.string(),
});

const IdentidadCompletaSchema = z.object({
  voz: z.string().describe("Voz y personalidad de la marca"),
  reglas: z.string().describe("Reglas de escritura, líneas rojas"),
  objetivo: z.string().describe("Objetivo principal del proyecto"),
  avatar: AvatarSchema,
  personajeNombre: z.string(),
  fisica: z.string(),
  vestuario: z.string(),
  vozDescrita: z.string(),
  personajePersonalidad: z.string(),
  gestos: z.string(),
  muletillas: z.string(),
  paleta: z.string(),
  tipografia: z.string(),
  look: z.string(),
  camara: z.string(),
  ritmo: z.string(),
  estructuraCta: z.string(),
});

export type IdentidadCompletaSugerida = z.infer<typeof IdentidadCompletaSchema>;

/**
 * Genera una identidad de marca completa (Marca, Avatar, Personaje, Estilo)
 * a partir de una descripción libre del proyecto. El usuario revisa y
 * confirma con "Guardar identidad" — esta función no escribe en la base
 * de datos.
 */
export async function completarProyecto(descripcion: string): Promise<IdentidadCompletaSugerida> {
  const prompt =
    `Genera una identidad de marca completa (voz, reglas de escritura, objetivo del proyecto, ` +
    `avatar del cliente ideal, personaje/presentador y estilo visual) para este proyecto de ` +
    `contenido, a partir de esta descripción libre: "${descripcion}". Si la descripción no menciona ` +
    `un personaje o presentador, invéntalo de forma coherente con el resto.`;

  return generarEstructurado(prompt, IdentidadCompletaSchema);
}

const EscenaSchema = z.object({
  numero: z.number(),
  duracionSegundos: z.number(),
  descripcion: z.string(),
  guionHablado: z.string(),
  promptImagen: z.string(),
  promptVideo: z.string(),
  textoEnPantalla: z.string(),
});

const ContenidoGeneradoSchema = z.object({
  titulo: z.string().describe("Título o hook inicial de la pieza"),
  copy: z.string().describe("Texto/copy de la publicación; cadena vacía si no aplica"),
  hashtags: z.string().describe("Hashtags recomendados separados por espacio; cadena vacía si no aplica"),
  cta: z.string().describe("Llamado a la acción de cierre; cadena vacía si no aplica"),
  narracion: z.string().describe(
    "Narración/voz en off general de la pieza, distinta del diálogo de cada escena; " +
      "cadena vacía si el tipo de producción no la requiere (ej. persona hablando a cámara)",
  ),
  miniatura: z.string().describe("Descripción de la miniatura/thumbnail; cadena vacía si no aplica"),
  escenas: z
    .array(EscenaSchema)
    .describe(
      "Unidad estructural universal: para Video Corto/Largo son escenas reales con duración; " +
        "para Carrusel es una escena por página (duracionSegundos: 0, promptVideo vacío); " +
        "para Imagen es un arreglo de un solo elemento; para Historia normalmente 1-2 elementos.",
    ),
});

export type ContenidoGenerado = z.infer<typeof ContenidoGeneradoSchema>;

export type ContenidoInput = {
  tipoContenido: "Video Corto" | "Carrusel" | "Imagen" | "Historia" | "Video Largo";
  tipoProduccion: string;
  tema: string;
  identidadCompilada: string;
  /** Entradas de la Base de Conocimiento del proyecto relevantes para
   * `tema` (encontradas por `buscarContenidoRelacionado`); opcional —
   * cadena vacía o undefined si no hay ninguna coincidencia. */
  conocimientoRelevante?: string;
  plataforma?: string;
  duracionSegundos?: number;
  numeroEscenas?: number;
  numeroPaginas?: number;
  estiloImagen?: string;
};

/**
 * Genera una pieza de contenido real (copy, hashtags, escenas/páginas
 * estructuradas, etc.) siguiendo al pie de la letra la identidad ya
 * compilada del proyecto. No escribe en la base de datos — el usuario
 * revisa el resultado por pestañas y confirma con "Guardar en Biblioteca".
 * Es la única función de generación; los 3 modos de "Crear" la comparten.
 */
export async function generarContenido(input: ContenidoInput): Promise<ContenidoGenerado> {
  const opciones = [
    input.plataforma && input.plataforma !== "Automático"
      ? `Plataforma: ${input.plataforma}. El tono y ritmo del copy deben adaptarse a esta ` +
        `plataforma específicamente, aunque el tipo de contenido sea el mismo en otras.`
      : "Plataforma: automática — elige la más adecuada según el tema.",
    input.duracionSegundos ? `Duración objetivo: ${input.duracionSegundos} segundos.` : "",
    input.numeroEscenas
      ? `Número de escenas: exactamente ${input.numeroEscenas}.`
      : input.tipoContenido === "Video Corto" || input.tipoContenido === "Video Largo"
        ? "Número de escenas: automático — elige la mejor estructura para el tema."
        : "",
    input.numeroPaginas
      ? `Número de páginas del carrusel: exactamente ${input.numeroPaginas}.`
      : input.tipoContenido === "Carrusel"
        ? "Número de páginas: automático — elige la mejor estructura para el tema."
        : "",
    input.estiloImagen && input.estiloImagen !== "Automático"
      ? `Estilo de imagen: ${input.estiloImagen}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt =
    `Eres el equipo creativo (Director de Marketing + Director Creativo) de este proyecto de ` +
    `contenido. Esta es la identidad de marca — síguela al pie de la letra, sin resumirla ni ` +
    `contradecirla:\n\n${input.identidadCompilada}\n\n` +
    (input.conocimientoRelevante
      ? `Este es material de referencia de la Base de Conocimiento del proyecto, relevante para ` +
        `este tema — úsalo para que el contenido sea preciso y específico, sin inventar datos ` +
        `que lo contradigan:\n\n${input.conocimientoRelevante}\n\n`
      : "") +
    `Genera contenido de tipo "${input.tipoContenido}", producido como "${input.tipoProduccion}", ` +
    `sobre este tema: "${input.tema}". ${opciones} ` +
    `Recuerda: "escenas" es la unidad estructural universal — para Carrusel cada elemento es una ` +
    `página (sin duración, sin prompt de video); para Imagen es un solo elemento; para Historia ` +
    `decide tú la cantidad. No dejes "escenas" vacío salvo que el tipo de producción sea puramente ` +
    `texto sin ningún componente visual.`;

  return generarEstructurado(prompt, ContenidoGeneradoSchema, 4096);
}

const ConfiguracionInferidaSchema = z.object({
  formato: z.enum(["Video Corto", "Carrusel", "Imagen", "Historia", "Video Largo"]),
  tipoProduccion: z.string(),
  plataforma: z.string().optional(),
  duracionSegundos: z.number().optional(),
  numeroEscenas: z.number().optional(),
  numeroPaginas: z.number().optional(),
  estiloImagen: z.string().optional(),
  razonamiento: z.string().describe("Explicación breve de por qué eligió esta configuración"),
});

export type ConfiguracionInferida = z.infer<typeof ConfiguracionInferidaSchema>;

/**
 * "Crear rápido": a partir de una idea libre, infiere qué tipo de
 * contenido, producción, plataforma y estructura conviene. El resultado se
 * muestra siempre como un resumen editable que el usuario confirma o ajusta
 * — nunca dispara la generación final directamente.
 */
export async function inferirConfiguracion(
  idea: string,
  identidadCompilada: string,
): Promise<ConfiguracionInferida> {
  const prompt =
    `Eres el Director de Marketing de este proyecto de contenido. Esta es su identidad de marca:\n\n` +
    `${identidadCompilada}\n\n` +
    `El usuario solo escribió esta idea, sin más detalles: "${idea}". Decide la configuración de ` +
    `producción más adecuada: tipo de contenido, tipo de producción, plataforma, duración o número ` +
    `de escenas/páginas según corresponda, y estilo de imagen si aplica. Explica brevemente por qué.`;

  return generarEstructurado(prompt, ConfiguracionInferidaSchema, 1024);
}
