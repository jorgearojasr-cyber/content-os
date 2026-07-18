import type { Avatar, Identidad, Personaje } from "./types";
import { avatarTieneContenido, ETIQUETA_TIPO_FOTO_PERSONAJE, parseFotosPersonaje } from "./types";

/** Campos de texto de `Identidad` que siguen viviendo ahí de verdad (Marca,
 * Estilo, Contacto). Los antiguos campos de Personaje/Avatar quedaron
 * deprecados — ver `personajes`/`avatares` en db/schema.ts. */
type CampoTextoIdentidad = Exclude<
  keyof Identidad,
  | "avatarJson"
  | "fotosUrlsJson"
  | "personajeNombre"
  | "personajePersonalidad"
  | "fisica"
  | "vestuario"
  | "vozDescrita"
  | "gestos"
  | "muletillas"
>;

const ETIQUETAS_AVATAR: Array<[Exclude<keyof Avatar, "id" | "proyectoId" | "createdAt">, string]> = [
  ["nombreFicticio", "Nombre ficticio"],
  ["edad", "Edad"],
  ["profesion", "Profesión"],
  ["nivelConocimiento", "Nivel de conocimientos"],
  ["problemasFrecuentes", "Problemas frecuentes"],
  ["objetivos", "Objetivos"],
  ["miedos", "Qué teme"],
  ["queBuscaAprender", "Qué busca aprender"],
  ["comoConsumeContenido", "Cómo consume contenido"],
  ["lenguaje", "Qué lenguaje entiende mejor"],
];

/**
 * Renderiza el avatar SELECCIONADO campo por campo (no lo resume): cada
 * dato guardado se antepone con su propia etiqueta, igual que el resto del
 * compilador. "" si no hay avatar seleccionado o no tiene contenido.
 */
function formatearAvatar(avatar: Avatar | null | undefined): string {
  if (!avatar || !avatarTieneContenido(avatar)) return "";
  return ETIQUETAS_AVATAR.filter(([campo]) => avatar[campo]?.trim().length > 0)
    .map(([campo, etiqueta]) => `${etiqueta}: ${avatar[campo].trim()}`)
    .join("\n");
}

/** Renderiza las fotos de referencia del Personaje SELECCIONADO (hasta 4),
 * cada una con su tipo (Rostro/Perfil/Medio cuerpo/Cuerpo completo) — así
 * el modelo sabe, para cada escena, qué imagen de referencia corresponde
 * usar en vez de redescribir físicamente al Personaje (ver `promptVideo`/
 * `promptVisual` en ai.ts). Igual de literal que el resto del compilador —
 * no elige "la mejor". */
function formatearFotosPersonaje(personaje: Personaje | null | undefined): string {
  if (!personaje) return "";
  const fotos = parseFotosPersonaje(personaje.fotosUrlsJson);
  if (fotos.length === 0) return "";
  return fotos.map((f, i) => `${i + 1}. ${ETIQUETA_TIPO_FOTO_PERSONAJE[f.tipo]}: ${f.url}`).join("\n");
}

// Los campos nuevos de la ficha completa van AL FINAL a propósito: con
// ellos vacíos, la salida compilada de un Personaje existente queda
// byte-idéntica a la de antes de la expansión. `notas` NO se compila —
// son notas internas de trabajo, nunca parte del contexto exportado.
const CAMPOS_PERSONAJE: Array<[keyof Personaje, string]> = [
  ["personalidad", "Personalidad"],
  ["fisica", "Descripción física"],
  ["vestuario", "Vestuario"],
  ["vozDescrita", "Voz (descripción)"],
  ["gestos", "Gestos"],
  ["muletillas", "Muletillas"],
  ["edad", "Edad"],
  ["profesion", "Profesión"],
  ["historia", "Historia"],
  ["contexto", "Contexto habitual"],
  ["promptMaestro", "Prompt maestro"],
  ["promptImagen", "Prompt para imagen"],
  ["promptVideo", "Prompt para video"],
  ["promptVoz", "Prompt para voz"],
];

/** Un Personaje dentro de un bloque "### N. Nombre" — usado solo cuando hay
 * 2+ Personajes juntos en la pieza (con 1 solo, se usa el formato plano de
 * siempre, ver `formatearSeccionPersonajes`). */
function formatearPersonajeConEncabezado(personaje: Personaje, numero: number): string {
  const fotosFormateadas = formatearFotosPersonaje(personaje);
  const lineas = CAMPOS_PERSONAJE.map(([campo, etiqueta]) => {
    const valor = personaje[campo];
    return typeof valor === "string" && valor.trim().length > 0 ? `${etiqueta}: ${valor.trim()}` : "";
  })
    .concat(fotosFormateadas ? [`Fotos de referencia:\n${fotosFormateadas}`] : [])
    .filter((linea) => linea.length > 0)
    .join("\n");
  return `### ${numero}. ${personaje.nombre || "Personaje sin nombre"}\n${lineas}`;
}

const INSTRUCCION_PERSONAJES_CONJUNTOS =
  "Estos Personajes aparecen juntos en esta pieza. En las escenas donde coincidan, describe " +
  "explícitamente la apariencia física de TODOS los que participen (nunca solo sus nombres) y compón " +
  "una interacción o diálogo natural entre ellos, coherente con los roles y personalidades descritos " +
  "arriba (ej. uno explicándole algo al otro según su conocimiento) — nunca los coloques uno al lado " +
  "del otro sin relación. El guion/copy de la pieza también debe reflejar ese diálogo o interacción, " +
  "no solo la voz de un narrador único. Si la pieza tiene varias escenas, no todas necesitan incluir a " +
  "todos los Personajes, pero evalúa la interacción conjunta como una opción real donde tenga sentido.";

/** Con 1 Personaje, produce EXACTAMENTE el mismo texto de siempre (un solo
 * "## Personaje" plano) — no cambia el comportamiento existente. Con 2+,
 * agrupa cada uno en su propio sub-bloque "### N. Nombre" bajo un único
 * "## Personajes" y agrega la instrucción de interacción conjunta. */
function formatearSeccionPersonajes(personajes: Personaje[]): string {
  if (personajes.length === 0) return "";
  if (personajes.length === 1) {
    const personaje = personajes[0];
    const fotosFormateadas = formatearFotosPersonaje(personaje);
    return seccion("Personaje", [
      ["Nombre", personaje.nombre],
      ...CAMPOS_PERSONAJE.map(([campo, etiqueta]) => [etiqueta, personaje[campo] as string] as [string, string]),
      fotosFormateadas ? `Fotos de referencia:\n${fotosFormateadas}` : "",
    ]);
  }
  const bloques = personajes.map((p, i) => formatearPersonajeConEncabezado(p, i + 1)).join("\n\n");
  return `## Personajes\n${bloques}\n\n${INSTRUCCION_PERSONAJES_CONJUNTOS}`;
}

/**
 * COMPILADOR DE IDENTIDAD
 * ------------------------------------------------------------------
 * Esta es la pieza que justifica que Content OS exista.
 *
 * No es un agente de IA. Es una función pura: misma Identidad + mismo
 * Personaje/Avatar seleccionados -> exactamente el mismo texto de salida,
 * siempre. No resume, no reinterpreta, no "recuerda a su manera" — copia
 * los campos guardados de forma literal dentro de una plantilla fija.
 *
 * La consistencia de un proyecto no depende de que un modelo de IA
 * "se acuerde bien" del personaje o del estilo: depende de que este
 * compilador entregue, cada vez, el mismo bloque de texto exacto,
 * que luego se inyecta sin abreviar en cualquier generación futura
 * (texto, imagen o video) y hacia cualquier herramienta externa.
 *
 * Un proyecto puede tener varios Personajes y varios Avatares — el
 * Compilador nunca los elige por su cuenta: siempre recibe los ya
 * SELECCIONADOS (por quien llama) en `opciones.personajes`/`opciones.avatar`.
 * Con 2+ Personajes seleccionados juntos, agrega una instrucción explícita
 * de interacción/diálogo conjunto entre ellos (ver `formatearSeccionPersonajes`).
 * ------------------------------------------------------------------
 */

/**
 * Cada entrada es un par [etiqueta, valor] (se omite si el valor está
 * vacío) o un bloque de texto ya formateado (para sub-bloques como el
 * Avatar, que tienen su propio encabezado y varias líneas).
 */
type Entrada = [string, string] | string;

function seccion(titulo: string, entradas: Entrada[]): string {
  const contenido = entradas
    .map((entrada) => {
      if (typeof entrada === "string") return entrada.trim();
      const [etiqueta, valor] = entrada;
      return valor && valor.trim().length > 0 ? `${etiqueta}: ${valor.trim()}` : "";
    })
    .filter((linea) => linea.length > 0)
    .join("\n");

  if (!contenido) return "";
  return `## ${titulo}\n${contenido}`;
}

export type PosicionLogo = "superior-izquierda" | "superior-derecha" | "inferior-izquierda" | "inferior-derecha";

const ETIQUETAS_POSICION_LOGO: Record<PosicionLogo, string> = {
  "superior-izquierda": "esquina superior izquierda",
  "superior-derecha": "esquina superior derecha",
  "inferior-izquierda": "esquina inferior izquierda",
  "inferior-derecha": "esquina inferior derecha",
};

export type ActivoVisual = { etiqueta: string; url: string };

const INSTRUCCION_ACTIVOS_VISUALES =
  "Cuando el concepto de una escena coincida semánticamente con alguna de estas etiquetas (ej. una " +
  "escena sobre 'la piscina' y existe la etiqueta 'Piscina'), NO describas ese lugar/espacio desde " +
  "cero en el prompt — indica explícitamente usar esa foto real como referencia (mismo principio que " +
  "las fotos de Personaje) y dedica el resto del texto a composición, acción e iluminación. En el " +
  "campo `activoReferenciado` de esa escena, pon EXACTAMENTE la etiqueta tal como aparece abajo, para " +
  "que el sistema pueda vincular la foto real; cadena vacía si ninguna etiqueta coincide con esa " +
  "escena. Sin coincidencia clara, describe el lugar en texto como siempre.";

/** Renderiza las fotos de lugar disponibles (Activos tipo "foto" del
 * proyecto), cada una con su etiqueta libre — mismo principio que las fotos
 * de Personaje (ver `formatearFotosPersonaje`), aplicado a espacios físicos
 * en vez de personas. */
function formatearActivosVisuales(activosVisuales: ActivoVisual[]): string {
  if (activosVisuales.length === 0) return "";
  const lista = activosVisuales.map((a, i) => `${i + 1}. ${a.etiqueta}: ${a.url}`).join("\n");
  return `## Activos visuales disponibles\n${lista}\n\n${INSTRUCCION_ACTIVOS_VISUALES}`;
}

export type OpcionesCompilado = {
  /** Si es `false`, omite toda la sección "## Marca" (voz, reglas, objetivo
   * y Avatar del cliente ideal incluidos). Por defecto `true` — no cambia
   * el comportamiento de ningún llamado existente. */
  incluirMarca?: boolean;
  /** Si es `false`, omite toda la sección "## Personaje"/"## Personajes". Por defecto `true`. */
  incluirPersonaje?: boolean;
  /** Si es `true`, agrega una sección "## Contacto" (sitio web, teléfono,
   * dirección). Por defecto `false` — el Compilador nunca envía datos de
   * contacto salvo que se pida explícitamente (ver casillas de Crear). */
  incluirContacto?: boolean;
  /** Los Personajes SELECCIONADOS para esta compilación (por quien llama —
   * el Compilador nunca elige entre varios). Lista vacía = sin Personaje,
   * la sección se omite aunque `incluirPersonaje` sea `true`. Con 1 elemento,
   * la salida es idéntica a la de una sola versión con Personaje único
   * (mismo formato de siempre); con 2+, se agrega una instrucción explícita
   * de interacción/diálogo conjunto entre ellos. */
  personajes?: Personaje[];
  /** Fotos reales de lugares/espacios del proyecto (Activos tipo "foto"),
   * cada una con su etiqueta libre — igual principio que las fotos de
   * Personaje: si una escena coincide con una etiqueta, se referencia esa
   * foto real en vez de describir el espacio desde cero. Lista vacía = sin
   * Activos visuales, la sección se omite. */
  activosVisuales?: ActivoVisual[];
  /** El Avatar SELECCIONADO para esta compilación. `null`/`undefined` =
   * sin Avatar, el sub-bloque se omite. */
  avatar?: Avatar | null;
  /** Si se pasa (y la identidad tiene `logoUrl`), agrega una instrucción
   * explícita de posicionamiento del logo en cada imagen/video de esta
   * pieza — más allá de la mención informativa que "Logo" ya tiene siempre
   * dentro de "## Estilo". `null`/`undefined` = sin instrucción extra. */
  posicionLogo?: PosicionLogo | null;
};

/**
 * Compila el objeto Identidad completo (más el Personaje/Avatar
 * seleccionados) en un bloque de texto canónico. Las secciones sin ningún
 * dato cargado se omiten (no se envían etiquetas vacías a una futura
 * generación), pero el orden y el formato de las que sí tienen datos nunca
 * cambia.
 *
 * `opciones` controla qué secciones se incluyen — es la única fuente de
 * verdad que usan tanto la vista previa (todo incluido, opciones por
 * defecto) como la generación real desde Crear (con las casillas del
 * usuario). No hay una segunda copia de esta lógica en ningún otro lado.
 */
export function compileIdentity(identidad: Identidad, opciones: OpcionesCompilado = {}): string {
  const {
    incluirMarca = true,
    incluirPersonaje = true,
    incluirContacto = false,
    personajes = [],
    activosVisuales = [],
    avatar = null,
    posicionLogo = null,
  } = opciones;

  const avatarFormateado = formatearAvatar(avatar);

  // Los campos de la ronda "entrenamiento permanente" se INTERCALAN en
  // posiciones semánticas — es seguro para la compatibilidad porque las
  // entradas vacías se omiten: con datos anteriores (campos nuevos en ""),
  // las líneas renderizadas y su orden quedan byte-idénticos a los de antes
  // (test de regresión explícito en identity-compiler.test.ts).
  const marca = incluirMarca
    ? seccion("Marca", [
        ["Voz y personalidad", identidad.voz],
        ["Reglas de escritura", identidad.reglas],
        ["Objetivo del proyecto", identidad.objetivo],
        ["Historia de la marca", identidad.historia],
        ["Valores", identidad.valores],
        ["Promesa de valor", identidad.promesa],
        ["Posicionamiento", identidad.posicionamiento],
        ["Arquetipo de marca", identidad.arquetipo],
        ["Manifiesto de marca", identidad.manifiesto],
        ["Audiencia", identidad.audiencia],
        ["Emociones a transmitir", identidad.emociones],
        ["Qué debe pensar la audiencia después de consumir el contenido", identidad.impactoEsperado],
        ["Cómo adaptar el contenido según la audiencia", identidad.adaptacionAudiencia],
        ["Competidores", identidad.competidores],
        ["Diferenciadores frente a la competencia", identidad.diferenciadores],
        ["Manual de marca", identidad.manualMarca],
        avatarFormateado ? `Avatar del cliente ideal:\n${avatarFormateado}` : "",
      ])
    : "";

  // Va junto a Marca (misma casilla "usar voz y tono de la marca" en Crear):
  // son lineamientos de QUÉ decir y qué evitar, no de cómo se ve la pieza.
  const lineamientos = incluirMarca
    ? seccion("Lineamientos de contenido", [
        ["CTA habituales", identidad.ctaHabituales],
        ["Hashtags frecuentes", identidad.hashtagsFrecuentes],
        ["Restricciones (qué evitar siempre)", identidad.restricciones],
        ["Nivel de formalidad", identidad.formalidad],
        ["Humor permitido", identidad.humor],
        ["Nivel técnico del contenido", identidad.nivelTecnico],
        ["Palabras y expresiones que siempre usa", identidad.palabrasSiempre],
        ["Palabras que nunca debe usar", identidad.palabrasNunca],
        ["Frases características", identidad.frasesCaracteristicas],
        ["Estructura habitual de los contenidos", identidad.estructuraContenidos],
        ["Cómo responder críticas y comentarios", identidad.respuestaCriticas],
      ])
    : "";

  const personajeSeccion = incluirPersonaje ? formatearSeccionPersonajes(personajes) : "";
  const activosVisualesSeccion = formatearActivosVisuales(activosVisuales);

  const estilo = seccion("Estilo", [
    ["Paleta de colores", identidad.paleta],
    ["Tipografía", identidad.tipografia],
    ["Look visual", identidad.look],
    ["Cámara", identidad.camara],
    ["Ritmo", identidad.ritmo],
    ["Estructura de CTA", identidad.estructuraCta],
    ["Logo", identidad.logoUrl],
  ]);

  const contacto = incluirContacto
    ? seccion("Contacto", [
        ["Sitio web", identidad.sitioWeb],
        ["Teléfono", identidad.telefono],
        ["Dirección", identidad.direccion],
      ])
    : "";

  const logoConPosicion =
    posicionLogo && identidad.logoUrl.trim().length > 0
      ? seccion("Logo en esta pieza", [
          `Incluye el logo del proyecto (${identidad.logoUrl.trim()}) visible en la ` +
            `${ETIQUETAS_POSICION_LOGO[posicionLogo]} de cada imagen o video generado para esta pieza.`,
        ])
      : "";

  const secciones = [
    marca,
    lineamientos,
    personajeSeccion,
    activosVisualesSeccion,
    estilo,
    contacto,
    logoConPosicion,
  ].filter(Boolean);

  if (secciones.length === 0) {
    return "(Esta identidad todavía no tiene ningún campo cargado. Complétala en la pestaña Identidad.)";
  }

  return secciones.join("\n\n");
}

const CAMPOS_DE_CONTENIDO = [
  "voz",
  "reglas",
  "objetivo",
  "historia",
  "valores",
  "audiencia",
  "competidores",
  "manualMarca",
  "ctaHabituales",
  "hashtagsFrecuentes",
  "restricciones",
  "promesa",
  "posicionamiento",
  "arquetipo",
  "manifiesto",
  "emociones",
  "impactoEsperado",
  "adaptacionAudiencia",
  "formalidad",
  "humor",
  "nivelTecnico",
  "palabrasSiempre",
  "palabrasNunca",
  "frasesCaracteristicas",
  "estructuraContenidos",
  "respuestaCriticas",
  "diferenciadores",
  "paleta",
  "tipografia",
  "look",
  "camara",
  "ritmo",
  "estructuraCta",
  "logoUrl",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

/** True si al menos un campo de contenido de la identidad tiene texto, o si
 * hay al menos un Personaje o un Avatar guardado en el proyecto. Los datos
 * de Contacto NO cuentan aquí a propósito: son opcionales y nunca afectan
 * qué tan genérico sale el contenido por defecto. */
export function identityHasContent(
  identidad: Identidad,
  contexto: { tienePersonaje: boolean; tieneAvatar: boolean },
): boolean {
  if (contexto.tienePersonaje || contexto.tieneAvatar) return true;
  return CAMPOS_DE_CONTENIDO.some((campo) => identidad[campo]?.trim().length > 0);
}

const CAMPOS_MARCA = [
  "voz",
  "reglas",
  "objetivo",
  "historia",
  "valores",
  "audiencia",
  "competidores",
  "manualMarca",
  "promesa",
  "posicionamiento",
  "arquetipo",
  "manifiesto",
  "emociones",
  "impactoEsperado",
  "adaptacionAudiencia",
  "diferenciadores",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

const CAMPOS_LINEAMIENTOS = [
  "ctaHabituales",
  "hashtagsFrecuentes",
  "restricciones",
  "formalidad",
  "humor",
  "nivelTecnico",
  "palabrasSiempre",
  "palabrasNunca",
  "frasesCaracteristicas",
  "estructuraContenidos",
  "respuestaCriticas",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

const CAMPOS_ESTILO = [
  "paleta",
  "tipografia",
  "look",
  "camara",
  "ritmo",
  "estructuraCta",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

const CAMPOS_CONTACTO = [
  "sitioWeb",
  "telefono",
  "direccion",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

function algunCampoConContenido(identidad: Identidad, campos: ReadonlyArray<CampoTextoIdentidad>): boolean {
  return campos.some((campo) => identidad[campo]?.trim().length > 0);
}

/** True si hay al menos un dato de contacto cargado — usado para decidir si
 * mostrar la casilla "Incluir datos de contacto" en Crear (no tiene sentido
 * ofrecerla si no hay nada que incluir). */
export function identidadTieneContacto(identidad: Identidad): boolean {
  return algunCampoConContenido(identidad, CAMPOS_CONTACTO);
}

export type IdentidadPorSeccion = {
  marca: boolean;
  avatar: boolean;
  personaje: boolean;
  estilo: boolean;
  /** CTA habituales / hashtags frecuentes / restricciones — misma capa de
   * lectura para la sección plegable "Lineamientos de contenido". */
  lineamientos: boolean;
  /** No forma parte del checklist de "entrenamiento" (Contacto es opcional
   * y no afecta qué tan genérico sale el contenido) — se agrega aquí solo
   * porque otras pantallas (ej. las secciones plegables de Identidad)
   * necesitan el mismo criterio de "¿tiene contenido?" para Contacto. */
  contacto: boolean;
};

/**
 * Estado ✔/✗ por sección — a diferencia de `identityHasContent` (que evalúa
 * la identidad completa junta), esto agrupa los campos por sección para el
 * checklist visual del Compilador. Personaje/Avatar ✔ = existe al menos
 * uno en la lista del proyecto (se le pasa como contexto — el Compilador
 * no consulta la base de datos). No cambia `compileIdentity` ni su salida;
 * es una capa de lectura adicional sobre los mismos datos.
 */
export function identidadPorSeccion(
  identidad: Identidad,
  contexto: { tienePersonaje: boolean; tieneAvatar: boolean },
): IdentidadPorSeccion {
  return {
    marca: algunCampoConContenido(identidad, CAMPOS_MARCA),
    avatar: contexto.tieneAvatar,
    personaje: contexto.tienePersonaje,
    estilo: algunCampoConContenido(identidad, CAMPOS_ESTILO),
    lineamientos: algunCampoConContenido(identidad, CAMPOS_LINEAMIENTOS),
    contacto: algunCampoConContenido(identidad, CAMPOS_CONTACTO),
  };
}

function primerValorConContenido(identidad: Identidad, campos: ReadonlyArray<CampoTextoIdentidad>): string {
  for (const campo of campos) {
    const valor = identidad[campo];
    if (valor && valor.trim().length > 0) return valor.trim();
  }
  return "";
}

export type ResumenPorSeccion = {
  marca: string;
  estilo: string;
  lineamientos: string;
  contacto: string;
};

/**
 * El primer campo con contenido de Marca/Estilo/Contacto — para el resumen
 * de una línea que se muestra cuando esa sección viene plegada en la
 * pantalla Identidad. Personaje y Avatar ya no tienen resumen acá: pasaron
 * a ser listas de tarjetas con su propio resumen por tarjeta.
 */
export function resumenPorSeccion(identidad: Identidad): ResumenPorSeccion {
  return {
    marca: primerValorConContenido(identidad, CAMPOS_MARCA),
    estilo: primerValorConContenido(identidad, CAMPOS_ESTILO),
    lineamientos: primerValorConContenido(identidad, CAMPOS_LINEAMIENTOS),
    contacto: primerValorConContenido(identidad, CAMPOS_CONTACTO),
  };
}
