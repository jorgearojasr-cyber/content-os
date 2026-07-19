import type { ContenidoGenerado } from "./ai";

/** Mismo tipo de escena que usa `ContenidoGeneradoSchema` (ai.ts) — todos
 * los campos son strings requeridos (no `Escena` de types.ts, que los
 * declara opcionales para permitir bloques manuales sin IA). */
type EscenaGenerada = ContenidoGenerado["escenas"][number];

/**
 * EXPORTAR CONTEXTO / PEGAR RESULTADO
 * ------------------------------------------------------------------
 * Reemplaza la generación automática (que llamaba a la API de Anthropic
 * y tenía costo por pieza) por un flujo manual: el usuario copia el
 * contexto ya armado (Identidad + idea + configuración + plantilla de
 * formato) y lo pega en su propia cuenta de Claude.ai/ChatGPT/Gemini,
 * sin costo adicional para la app. Cuando pega la respuesta de vuelta,
 * `parsearRespuestaIA` la estructura con texto plano — sin llamar a
 * ningún modelo — reconociendo exactamente el formato que pide
 * `construirPlantillaExportacion`. Ambas funciones son puras (sin
 * `fetch`, sin acceso a base de datos) para poder correr 100% en el
 * cliente y ser fáciles de testear con un ida-y-vuelta.
 * ------------------------------------------------------------------
 */

const ENCABEZADOS_SECCION = [
  "Copy",
  "Escenas",
  "Láminas",
  "Prompt imagen",
  "Hashtags",
  "CTA",
  "Miniatura",
] as const;

/** Campos de una escena, en el orden exacto que pide la plantilla — el
 * parser los reconoce por esta misma lista de etiquetas. */
const CAMPOS_ESCENA = [
  { etiqueta: "Duración (s)", campo: "duracionSegundos" as const },
  { etiqueta: "Descripción", campo: "descripcion" as const },
  { etiqueta: "Guión hablado", campo: "guionHablado" as const },
  { etiqueta: "Texto en pantalla", campo: "textoEnPantalla" as const },
  { etiqueta: "Prompt imagen", campo: "promptVisual" as const },
  { etiqueta: "Prompt video", campo: "promptVideo" as const },
];

export type ConfigExportable = {
  identidadCompilada: string;
  tipoContenido: string;
  tipoProduccion: string;
  tema: string;
  plataforma?: string;
  duracion?: string;
  numeroEscenas?: string;
  numeroPaginas?: string;
  estiloImagen?: string;
  /** Aspect ratio del Tipo de publicación elegido (ej. "9:16", "4:5") —
   * se inyecta en los prompts de imagen de la plantilla para que la IA
   * externa lo pida en el formato correcto. Ausente = fallback razonable
   * por formato. */
  aspectRatio?: string;
  /** Bloque ya formateado con los documentos de la Biblioteca de
   * Conocimiento que coinciden con la idea (por palabras clave, sin IA —
   * ver `formatearConocimientoRelevante` en crear-modos) — "" o ausente =
   * sin sección de conocimiento. */
  conocimientoRelevante?: string;
};

/** Encabezado de destino — va PRIMERO en todo contexto exportado, para
 * que ni el usuario ni la IA confundan este documento con un prompt
 * visual (caso real: pegado en una IA de imágenes, dibujó un póster del
 * manual de marca en vez de generar el contenido). */
const INSTRUCCIONES_DE_USO =
  `## Instrucciones de uso\n` +
  `IMPORTANTE — dónde pegar esto: este documento COMPLETO va en una IA de TEXTO en modo chat ` +
  `(Claude.ai, ChatGPT o Gemini). NO lo pegues en un generador de imágenes ni de video: no es un ` +
  `prompt visual, es el contexto de marca y la tarea a resolver.\n` +
  `Para la IA que lee esto: responde ÚNICAMENTE con la estructura indicada en la sección ` +
  `"Formato de salida requerido" del final, sin texto adicional antes ni después.\n` +
  `Para el usuario: los prompts de imagen o video que vengan DENTRO de la respuesta se usan ` +
  `DESPUÉS, uno por uno, en las herramientas de imagen (Gemini / GPT Image) o de video ` +
  `(Kling / Runway / Veo) — nunca este documento completo.`;

/** Instrucción de referencia a fotos reales que se repite en todos los
 * prompts de imagen de las plantillas. */
const NOTA_FOTO_REAL =
  `si hay un Personaje o Activo con foto real de referencia arriba, indica usar esa foto en vez ` +
  `de describir su apariencia/el lugar desde cero`;

/** La estructura de salida que se le pide a la IA externa, ramificada por
 * Formato — cada export incluye SOLO la estructura del formato elegido
 * (no el menú completo), y cada variante usa únicamente encabezados y
 * etiquetas que `parsearRespuestaIA` reconoce. */
function bloqueFormatoSalida(config: ConfigExportable): string {
  const preambulo =
    `## Formato de salida requerido\nResponde usando EXACTAMENTE esta estructura markdown, sin texto ` +
    `antes ni después, y sin omitir ningún encabezado aunque el contenido de esa sección quede vacío:\n\n`;

  if (config.tipoContenido === "Imagen") {
    // Pieza de UNA sola imagen: un único prompt detallado + copy. Sin
    // escenas ni miniatura separada (la imagen ES la pieza).
    const aspecto = config.aspectRatio ?? "4:5 (vertical de feed)";
    return (
      preambulo +
      `## Copy\n(el texto/copy de la publicación)\n\n` +
      `## Prompt imagen\n(UN solo prompt, detallado, en español, para generar la imagen en ` +
      `Gemini/Nano Banana en formato ${aspecto} — describe composición, iluminación, estilo y el ` +
      `texto sobreimpreso si lleva; ${NOTA_FOTO_REAL})\n\n` +
      `## Hashtags\n(hashtags recomendados separados por espacio; vacío si no aplica)\n\n` +
      `## CTA\n(llamado a la acción de cierre; vacío si no aplica)`
    );
  }

  if (config.tipoContenido === "Carrusel") {
    // Láminas en vez de escenas de video — sin Prompt video (no aplica) y
    // con el aspect ratio del Tipo de publicación elegido.
    const aspecto = config.aspectRatio ?? "4:5 (vertical de feed)";
    return (
      preambulo +
      `## Copy\n(el texto/copy de la publicación)\n\n` +
      `## Láminas\nLámina 1\n` +
      `Descripción: (qué se ve en esta lámina del carrusel)\n` +
      `Texto en pantalla: (el texto sobreimpreso de esta lámina; vacío si no lleva)\n` +
      `Prompt imagen: (prompt en español para generar esta lámina en Gemini/Nano Banana, en formato ` +
      `${aspecto}, sin parámetros técnicos de otras herramientas — ${NOTA_FOTO_REAL})\n\n` +
      `Lámina 2\n(mismos campos que la Lámina 1, y así sucesivamente por cada lámina)\n\n` +
      `## Hashtags\n(hashtags recomendados separados por espacio; vacío si no aplica)\n\n` +
      `## CTA\n(llamado a la acción de cierre; vacío si no aplica)\n\n` +
      `## Miniatura\n(descripción de la portada del carrusel — normalmente la Lámina 1; vacío si no aplica)`
    );
  }

  if (config.tipoContenido === "Historia") {
    // Historia: vertical 9:16, corta, estructura mínima — máximo 3
    // escenas y sin miniatura (las historias no llevan portada).
    return (
      preambulo +
      `## Copy\n(texto breve para acompañar o responder la historia; vacío si no lleva)\n\n` +
      `## Escenas\nUsa MÁXIMO 3 escenas (idealmente 1) — una historia es una pieza corta, vertical ` +
      `9:16, de pocos segundos.\n\nEscena 1\n` +
      `Duración (s): (duración de esta escena en segundos)\n` +
      `Descripción: (qué se ve en esta escena)\nGuión hablado: (diálogo o narración; vacío si no aplica)\n` +
      `Texto en pantalla: (texto que aparece sobreimpreso; vacío si no aplica)\n` +
      `Prompt imagen: (prompt en español para generar la imagen en Gemini/Nano Banana, en formato ` +
      `vertical 9:16 — ${NOTA_FOTO_REAL})\n` +
      `Prompt video: (prompt en español para animar en Kling/Runway/Veo, vertical 9:16, enfocado en ` +
      `movimiento; vacío si la historia es de imagen fija)\n\n` +
      `## Hashtags\n(hashtags recomendados separados por espacio; vacío si no aplica)\n\n` +
      `## CTA\n(llamado a la acción; en historias suele ser un sticker/link; vacío si no aplica)`
    );
  }

  // Video Corto / Video Largo (y cualquier formato futuro): la estructura
  // completa de video de siempre — la que `parsearRespuestaIA` reconoce
  // desde la primera versión de este flujo.
  return (
    preambulo +
    `## Copy\n(el texto/copy de la publicación)\n\n` +
    `## Escenas\nEscena 1\nDuración (s): (duración de esta escena en segundos — la suma de todas ` +
    `las escenas debe respetar la duración objetivo indicada en la Tarea)\n` +
    `Descripción: (qué se ve en esta escena)\nGuión hablado: (diálogo o narración; vacío si no aplica)\n` +
    `Texto en pantalla: (texto que aparece sobreimpreso; vacío si no aplica)\n` +
    `Prompt imagen: (prompt en español para generar la imagen fija en Gemini/Nano Banana, sin ` +
    `parámetros técnicos de otras herramientas — ${NOTA_FOTO_REAL})\n` +
    `Prompt video: (prompt en español para animar en Kling/Runway/Veo, enfocado en movimiento y acción; ` +
    `vacío si esta pieza no tiene componente de video)\n\n` +
    `Escena 2\n(mismos campos que la Escena 1, y así sucesivamente por cada escena — respeta el ` +
    `número de escenas si la Tarea lo indica)\n\n` +
    `## Hashtags\n(hashtags recomendados separados por espacio; vacío si no aplica)\n\n` +
    `## CTA\n(llamado a la acción de cierre; vacío si no aplica)\n\n` +
    `## Miniatura\n(descripción de la imagen de portada/miniatura; vacío si no aplica)`
  );
}

/** Arma el bloque de texto completo para copiar y pegar en una IA externa
 * (Claude.ai, ChatGPT, Gemini) — instrucciones de destino, Identidad ya
 * compilada (con las mismas instrucciones de "usa la foto real" para
 * Personaje/Activos que ya usa la app), la idea y configuración elegidas
 * en Pasos 1-4, y la plantilla de formato de salida DEL FORMATO ELEGIDO
 * (ramificada: video/carrusel/imagen/historia). Las etiquetas de cada
 * plantilla son EXACTAMENTE las que reconoce `parsearRespuestaIA` —
 * cualquier cambio acá debe reflejarse ahí también. */
export function construirPlantillaExportacion(config: ConfigExportable): string {
  const opciones = [
    config.plataforma ? `Plataforma: ${config.plataforma}.` : "",
    config.duracion ? `Duración objetivo: ${config.duracion}.` : "",
    config.numeroEscenas && config.numeroEscenas !== "Automático"
      ? `Número de escenas: exactamente ${config.numeroEscenas}.`
      : "",
    config.numeroPaginas && config.numeroPaginas !== "Automático"
      ? `Número de láminas del carrusel: exactamente ${config.numeroPaginas}.`
      : "",
    config.estiloImagen ? `Estilo de imagen: ${config.estiloImagen}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bloques = [
    INSTRUCCIONES_DE_USO,
    config.identidadCompilada,
    config.conocimientoRelevante
      ? `## Conocimiento relevante\nMaterial de referencia de la marca que aplica a esta idea — úsalo ` +
        `como fuente de datos y criterio, sin contradecirlo:\n${config.conocimientoRelevante}`
      : "",
    `## Tarea\nEres el equipo creativo (Director de Marketing + Director Creativo) de este proyecto ` +
      `de contenido. Sigue la identidad de marca de arriba al pie de la letra, sin resumirla ni ` +
      `contradecirla. Genera contenido de tipo "${config.tipoContenido}", producido como ` +
      `"${config.tipoProduccion}", sobre este tema: "${config.tema}". ${opciones}`.trim(),
    bloqueFormatoSalida(config),
  ].filter((b) => b.trim().length > 0);

  return bloques.join("\n\n");
}

/** Divide un texto en secciones "## Encabezado" — devuelve un mapa
 * encabezado (en minúsculas) -> contenido, tal como llega, sin más
 * procesamiento. No le importan encabezados desconocidos; los ignora. */
function extraerSecciones(texto: string): Record<string, string> {
  const normalizado = texto.replace(/\r\n/g, "\n").trim();
  const partes = normalizado.split(/\n(?=##\s)/);
  const secciones: Record<string, string> = {};
  for (const parte of partes) {
    const m = parte.match(/^##\s*(.+?)\s*\n([\s\S]*)$/);
    if (m) secciones[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return secciones;
}

/** Extrae el valor de un campo etiquetado ("Etiqueta: valor") dentro de un
 * bloque de texto de una escena — el valor sigue hasta la siguiente
 * etiqueta conocida o el final del bloque, así que campos de varias
 * líneas (ej. un Prompt imagen largo) se capturan completos. */
function extraerCampoEtiquetado(bloque: string, etiqueta: string): string {
  const otras = CAMPOS_ESCENA.map((c) => c.etiqueta).filter((e) => e !== etiqueta);
  const finales = otras.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const etiquetaEscapada = etiqueta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // [ \t]* (no \s*) después de los dos puntos a propósito — \s* también
  // consume el salto de línea, y si el valor queda vacío eso corre el
  // inicio de la captura hasta la línea de la SIGUIENTE etiqueta, dejando
  // sin "\n" antes de ella para que el lookahead de abajo la reconozca
  // como límite — el resultado era que un campo vacío se tragaba entera
  // la etiqueta (y valor) del campo siguiente.
  const regex = new RegExp(`${etiquetaEscapada}\\s*:[ \\t]*([\\s\\S]*?)(?=\\n(?:${finales})\\s*:|$)`, "i");
  const m = bloque.match(regex);
  return m ? m[1].trim() : "";
}

function parsearEscenas(textoEscenas: string): EscenaGenerada[] {
  if (!textoEscenas.trim()) return [];
  const bloques = textoEscenas
    .replace(/\r\n/g, "\n")
    .trim()
    // "Escena N" (video/historia) o "Lámina N" (carrusel) — misma
    // estructura interna de campos etiquetados.
    .split(/\n(?=(?:Escena|L[áa]mina)\s+\d+)/i);

  // Si hay bloques numerados, los no numerados son texto suelto (ej. la
  // IA repitió la línea de instrucción "Usa MÁXIMO 3 escenas..." de la
  // plantilla de Historia) — se descartan para no crear escenas vacías.
  const numerados = bloques.filter((b) => /^(?:Escena|L[áa]mina)\s+\d+/i.test(b.trim()));
  const efectivos = numerados.length > 0 ? numerados : bloques;

  return efectivos.map((bloque, i) => {
    const numeroMatch = bloque.match(/^(?:Escena|L[áa]mina)\s+(\d+)/i);
    const numero = numeroMatch ? Number(numeroMatch[1]) : i + 1;
    const duracionTexto = extraerCampoEtiquetado(bloque, "Duración (s)");
    const duracionSegundos = Number.parseInt(duracionTexto, 10);

    return {
      numero,
      duracionSegundos: Number.isFinite(duracionSegundos) ? duracionSegundos : 0,
      descripcion: extraerCampoEtiquetado(bloque, "Descripción"),
      guionHablado: extraerCampoEtiquetado(bloque, "Guión hablado"),
      textoEnPantalla: extraerCampoEtiquetado(bloque, "Texto en pantalla"),
      promptVisual: extraerCampoEtiquetado(bloque, "Prompt imagen"),
      promptVideo: extraerCampoEtiquetado(bloque, "Prompt video"),
      elementoConcreto: "",
      activoReferenciado: "",
    };
  });
}

export type ResultadoParseo = {
  titulo: string;
  copy: string;
  hashtags: string;
  cta: string;
  narracion: string;
  miniatura: string;
  escenas: EscenaGenerada[];
};

/** Estructura la respuesta pegada de una IA externa, en texto plano, SIN
 * llamar a ningún modelo — reconoce las 4 variantes de plantilla que arma
 * `construirPlantillaExportacion`:
 * - Video/Historia: "## Escenas" con bloques "Escena N" etiquetados.
 * - Carrusel: "## Láminas" con bloques "Lámina N" (sin Prompt video).
 * - Imagen: "## Prompt imagen" único, que se guarda como una sola escena
 *   para que la guía de producción de Biblioteca funcione igual.
 * Si no reconoce ningún encabezado (formato completamente inesperado),
 * no pierde el texto: lo deja completo, editable, en `copy`, con
 * `reconocido: false` para que la pantalla avise al usuario en vez de
 * fallar en silencio. */
export function parsearRespuestaIA(textoPegado: string): { contenido: ResultadoParseo; reconocido: boolean } {
  const secciones = extraerSecciones(textoPegado);
  const encontroAlgunEncabezado = ENCABEZADOS_SECCION.some((e) => secciones[e.toLowerCase()] !== undefined);

  if (!encontroAlgunEncabezado) {
    return {
      contenido: {
        titulo: "",
        copy: textoPegado.trim(),
        hashtags: "",
        cta: "",
        narracion: "",
        miniatura: "",
        escenas: [],
      },
      reconocido: false,
    };
  }

  let escenas = parsearEscenas(secciones["escenas"] ?? secciones["láminas"] ?? secciones["laminas"] ?? "");

  // Formato Imagen: "## Prompt imagen" a nivel de sección (no dentro de
  // una escena) — se convierte en una única escena con ese prompt visual.
  const promptImagenUnico = (secciones["prompt imagen"] ?? "").trim();
  if (escenas.length === 0 && promptImagenUnico) {
    escenas = [
      {
        numero: 1,
        duracionSegundos: 0,
        descripcion: "",
        guionHablado: "",
        textoEnPantalla: "",
        promptVisual: promptImagenUnico,
        promptVideo: "",
        elementoConcreto: "",
        activoReferenciado: "",
      },
    ];
  }

  return {
    contenido: {
      titulo: "",
      copy: secciones["copy"] ?? "",
      hashtags: secciones["hashtags"] ?? "",
      cta: secciones["cta"] ?? "",
      narracion: "",
      miniatura: secciones["miniatura"] ?? "",
      escenas,
    },
    reconocido: true,
  };
}
