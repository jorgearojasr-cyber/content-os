import type { Identidad } from "./types";
import { avatarHasContent, parseAvatar } from "./types";

/** Todos los campos de `Identidad` salvo `avatarJson` (que es `unknown`,
 * columna `jsonb` — no un campo de texto simple como el resto). */
type CampoTextoIdentidad = Exclude<keyof Identidad, "avatarJson">;

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

/**
 * Compila el objeto Identidad completo en un bloque de texto canónico.
 * Las secciones sin ningún dato cargado se omiten (no se envían
 * etiquetas vacías a una futura generación), pero el orden y el
 * formato de las que sí tienen datos nunca cambia.
 */
export function compileIdentity(identidad: Identidad): string {
  const avatarFormateado = formatearAvatar(identidad.avatarJson);

  const marca = seccion("Marca", [
    ["Voz y personalidad", identidad.voz],
    ["Reglas de escritura", identidad.reglas],
    ["Objetivo del proyecto", identidad.objetivo],
    avatarFormateado ? `Avatar del cliente ideal:\n${avatarFormateado}` : "",
  ]);

  const personaje = seccion("Personaje", [
    ["Nombre", identidad.personajeNombre],
    ["Personalidad", identidad.personajePersonalidad],
    ["Descripción física", identidad.fisica],
    ["Vestuario", identidad.vestuario],
    ["Voz (descripción)", identidad.vozDescrita],
    ["Gestos", identidad.gestos],
    ["Muletillas", identidad.muletillas],
    ["Foto de referencia", identidad.fotoUrl],
  ]);

  const estilo = seccion("Estilo", [
    ["Paleta de colores", identidad.paleta],
    ["Tipografía", identidad.tipografia],
    ["Look visual", identidad.look],
    ["Cámara", identidad.camara],
    ["Ritmo", identidad.ritmo],
    ["Estructura de CTA", identidad.estructuraCta],
  ]);

  const secciones = [marca, personaje, estilo].filter(Boolean);

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
  "fotoUrl",
  "paleta",
  "tipografia",
  "look",
  "camara",
  "ritmo",
  "estructuraCta",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

/** True si al menos un campo de contenido de la identidad tiene texto. */
export function identityHasContent(identidad: Identidad): boolean {
  if (avatarHasContent(parseAvatar(identidad.avatarJson))) return true;
  return CAMPOS_DE_CONTENIDO.some((campo) => identidad[campo]?.trim().length > 0);
}

const CAMPOS_MARCA = ["voz", "reglas", "objetivo"] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

// Los 7 campos de texto del Personaje — a propósito sin `fotoUrl`, que es una
// referencia de medio, no contenido de texto de la sección.
const CAMPOS_PERSONAJE = [
  "personajeNombre",
  "personajePersonalidad",
  "fisica",
  "vestuario",
  "vozDescrita",
  "gestos",
  "muletillas",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

const CAMPOS_ESTILO = [
  "paleta",
  "tipografia",
  "look",
  "camara",
  "ritmo",
  "estructuraCta",
] as const satisfies ReadonlyArray<CampoTextoIdentidad>;

function algunCampoConContenido(identidad: Identidad, campos: ReadonlyArray<CampoTextoIdentidad>): boolean {
  return campos.some((campo) => identidad[campo]?.trim().length > 0);
}

export type IdentidadPorSeccion = {
  marca: boolean;
  avatar: boolean;
  personaje: boolean;
  estilo: boolean;
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
  };
}
