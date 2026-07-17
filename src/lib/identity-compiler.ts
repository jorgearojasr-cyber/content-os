import type { Avatar, Identidad, Personaje } from "./types";
import { avatarTieneContenido, parseFotosPersonaje } from "./types";

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

/** Renderiza las fotos de referencia del Personaje SELECCIONADO (hasta 4)
 * numeradas, igual de literal que el resto del compilador — no elige "la
 * mejor". */
function formatearFotosPersonaje(personaje: Personaje | null | undefined): string {
  if (!personaje) return "";
  const fotos = parseFotosPersonaje(personaje.fotosUrlsJson);
  if (fotos.length === 0) return "";
  return fotos.map((url, i) => `${i + 1}. ${url}`).join("\n");
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
 * Compilador nunca los elige por su cuenta: siempre recibe el objeto ya
 * SELECCIONADO (por quien llama) en `opciones.personaje`/`opciones.avatar`.
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

export type OpcionesCompilado = {
  /** Si es `false`, omite toda la sección "## Marca" (voz, reglas, objetivo
   * y Avatar del cliente ideal incluidos). Por defecto `true` — no cambia
   * el comportamiento de ningún llamado existente. */
  incluirMarca?: boolean;
  /** Si es `false`, omite toda la sección "## Personaje". Por defecto `true`. */
  incluirPersonaje?: boolean;
  /** Si es `true`, agrega una sección "## Contacto" (sitio web, teléfono,
   * dirección). Por defecto `false` — el Compilador nunca envía datos de
   * contacto salvo que se pida explícitamente (ver casillas de Crear). */
  incluirContacto?: boolean;
  /** El Personaje SELECCIONADO para esta compilación (por quien llama —
   * el Compilador nunca elige entre varios). `null`/`undefined` = sin
   * Personaje, la sección se omite aunque `incluirPersonaje` sea `true`. */
  personaje?: Personaje | null;
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
    personaje = null,
    avatar = null,
    posicionLogo = null,
  } = opciones;

  const avatarFormateado = formatearAvatar(avatar);

  const marca = incluirMarca
    ? seccion("Marca", [
        ["Voz y personalidad", identidad.voz],
        ["Reglas de escritura", identidad.reglas],
        ["Objetivo del proyecto", identidad.objetivo],
        avatarFormateado ? `Avatar del cliente ideal:\n${avatarFormateado}` : "",
      ])
    : "";

  const fotosFormateadas = formatearFotosPersonaje(personaje);
  const personajeSeccion =
    incluirPersonaje && personaje
      ? seccion("Personaje", [
          ["Nombre", personaje.nombre],
          ["Personalidad", personaje.personalidad],
          ["Descripción física", personaje.fisica],
          ["Vestuario", personaje.vestuario],
          ["Voz (descripción)", personaje.vozDescrita],
          ["Gestos", personaje.gestos],
          ["Muletillas", personaje.muletillas],
          fotosFormateadas ? `Fotos de referencia:\n${fotosFormateadas}` : "",
        ])
      : "";

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

  const secciones = [marca, personajeSeccion, estilo, contacto, logoConPosicion].filter(Boolean);

  if (secciones.length === 0) {
    return "(Esta identidad todavía no tiene ningún campo cargado. Complétala en la pestaña Identidad.)";
  }

  return secciones.join("\n\n");
}

const CAMPOS_DE_CONTENIDO = [
  "voz",
  "reglas",
  "objetivo",
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

const CAMPOS_MARCA = ["voz", "reglas", "objetivo"] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

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
    contacto: primerValorConContenido(identidad, CAMPOS_CONTACTO),
  };
}
