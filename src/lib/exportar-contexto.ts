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

const ENCABEZADOS_SECCION = ["Copy", "Escenas", "Hashtags", "CTA", "Miniatura"] as const;

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
};

/** Arma el bloque de texto completo para copiar y pegar en una IA externa
 * (Claude.ai, ChatGPT, Gemini) — Identidad ya compilada (con las mismas
 * instrucciones de "usa la foto real" para Personaje/Activos que ya usa
 * la app), la idea y configuración elegidas en Pasos 1-4, y una plantilla
 * de formato de salida fija. El formato de la plantilla es EXACTAMENTE
 * el que reconoce `parsearRespuestaIA` — cualquier cambio acá debe
 * reflejarse ahí también. */
export function construirPlantillaExportacion(config: ConfigExportable): string {
  const opciones = [
    config.plataforma ? `Plataforma: ${config.plataforma}.` : "",
    config.duracion ? `Duración objetivo: ${config.duracion}.` : "",
    config.numeroEscenas && config.numeroEscenas !== "Automático"
      ? `Número de escenas: exactamente ${config.numeroEscenas}.`
      : "",
    config.numeroPaginas && config.numeroPaginas !== "Automático"
      ? `Número de páginas del carrusel: exactamente ${config.numeroPaginas}.`
      : "",
    config.estiloImagen ? `Estilo de imagen: ${config.estiloImagen}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bloques = [
    config.identidadCompilada,
    `## Tarea\nEres el equipo creativo (Director de Marketing + Director Creativo) de este proyecto ` +
      `de contenido. Sigue la identidad de marca de arriba al pie de la letra, sin resumirla ni ` +
      `contradecirla. Genera contenido de tipo "${config.tipoContenido}", producido como ` +
      `"${config.tipoProduccion}", sobre este tema: "${config.tema}". ${opciones}`.trim(),
    `## Formato de salida requerido\nResponde usando EXACTAMENTE esta estructura markdown, sin texto ` +
      `antes ni después, y sin omitir ningún encabezado aunque el contenido de esa sección quede vacío:\n\n` +
      `## Copy\n(el texto/copy de la publicación)\n\n` +
      `## Escenas\nEscena 1\nDuración (s): (0 si esta pieza no es un video, ej. Carrusel/Imagen)\n` +
      `Descripción: (qué se ve en esta escena)\nGuión hablado: (diálogo o narración; vacío si no aplica)\n` +
      `Texto en pantalla: (texto que aparece sobreimpreso; vacío si no aplica)\n` +
      `Prompt imagen: (prompt en español para generar la imagen fija en Gemini/Nano Banana, sin ` +
      `parámetros técnicos de otras herramientas — si hay un Personaje o Activo con foto real de ` +
      `referencia arriba, indica usar esa foto en vez de describir su apariencia/el lugar desde cero)\n` +
      `Prompt video: (prompt en español para animar en Kling/Runway/Veo, enfocado en movimiento y acción; ` +
      `vacío si esta pieza no tiene componente de video)\n\n` +
      `Escena 2\n(mismos campos que la Escena 1, y así sucesivamente por cada escena)\n\n` +
      `## Hashtags\n(hashtags recomendados separados por espacio; vacío si no aplica)\n\n` +
      `## CTA\n(llamado a la acción de cierre; vacío si no aplica)\n\n` +
      `## Miniatura\n(descripción de la imagen de portada/miniatura; vacío si no aplica)`,
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
    .split(/\n(?=Escena\s+\d+)/i);

  return bloques.map((bloque, i) => {
    const numeroMatch = bloque.match(/^Escena\s+(\d+)/i);
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
 * llamar a ningún modelo — reconoce el formato armado por
 * `construirPlantillaExportacion` (encabezados "## Copy"/"## Escenas"/
 * "## Hashtags"/"## CTA"/"## Miniatura", y dentro de "## Escenas" cada
 * "Escena N" con sus campos etiquetados). Si no reconoce ni "## Escenas"
 * ni "## Copy" (formato completamente inesperado), no pierde el texto:
 * lo deja completo, editable, en `copy`, con `reconocido: false` para
 * que la pantalla avise al usuario en vez de fallar en silencio. */
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

  return {
    contenido: {
      titulo: "",
      copy: secciones["copy"] ?? "",
      hashtags: secciones["hashtags"] ?? "",
      cta: secciones["cta"] ?? "",
      narracion: "",
      miniatura: secciones["miniatura"] ?? "",
      escenas: parsearEscenas(secciones["escenas"] ?? ""),
    },
    reconocido: true,
  };
}
