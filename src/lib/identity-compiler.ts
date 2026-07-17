import type { Identidad } from "./types";
import { avatarHasContent, parseAvatar, parseFotosPersonaje } from "./types";

/** Todos los campos de `Identidad` salvo `avatarJson` y `fotosUrlsJson`
 * (columnas `jsonb`, ambas `unknown` — no campos de texto simple). */
type CampoTextoIdentidad = Exclude<keyof Identidad, "avatarJson" | "fotosUrlsJson">;

const ETIQUETAS_AVATAR: Array<[keyof ReturnType<typeof parseAvatar>, string]> = [
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
 * Renderiza el avatar campo por campo (no lo resume): cada dato guardado
 * se antepone con su propia etiqueta, igual que el resto del compilador.
 */
function formatearAvatar(avatarJson: unknown): string {
  const avatar = parseAvatar(avatarJson);
  if (!avatarHasContent(avatar)) return "";
  return ETIQUETAS_AVATAR.filter(([campo]) => avatar[campo]?.trim().length > 0)
    .map(([campo, etiqueta]) => `${etiqueta}: ${avatar[campo].trim()}`)
    .join("\n");
}

/** Renderiza las fotos de referencia del Personaje (hasta 4) numeradas,
 * igual de literal que el resto del compilador — no elige "la mejor". */
function formatearFotosPersonaje(fotosUrlsJson: unknown): string {
  const fotos = parseFotosPersonaje(fotosUrlsJson);
  if (fotos.length === 0) return "";
  return fotos.map((url, i) => `${i + 1}. ${url}`).join("\n");
}

/**
 * COMPILADOR DE IDENTIDAD
 * ------------------------------------------------------------------
 * Esta es la pieza que justifica que Content OS exista.
 *
 * No es un agente de IA. Es una función pura: mismo objeto Identidad
 * de entrada -> exactamente el mismo texto de salida, siempre. No
 * resume, no reinterpreta, no "recuerda a su manera" — copia los
 * campos guardados de forma literal dentro de una plantilla fija.
 *
 * La consistencia de un proyecto no depende de que un modelo de IA
 * "se acuerde bien" del personaje o del estilo: depende de que este
 * compilador entregue, cada vez, el mismo bloque de texto exacto,
 * que luego se inyecta sin abreviar en cualquier generación futura
 * (texto, imagen o video) y hacia cualquier herramienta externa.
 *
 * A partir de la Fase 2, este bloque es literalmente lo que se
 * antepone a cada llamada de generación. En la Fase 1 no hay
 * generación todavía, pero el compilador ya es real y comprobable:
 * la pantalla "Crear" muestra su salida como vista previa.
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
};

/**
 * Compila el objeto Identidad completo en un bloque de texto canónico.
 * Las secciones sin ningún dato cargado se omiten (no se envían
 * etiquetas vacías a una futura generación), pero el orden y el
 * formato de las que sí tienen datos nunca cambia.
 *
 * `opciones` controla qué secciones se incluyen — es la única fuente de
 * verdad que usan tanto la vista previa (todo incluido, opciones por
 * defecto) como la generación real desde Crear (con las casillas del
 * usuario). No hay una segunda copia de esta lógica en ningún otro lado.
 */
export function compileIdentity(identidad: Identidad, opciones: OpcionesCompilado = {}): string {
  const { incluirMarca = true, incluirPersonaje = true, incluirContacto = false } = opciones;

  const avatarFormateado = formatearAvatar(identidad.avatarJson);

  const marca = incluirMarca
    ? seccion("Marca", [
        ["Voz y personalidad", identidad.voz],
        ["Reglas de escritura", identidad.reglas],
        ["Objetivo del proyecto", identidad.objetivo],
        avatarFormateado ? `Avatar del cliente ideal:\n${avatarFormateado}` : "",
      ])
    : "";

  const fotosFormateadas = formatearFotosPersonaje(identidad.fotosUrlsJson);
  const personaje = incluirPersonaje
    ? seccion("Personaje", [
        ["Nombre", identidad.personajeNombre],
        ["Personalidad", identidad.personajePersonalidad],
        ["Descripción física", identidad.fisica],
        ["Vestuario", identidad.vestuario],
        ["Voz (descripción)", identidad.vozDescrita],
        ["Gestos", identidad.gestos],
        ["Muletillas", identidad.muletillas],
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

  const secciones = [marca, personaje, estilo, contacto].filter(Boolean);

  if (secciones.length === 0) {
    return "(Esta identidad todavía no tiene ningún campo cargado. Complétala en la pestaña Identidad.)";
  }

  return secciones.join("\n\n");
}

const CAMPOS_DE_CONTENIDO = [
  "voz",
  "reglas",
  "objetivo",
  "personajeNombre",
  "personajePersonalidad",
  "fisica",
  "vestuario",
  "vozDescrita",
  "gestos",
  "muletillas",
  "paleta",
  "tipografia",
  "look",
  "camara",
  "ritmo",
  "estructuraCta",
  "logoUrl",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

/** True si al menos un campo de contenido de la identidad tiene texto.
 * Los datos de Contacto NO cuentan aquí a propósito: son opcionales y
 * nunca afectan qué tan genérico sale el contenido por defecto. */
export function identityHasContent(identidad: Identidad): boolean {
  if (avatarHasContent(parseAvatar(identidad.avatarJson))) return true;
  if (parseFotosPersonaje(identidad.fotosUrlsJson).length > 0) return true;
  return CAMPOS_DE_CONTENIDO.some((campo) => identidad[campo]?.trim().length > 0);
}

const CAMPOS_MARCA = ["voz", "reglas", "objetivo"] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

// Los 7 campos de texto del Personaje — a propósito sin `fotosUrlsJson`, que
// es una referencia de medio, no contenido de texto de la sección.
const CAMPOS_PERSONAJE = [
  "personajeNombre",
  "personajePersonalidad",
  "fisica",
  "vestuario",
  "vozDescrita",
  "gestos",
  "muletillas",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

// Los 6 campos de texto del Estilo — a propósito sin `logoUrl`, que es una
// referencia de medio, no contenido de texto de la sección (mismo criterio
// que excluye `fotosUrlsJson` de CAMPOS_PERSONAJE).
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
 * checklist visual del Compilador. No cambia `compileIdentity` ni su salida;
 * es una capa de lectura adicional sobre los mismos datos.
 */
export function identidadPorSeccion(identidad: Identidad): IdentidadPorSeccion {
  return {
    marca: algunCampoConContenido(identidad, CAMPOS_MARCA),
    avatar: avatarHasContent(parseAvatar(identidad.avatarJson)),
    personaje: algunCampoConContenido(identidad, CAMPOS_PERSONAJE),
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
  avatar: string;
  personaje: string;
  estilo: string;
  contacto: string;
};

/**
 * El primer campo con contenido de cada sección — para el resumen de una
 * línea que se muestra cuando una sección viene plegada en la pantalla
 * Identidad. Mismos grupos de campos que `identidadPorSeccion`; ningún
 * criterio nuevo de qué pertenece a cada sección.
 */
export function resumenPorSeccion(identidad: Identidad): ResumenPorSeccion {
  const avatar = parseAvatar(identidad.avatarJson);
  const avatarResumen = ETIQUETAS_AVATAR.map(([campo]) => avatar[campo]).find(
    (valor) => valor?.trim().length > 0,
  );
  return {
    marca: primerValorConContenido(identidad, CAMPOS_MARCA),
    avatar: avatarResumen?.trim() ?? "",
    personaje: primerValorConContenido(identidad, CAMPOS_PERSONAJE),
    estilo: primerValorConContenido(identidad, CAMPOS_ESTILO),
    contacto: primerValorConContenido(identidad, CAMPOS_CONTACTO),
  };
}
