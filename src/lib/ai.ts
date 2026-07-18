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
  activoReferenciado: z.string().describe(
    "Si el concepto de esta escena coincide con la etiqueta de un Activo "
      + "visual disponible (ver sección '## Activos visuales disponibles' "
      + "de la identidad), pon aquí EXACTAMENTE esa etiqueta tal como "
      + "aparece ahí — así el sistema puede vincular la foto real. Cadena "
      + "vacía si ninguna etiqueta coincide con esta escena, o si esa "
      + "sección no existe en la identidad.",
  ),
  textoEnPantalla: z.string(),
  elementoConcreto: z.string().describe(
    "Solo para contenido tipo lista de N cosas/elementos (ej. carrusel de "
      + "'7 cosas indispensables'): el objeto o elemento FÍSICO CONCRETO de "
      + "esta escena, listo para fotografiar — nunca el concepto abstracto. "
      + "Ej. 'membrana asfáltica aplicada en la base de un muro exterior', no "
      + "'Impermeabilización'; 'tablero eléctrico con protector diferencial "
      + "visible, marca genérica, instalado en pared', no 'Tablero eléctrico "
      + "seguro'. Cadena vacía si esta pieza no es de tipo lista de elementos.",
  ),
  // NOTA: promptVisual se genera ANTES que promptVideo a propósito (orden
  // de campos del schema = orden de generación). Cuando promptVisual venía
  // después, el modelo la dejaba vacía con frecuencia razonando que ya
  // había cubierto lo visual en promptVideo — con este orden, promptVideo
  // es el que referencia a promptVisual (ya escrito), nunca al revés.
  promptVisual: z.string().describe(
    "Prompt de imagen fija para producción manual asistida (Gemini/Nano "
      + "Banana como herramienta principal) — un solo párrafo en español, "
      + "sintaxis natural y descriptiva, SIN parámetros técnicos de otra "
      + "herramienta (nada de '--ar', '--v', etc.). Combina, cuando aplique: "
      + "el elementoConcreto de esta escena, la acción o composición (ej. "
      + "'de pie junto a', 'señalando'), el texto en pantalla que debe "
      + "aparecer legible en la imagen, y el estilo visual de marca (colores, "
      + "tono) tomado de la Identidad. Misma REGLA CLAVE sobre Personajes que "
      + "en promptVideo: si el Personaje de esta escena tiene 'Fotos de "
      + "referencia' cargadas en la identidad, NO redescribas su apariencia "
      + "física en texto — el usuario pega esa foto junto con este prompt en "
      + "Gemini, así que basta con mencionar brevemente que debe respetar la "
      + "identidad visual del Personaje de la foto adjunta. Sin fotos "
      + "cargadas, sí incluye la descripción física exacta de cada Personaje "
      + "que participe en esta escena (todos, si hay más de uno). Misma "
      + "lógica para lugares: si `activoReferenciado` de esta escena "
      + "coincide con un Activo visual (ver identidad), no describas ese "
      + "espacio desde cero — basta con mencionar brevemente que debe "
      + "respetar la foto real adjunta de ese lugar. IMPORTANTE — NUNCA "
      + "dejes este campo vacío si la escena tiene algún componente visual "
      + "(la enorme mayoría de las escenas lo tiene): 'Personaje con fotos "
      + "de referencia' o 'Activo con foto real' significan escribir la "
      + "mención BREVE indicada arriba, nunca significan campo vacío — un "
      + "párrafo corto de una oración sigue siendo válido y necesario. "
      + "Cadena vacía ÚNICAMENTE si la escena es 100% texto sin ningún "
      + "elemento visual (ej. una transición de solo texto en pantalla).",
  ),
  promptVideo: z.string().describe(
    "Prompt para herramientas de video IA (Kling/Runway/Veo) — un párrafo "
      + "en español enfocado en ACCIÓN, composición, movimiento de cámara, "
      + "iluminación y diálogo/gestos de esta escena. Es un campo "
      + "independiente y COMPLEMENTARIO a promptVisual (ya escrito arriba "
      + "para esta misma escena) — no lo dejes vacío solo porque promptVisual "
      + "ya describió la composición fija: promptVideo agrega específicamente "
      + "el movimiento/acción que promptVisual no cubre. REGLA CLAVE sobre "
      + "Personajes: revisa la sección 'Personaje'/'Personajes' de la "
      + "identidad de arriba — si el Personaje de esta escena tiene 'Fotos "
      + "de referencia' cargadas ahí, NO redescribas su edad, rasgos "
      + "físicos, vestimenta ni apariencia en este texto (sería redundante "
      + "y puede contradecir la foto real); en su lugar, indica "
      + "explícitamente que se debe usar la imagen de referencia adjunta "
      + "para mantener su identidad (ej. 'usa la imagen de referencia del "
      + "personaje para mantener su apariencia exacta') y dedica el resto "
      + "del párrafo por completo a la dirección de la escena. Si el "
      + "Personaje NO tiene fotos de referencia cargadas (o la escena no "
      + "usa ningún Personaje), sí incluye su descripción física completa "
      + "como referencia visual, igual que en promptVisual. Misma regla "
      + "para lugares: si `activoReferenciado` de esta escena coincide con "
      + "un Activo visual (ver identidad), no describas ese espacio en "
      + "texto — indica usar esa foto real como referencia. Cadena vacía "
      + "si esta escena no tiene componente de video (ej. Carrusel/Imagen).",
  ),
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
  plataforma?: string;
  duracionSegundos?: number;
  numeroEscenas?: number;
  numeroPaginas?: number;
  estiloImagen?: string;
  /** Aspect ratio del Tipo de publicación elegido (Paso 4, ej. "9:16" para
   * Reel/Story, "4:5" para Post/Carrusel) — ver TIPOS_PUBLICACION_POR_PLATAFORMA
   * en types.ts. Ausente = sin formato específico, la IA decide el encuadre. */
  aspectRatio?: string;
  /** `true` cuando `identidadCompilada` incluye 2+ Personajes seleccionados
   * juntos (sección "## Personajes" del Compilador, no "## Personaje") —
   * refuerza en el prompt principal que el guion/copy, no solo el prompt
   * visual, debe reflejar la interacción entre ellos. */
  variosPersonajes?: boolean;
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
    input.aspectRatio
      ? `Formato/encuadre de esta pieza: ${input.aspectRatio}` +
        `${input.aspectRatio === "9:16" ? " (vertical)" : input.aspectRatio === "16:9" ? " (horizontal)" : input.aspectRatio === "1:1" ? " (cuadrado)" : ""}. ` +
        `Cada "promptVisual" debe describir explícitamente ese encuadre/orientación.`
      : "",
    input.variosPersonajes
      ? `Esta pieza tiene más de un Personaje (ver "## Personajes" arriba). En las escenas donde ` +
        `coincidan, "guionHablado"/"copy" deben reflejar el diálogo o interacción real entre ellos — ` +
        `no un narrador único ignorando que son varios.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt =
    `Eres el equipo creativo (Director de Marketing + Director Creativo) de este proyecto de ` +
    `contenido. Esta es la identidad de marca — síguela al pie de la letra, sin resumirla ni ` +
    `contradecirla:\n\n${input.identidadCompilada}\n\n` +
    `Genera contenido de tipo "${input.tipoContenido}", producido como "${input.tipoProduccion}", ` +
    `sobre este tema: "${input.tema}". ${opciones} ` +
    `Recuerda: "escenas" es la unidad estructural universal — para Carrusel cada elemento es una ` +
    `página (sin duración, sin prompt de video); para Imagen es un solo elemento; para Historia ` +
    `decide tú la cantidad. No dejes "escenas" vacío salvo que el tipo de producción sea puramente ` +
    `texto sin ningún componente visual. Si el tema es una lista de N cosas/elementos (ej. "7 cosas ` +
    `indispensables"), cada escena debe identificar en "elementoConcreto" el objeto físico exacto de ` +
    `esa escena, nunca el concepto abstracto — es lo que hace que "promptVisual" sea fotografiable de ` +
    `verdad. Completa "promptVisual" en cada escena con componente visual de imagen fija: un párrafo ` +
    `natural en español lista para pegar en Gemini, sin parámetros técnicos de otras herramientas. ` +
    `IMPORTANTE: "promptVisual" y "promptVideo" son dos campos independientes con propósitos ` +
    `distintos (imagen fija para producción manual vs. animación para Kling/Runway/Veo) — completar ` +
    `uno NUNCA es excusa para dejar el otro vacío cuando la escena tiene componente visual; ambos ` +
    `deben tener contenido real en cada escena que lo requiera, sin excepción.`;

  // 6144 en vez de 4096: cada escena ahora suma dos campos más
  // (elementoConcreto + promptVisual) — con 8 escenas (ej. un carrusel
  // largo) el límite anterior se quedaba corto y truncaba la respuesta.
  return generarEstructurado(prompt, ContenidoGeneradoSchema, 6144);
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

const PorEscenaEdicionSchema = z.object({
  numero: z.number().describe("Debe coincidir exactamente con el número de la escena real"),
  duracionSugerida: z
    .number()
    .describe(
      "Duración sugerida en segundos para esta escena en el corte final — en una conversión a video, cuántos segundos mostrar esta lámina",
    ),
  movimientoCamara: z
    .string()
    .describe(
      "Ej: zoom lento, zoom rápido, cámara fija, handheld, paneo, tilt, cámara lenta — en una conversión a video, el movimiento aplicado a la imagen estática (efecto Ken Burns, zoom-pan)",
    ),
  transicionEntrada: z
    .string()
    .describe("Cómo entra esta escena desde la anterior: corte seco, corte en el beat, whip pan, match cut, fade..."),
  elementosGraficos: z
    .string()
    .describe("Ej: flecha señalando, círculo resaltando, check, texto grande, contador — vacío si no aplica"),
  notaDeEdicion: z
    .string()
    .describe("La instrucción concreta del editor para esta escena, ej. 'corta en seco al decir X', 'congela el cuadro aquí'"),
});

const EvaluacionCriterioSchema = z.object({
  nota: z.number().describe("Nota de 1 a 10"),
  comentario: z.string(),
});

const PlanEdicionSchema = z.object({
  ritmoGeneral: z.object({
    recomendacion: z.enum(["Muy dinámico", "Dinámico", "Medio", "Tranquilo"]),
    porQue: z.string(),
  }),
  porEscena: z.array(PorEscenaEdicionSchema),
  bRoll: z.array(z.string()).describe("Tomas de apoyo concretas al contenido de esta pieza, no genéricas"),
  efectosSonido: z
    .array(
      z.object({
        momento: z.string(),
        efecto: z
          .string()
          .describe("Solo el nombre descriptivo del SFX, ej. impact, bass, paper, hammer, spark, camera"),
      }),
    )
    .describe("Momentos donde usar un efecto de sonido"),
  musica: z
    .string()
    .describe("Dirección de música por tramo, ej. 'intro: tensión ascendente; tips: beat constante; cierre: resolución'"),
  color: z.object({
    recomendacion: z.string().describe("Ej: natural, cálido, frío, documental, publicidad, contraste alto"),
    porQue: z.string(),
  }),
  animaciones: z.array(z.string()).describe("Cuándo animar texto, íconos, logo o CTA"),
  pausas: z.array(z.string()).describe("Dónde conviene una pausa o silencio deliberado"),
  evaluacionCta: z.object({
    analisis: z.string().describe("Si el CTA está bien ubicado y por qué"),
    mejoraSugerida: z.string(),
  }),
  evaluacionFinal: z.object({
    gancho: EvaluacionCriterioSchema,
    claridad: EvaluacionCriterioSchema,
    retencion: EvaluacionCriterioSchema,
    ritmo: EvaluacionCriterioSchema,
    valorEducativo: EvaluacionCriterioSchema,
    potencialViralidad: EvaluacionCriterioSchema,
    recomendaciones: z.array(z.string()).describe("2-3 recomendaciones concretas de mejora"),
  }),
});

export type PlanEdicion = z.infer<typeof PlanEdicionSchema>;

export type PlanEdicionInput = {
  formato: string;
  identidadCompilada: string;
  texto: string;
  /** true = esta pieza nació como Carrusel/Imagen de varias láminas (sin
   * duración de video real) y el usuario quiere convertirla en video — el
   * plan debe recomendar tiempos por lámina, transiciones, movimiento
   * sobre la imagen estática (Ken Burns) y música, nunca asumir metraje
   * filmado. false = pieza de video real, comportamiento de siempre. */
  esConversionAVideo: boolean;
  escenas: {
    numero: number;
    duracionSegundos: number;
    descripcion: string;
    guionHablado: string;
    textoEnPantalla: string;
  }[];
};

/**
 * DIRECTOR DE EDICIÓN
 * ------------------------------------------------------------------
 * Etapa posterior a la generación: analiza una pieza YA GENERADA y entrega
 * un plan de edición profesional para que el usuario edite manualmente en
 * CapCut/Premiere/DaVinci. No automatiza edición ni genera más prompts de
 * contenido — opina y guía como un editor senior. Se dispara solo al
 * presionar el botón (nunca automáticamente al generar la pieza) y el
 * resultado se guarda una sola vez en `bloques.planEdicionJson`.
 *
 * También cubre la CONVERSIÓN de un Carrusel/Imagen estática a video —
 * mismo schema, pero el prompt le deja clarísimo a la IA que no hay
 * metraje filmado: solo láminas a las que hay que sumarles movimiento,
 * transición, música y ritmo.
 * ------------------------------------------------------------------
 */
export async function generarPlanEdicion(input: PlanEdicionInput): Promise<PlanEdicion> {
  const unidad = input.esConversionAVideo ? "Lámina" : "Escena";
  const escenasTexto = input.escenas
    .map(
      (e) =>
        `${unidad} ${e.numero}${e.duracionSegundos ? ` (${e.duracionSegundos}s)` : ""}: ${e.descripcion}\n` +
        `Guion: ${e.guionHablado || "(sin diálogo)"}\n` +
        `Texto en pantalla: ${e.textoEnPantalla || "(ninguno)"}`,
    )
    .join("\n\n");

  const instruccionRol = input.esConversionAVideo
    ? `Actúa como un director de edición senior especializado en contenido corto para redes sociales ` +
      `(TikTok, Reels, Shorts). IMPORTANTE: esta pieza NO se filmó — nació como Carrusel/imágenes ` +
      `estáticas (cada "${unidad}" de abajo es una lámina/página ya generada, no un clip de video). El ` +
      `usuario quiere CONVERTIRLA en un video tipo carrusel animado/slideshow para redes, usando CapCut, ` +
      `Premiere o DaVinci. Tu plan debe recomendar: cuántos segundos mostrar cada lámina (usa ` +
      `"duracionSugerida" para esto), qué transición usar entre láminas, dónde y cómo mover la cámara ` +
      `sobre la imagen fija (zoom lento, paneo, efecto Ken Burns — usa "movimientoCamara" para describir ` +
      `ese movimiento), textos animados sobre cada lámina, música acorde al contenido, y cómo cerrar con ` +
      `un CTA en video. NUNCA asumas que hay tomas filmadas, actuación en cámara o B-roll real — todo el ` +
      `material visual son las láminas ya generadas; el B-roll que sugieras debe ser, como mucho, ` +
      `material de apoyo adicional que el usuario podría filmar o conseguir para intercalar, no algo que ` +
      `ya existe. Tus indicaciones deben ser accionables, como si dijeras "si yo convirtiera este ` +
      `carrusel en video, haría exactamente esto" — nunca genéricas.`
    : `Actúa como un director de edición senior especializado en contenido corto para redes sociales ` +
      `(TikTok, Reels, Shorts). No editas tú mismo ni generas contenido nuevo — analizas una pieza YA ` +
      `GENERADA y entregas un plan de edición profesional y concreto para que el usuario lo siga a mano ` +
      `en CapCut, Premiere o DaVinci. Tus indicaciones deben ser accionables, como si dijeras "si yo ` +
      `editara este video, haría exactamente esto" — nunca genéricas.`;

  const prompt =
    `${instruccionRol} Adapta el tono de tus recomendaciones al formato de esta pieza: "${input.formato}".\n\n` +
    `Esta es la identidad de marca del proyecto — tu plan debe ser coherente con ella. Si el Estilo ` +
    `pide un ritmo o cámara específicos, síguelos; si te apartas de lo que pide, justifica ` +
    `explícitamente por qué en tu recomendación:\n\n${input.identidadCompilada}\n\n` +
    `Contenido completo de la pieza (copy, hashtags, CTA, narración):\n\n${input.texto}\n\n` +
    `Desglose de las ${input.escenas.length} ${unidad.toLowerCase()}s reales, numeradas — tu plan por ` +
    `escena DEBE cubrir cada una de ellas, en el mismo orden y con los mismos números, sin inventar ` +
    `${unidad.toLowerCase()}s que no existen:\n\n${escenasTexto}`;

  return generarEstructurado(prompt, PlanEdicionSchema, 6144);
}
