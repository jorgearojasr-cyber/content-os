import { TIPOS_ESCENA_STORYBOARD } from "./types";
import type { TipoEscenaStoryboard } from "./types";
import { normalizarTexto } from "./similitud";

/**
 * Parser determinístico del Creative Blueprint Document (CBD) v1 — función
 * pura, sin acceso a base de datos ni UI. Implementa exactamente las
 * reglas de creative-blueprint-v1-formato-tecnico.md, validadas en dos
 * rondas de stress test con CBD reales antes de escribir esta función
 * (ver secciones 3 y 7 de ese documento para el porqué de cada regla).
 */

export type EncabezadoCBD = {
  version: number;
  autor: string;
  fecha: string;
  conversacion: string;
};

export type ProduccionCBD = {
  titulo: string;
  proyecto: string;
  canal: string;
  formato: string;
  ideaCentral: string;
  objetivoGeneral: string;
  objetivoEspectador: string[];
  publicoObjetivo: string;
  duracionEstimada: number | null;
  notas: string;
};

export type RecursosGlobalesCBD = {
  musicaPrincipal: string;
  intro: string;
  outro: string;
};

export type EscenaCBD = {
  /** El número escrito en "### Escena N" — solo lectura humana, nunca
   * determina el orden real (eso lo da la posición del bloque). */
  numeroEtiqueta: number | null;
  /** Una de TIPOS_ESCENA_STORYBOARD, o "" si faltaba o no matcheó ninguno
   * de los 8 valores reconocidos (ver `errores` para el detalle). */
  tipo: string;
  objetivoNarrativo: string;
  duracionEstimada: number | null;
  emocion: string;
  resultadoEsperado: string;
  personajes: string[];
  locacion: string;
  plano: string;
  movimientoCamara: string;
  textoHablado: string;
  textoPantalla: string;
  recursosNecesarios: string;
  promptImagen: string;
  promptVideo: string;
  musica: string;
  transicion: string;
  notas: string;
};

export type ResultadoParseoCBD = {
  version: number | null;
  encabezado: EncabezadoCBD | null;
  /** `null` = la sección Contexto no estaba presente en el documento. */
  contexto: string | null;
  produccion: ProduccionCBD | null;
  /** `null` = la sección Recursos globales no estaba presente. */
  recursosGlobales: RecursosGlobalesCBD | null;
  escenas: EscenaCBD[];
  /** Mensajes bloqueantes — si hay al menos uno, el CBD no es válido. */
  errores: string[];
  /** No bloquean el import; siempre incluyen dónde ocurrió cada una. */
  advertencias: string[];
};

/** Nombres conocidos de la Biblioteca para resolver referencias del CBD —
 * comparación exacta case-insensitive (stub simple; la resolución real
 * con "no resuelto para revisión manual" es responsabilidad de la fase de
 * importador, no de este parser). */
export type BibliotecaConocida = {
  proyectos: string[];
  personajes: string[];
  locaciones: string[];
  planos: string[];
};

type CampoTexto = { tipo: "texto"; etiqueta: string; clave: string };
type CampoLista = { tipo: "lista"; etiqueta: string; clave: string };
type DefinicionCampo = CampoTexto | CampoLista;

const CAMPOS_ENCABEZADO: DefinicionCampo[] = [
  { tipo: "texto", etiqueta: "Autor", clave: "autor" },
  { tipo: "texto", etiqueta: "Fecha", clave: "fecha" },
  { tipo: "texto", etiqueta: "Conversación", clave: "conversacion" },
];

const CAMPOS_PRODUCCION: DefinicionCampo[] = [
  { tipo: "texto", etiqueta: "Título", clave: "titulo" },
  { tipo: "texto", etiqueta: "Proyecto", clave: "proyecto" },
  { tipo: "texto", etiqueta: "Canal", clave: "canal" },
  { tipo: "texto", etiqueta: "Formato", clave: "formato" },
  { tipo: "texto", etiqueta: "Idea central", clave: "ideaCentral" },
  { tipo: "texto", etiqueta: "Objetivo general", clave: "objetivoGeneral" },
  { tipo: "lista", etiqueta: "Objetivo del espectador", clave: "objetivoEspectador" },
  { tipo: "texto", etiqueta: "Público objetivo", clave: "publicoObjetivo" },
  { tipo: "texto", etiqueta: "Duración estimada", clave: "duracionEstimada" },
  { tipo: "texto", etiqueta: "Notas", clave: "notas" },
];

const CAMPOS_RECURSOS_GLOBALES: DefinicionCampo[] = [
  { tipo: "texto", etiqueta: "Música principal", clave: "musicaPrincipal" },
  { tipo: "texto", etiqueta: "Intro", clave: "intro" },
  { tipo: "texto", etiqueta: "Outro", clave: "outro" },
];

const CAMPOS_ESCENA: DefinicionCampo[] = [
  { tipo: "texto", etiqueta: "Tipo", clave: "tipo" },
  { tipo: "texto", etiqueta: "Objetivo narrativo", clave: "objetivoNarrativo" },
  { tipo: "texto", etiqueta: "Duración estimada", clave: "duracionEstimada" },
  { tipo: "texto", etiqueta: "Emoción", clave: "emocion" },
  { tipo: "texto", etiqueta: "Resultado esperado", clave: "resultadoEsperado" },
  { tipo: "lista", etiqueta: "Personajes", clave: "personajes" },
  { tipo: "texto", etiqueta: "Locación", clave: "locacion" },
  { tipo: "texto", etiqueta: "Plano", clave: "plano" },
  { tipo: "texto", etiqueta: "Movimiento de cámara", clave: "movimientoCamara" },
  { tipo: "texto", etiqueta: "Texto hablado", clave: "textoHablado" },
  { tipo: "texto", etiqueta: "Texto en pantalla", clave: "textoPantalla" },
  { tipo: "texto", etiqueta: "Recursos necesarios", clave: "recursosNecesarios" },
  { tipo: "texto", etiqueta: "Prompt IA (imagen)", clave: "promptImagen" },
  { tipo: "texto", etiqueta: "Prompt IA (video)", clave: "promptVideo" },
  { tipo: "texto", etiqueta: "Música", clave: "musica" },
  { tipo: "texto", etiqueta: "Transición", clave: "transicion" },
  { tipo: "texto", etiqueta: "Notas", clave: "notas" },
];

/** Las 8 etiquetas humanas del CBD, en el mismo orden que
 * TIPOS_ESCENA_STORYBOARD — un índice sirve para ambas listas. */
const ETIQUETAS_TIPO_ESCENA_CBD = [
  "Gancho",
  "Problema",
  "Descubrimiento",
  "Solución",
  "CTA",
  "B-roll",
  "Transición",
  "Otra",
] as const;

/** Los 4 nombres de sección de nivel superior — la única lista contra la
 * que se reconoce un encabezado de sección sin "##" (ver
 * `tituloSiEncabezadoSeccion`). */
const ENCABEZADOS_SECCION = ["Contexto", "Producción", "Recursos globales", "Escenas"];

/** Quita un prefijo Markdown de encabezado ("#", "##", "###"...) si está
 * presente, junto con el espacio que lo sigue. ChatGPT muestra los
 * encabezados del Creative Blueprint como texto renderizado (título,
 * subtítulo) — copiar ese resultado al portapapeles trae el texto pero
 * pierde los "#" originales, así que el parser tiene que reconocer el
 * mismo encabezado con o sin marcador. */
function quitarMarcadorEncabezado(linea: string): string {
  return linea.replace(/^#{1,6}\s*/, "");
}

/** True si la línea (ya trimeada) es, ella sola, uno de los 4 encabezados
 * de sección conocidos — comparando case/tilde-insensitive y sin importar
 * si trae "##" adelante. Devuelve el título CANÓNICO (para que el resto
 * del parser siga comparando con `===` sin duplicar la normalización) o
 * `null` si la línea no es un encabezado de sección en esta posición.
 *
 * Con "##" el marcador es una señal sintáctica inequívoca — nada más en el
 * documento empieza así — así que cualquier título cuenta como límite de
 * sección, conocido o no (forward-compat, igual que antes de este fix).
 * Sin "##" no hay ninguna señal sintáctica: la única forma segura de
 * reconocer el encabezado sin abrir falsos positivos dentro de un párrafo,
 * un texto hablado o un ítem de lista es exigir que la línea completa
 * coincida exacto (normalizada) con uno de los 4 nombres conocidos. */
function tituloSiEncabezadoSeccion(linea: string): string | null {
  const lineaTrim = linea.trim();
  const tieneMarcador = lineaTrim.startsWith("## ");
  const contenido = tieneMarcador ? lineaTrim.slice(3).trim() : lineaTrim;
  const normalizado = normalizarTexto(contenido);
  const conocido = ENCABEZADOS_SECCION.find((e) => normalizarTexto(e) === normalizado);
  if (conocido) return conocido;
  return tieneMarcador ? contenido : null;
}

/** Misma idea que `tituloSiEncabezadoSeccion` pero para "### Escena N"
 * dentro de la sección Escenas. Acá no hay una lista fija de títulos
 * posibles (el número y el texto después varían) — sin "###", la única
 * señal segura es que la línea completa empiece con la palabra "Escena"
 * (case/tilde-insensitive, como palabra completa: no matchea "Escenas"). */
function tituloSiEncabezadoEscena(linea: string): string | null {
  const lineaTrim = linea.trim();
  const tieneMarcador = lineaTrim.startsWith("### ");
  const contenido = tieneMarcador ? lineaTrim.slice(4).trim() : lineaTrim;
  if (tieneMarcador) return contenido;
  return /^escena\b/i.test(normalizarTexto(contenido)) ? contenido : null;
}

/** True si `lineaTrim` empieza con `${etiqueta}:`, comparando case/tilde-
 * insensitive (mismo criterio que los encabezados — ver
 * `tituloSiEncabezadoSeccion`) — acepta "Título"/"Titulo",
 * "Locación"/"Locacion", etc. La normalización nunca cambia la cantidad de
 * caracteres (una vocal con o sin tilde sigue siendo un solo caracter), así
 * que el largo de `etiqueta` sigue siendo el corte correcto para separar
 * la etiqueta del valor libre que la sigue — ese valor nunca se toca. */
function empiezaConEtiqueta(lineaTrim: string, etiqueta: string): boolean {
  const necesaria = `${etiqueta}:`;
  if (lineaTrim.length < necesaria.length) return false;
  return normalizarTexto(lineaTrim.slice(0, necesaria.length)) === normalizarTexto(necesaria);
}

/** Parsea un bloque de líneas contra una lista fija de campos. Etiquetas
 * no reconocidas se ignoran (forward-compat). El candidato con la
 * etiqueta más larga gana si dos etiquetas coincidieran como prefijo una
 * de otra (ninguna colisión real hoy, pero deja la regla sin ambigüedad
 * para cuando se agreguen campos nuevos). */
function parsearBloque(lineas: string[], campos: DefinicionCampo[]): Record<string, string | string[]> {
  const resultado: Record<string, string | string[]> = {};
  let i = 0;
  while (i < lineas.length) {
    const lineaTrim = lineas[i].trim();
    if (lineaTrim === "") {
      i++;
      continue;
    }

    const campo = campos
      .filter((c) => empiezaConEtiqueta(lineaTrim, c.etiqueta))
      .sort((a, b) => b.etiqueta.length - a.etiqueta.length)[0];

    if (!campo) {
      i++;
      continue;
    }

    if (campo.tipo === "texto") {
      resultado[campo.clave] = lineaTrim.slice(campo.etiqueta.length + 1).trim();
      i++;
      continue;
    }

    const items: string[] = [];
    i++;
    while (i < lineas.length) {
      const l = lineas[i].trim();
      if (l === "") {
        i++;
        continue;
      }
      if (l.startsWith("- ")) {
        items.push(l.slice(2).trim());
        i++;
        continue;
      }
      break;
    }
    resultado[campo.clave] = items;
  }
  return resultado;
}

/** Divide líneas en bloques cada vez que una línea es reconocida como
 * encabezado por `esEncabezado` — usado tanto para secciones
 * (`tituloSiEncabezadoSeccion`) como para escenas dentro de la sección
 * Escenas (`tituloSiEncabezadoEscena`). `esEncabezado` devuelve el título
 * del bloque que arranca ahí, o `null` si la línea no cuenta como
 * encabezado en esta posición — nunca dentro de un párrafo, texto hablado
 * o ítem de lista. */
function dividirPorEncabezado(
  lineas: string[],
  esEncabezado: (linea: string) => string | null,
): { titulo: string; lineas: string[] }[] {
  const bloques: { titulo: string; lineas: string[] }[] = [];
  let actual: { titulo: string; lineas: string[] } | null = null;
  for (const linea of lineas) {
    const titulo = esEncabezado(linea);
    if (titulo !== null) {
      if (actual) bloques.push(actual);
      actual = { titulo, lineas: [] };
    } else if (actual) {
      actual.lineas.push(linea);
    }
  }
  if (actual) bloques.push(actual);
  return bloques;
}

function parsearDuracion(valor: string | undefined): number | null {
  if (!valor) return null;
  const n = Number.parseInt(valor.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizarTipoEscena(valor: string): TipoEscenaStoryboard | null {
  const normalizado = normalizarTexto(valor);
  const indice = ETIQUETAS_TIPO_ESCENA_CBD.findIndex((e) => normalizarTexto(e) === normalizado);
  return indice === -1 ? null : TIPOS_ESCENA_STORYBOARD[indice];
}

function coincideCaseInsensitive(valor: string, conocidos: string[]): boolean {
  const normalizado = normalizarTexto(valor);
  return conocidos.some((c) => normalizarTexto(c) === normalizado);
}

function extraerNumero(tituloBloque: string): number | null {
  const match = tituloBloque.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

/** "Sin asignar" es el valor que el propio prompt de Content OS le pide a
 * ChatGPT que escriba en Personajes/Locación/Plano cuando no aplica nada —
 * nunca el nombre real de un Personaje/Locación/Plano a resolver contra la
 * Biblioteca. Tratarlo como ausencia de valor (case/tilde-insensitive,
 * igual que un campo vacío) evita que el importador lo ofrezca como si
 * fuera un candidato a vincular — FIX 2 de PREPARACION-FIX-1. */
function esSinAsignar(valor: string): boolean {
  return normalizarTexto(valor) === "sin asignar";
}

function parsearEscena(
  bloque: { titulo: string; lineas: string[] },
  indice: number,
  errores: string[],
  advertencias: string[],
  biblioteca: BibliotecaConocida,
): EscenaCBD {
  const campos = parsearBloque(bloque.lineas, CAMPOS_ESCENA);
  const ubicacion = `Escena en posición ${indice + 1}${bloque.titulo ? ` ("${bloque.titulo}")` : ""}`;

  const tipoCrudo = ((campos.tipo as string) ?? "").trim();
  const tipoNormalizado = normalizarTipoEscena(tipoCrudo);
  if (!tipoNormalizado) {
    errores.push(
      `${ubicacion}: falta "Tipo" o no es uno de los 8 valores reconocidos (encontrado: "${tipoCrudo || "vacío"}").`,
    );
  }

  const objetivoNarrativo = ((campos.objetivoNarrativo as string) ?? "").trim();
  if (!objetivoNarrativo) {
    errores.push(`${ubicacion}: falta "Objetivo narrativo".`);
  }

  const personajes = ((campos.personajes as string[]) ?? []).filter((n) => !esSinAsignar(n));
  for (const nombre of personajes) {
    if (!coincideCaseInsensitive(nombre, biblioteca.personajes)) {
      advertencias.push(`${ubicacion}: Personaje "${nombre}" no coincide con ningún Personaje existente.`);
    }
  }
  const locacionCruda = ((campos.locacion as string) ?? "").trim();
  const locacion = esSinAsignar(locacionCruda) ? "" : locacionCruda;
  if (locacion && !coincideCaseInsensitive(locacion, biblioteca.locaciones)) {
    advertencias.push(`${ubicacion}: Locación "${locacion}" no coincide con ninguna Locación existente.`);
  }
  const planoCrudo = ((campos.plano as string) ?? "").trim();
  const plano = esSinAsignar(planoCrudo) ? "" : planoCrudo;
  if (plano && !coincideCaseInsensitive(plano, biblioteca.planos)) {
    advertencias.push(`${ubicacion}: Plano "${plano}" no coincide con ningún Plano existente.`);
  }

  return {
    numeroEtiqueta: extraerNumero(bloque.titulo),
    tipo: tipoNormalizado ?? "",
    objetivoNarrativo,
    duracionEstimada: parsearDuracion(campos.duracionEstimada as string | undefined),
    emocion: ((campos.emocion as string) ?? "").trim(),
    resultadoEsperado: ((campos.resultadoEsperado as string) ?? "").trim(),
    personajes,
    locacion,
    plano,
    movimientoCamara: ((campos.movimientoCamara as string) ?? "").trim(),
    textoHablado: ((campos.textoHablado as string) ?? "").trim(),
    textoPantalla: ((campos.textoPantalla as string) ?? "").trim(),
    recursosNecesarios: ((campos.recursosNecesarios as string) ?? "").trim(),
    promptImagen: ((campos.promptImagen as string) ?? "").trim(),
    promptVideo: ((campos.promptVideo as string) ?? "").trim(),
    musica: ((campos.musica as string) ?? "").trim(),
    transicion: ((campos.transicion as string) ?? "").trim(),
    notas: ((campos.notas as string) ?? "").trim(),
  };
}

const RESULTADO_VACIO: Omit<ResultadoParseoCBD, "version" | "errores"> = {
  encabezado: null,
  contexto: null,
  produccion: null,
  recursosGlobales: null,
  escenas: [],
  advertencias: [],
};

const PATRON_ENCABEZADO_VERSION = /^creative blueprint v(\d+)(?:\.\d+)?$/i;

/** Señal aislada de "este texto tiene indicio de estructura de Blueprint" —
 * la misma condición exacta que `parsearBlueprint` usa como primer chequeo
 * bloqueante (el encabezado de versión), expuesta sola para poder bifurcar
 * ANTES de correr el resto del parser. No valida nada más: un texto con el
 * encabezado correcto pero roto más abajo (sin Título, sin escenas, Tipos
 * inválidos) igual cuenta como "tiene estructura" acá — ese texto se trata
 * como guion en desarrollo (con sus errores mostrados en la revisión), no
 * como idea cruda. La presencia de estructura, aunque sea parcial, siempre
 * gana sobre la ausencia de estructura (UX Migration 1). */
export function tieneEstructuraDeBlueprint(textoCrudo: string): boolean {
  const lineas = textoCrudo.split(/\r?\n/);
  const indicePrimeraLinea = lineas.findIndex((l) => l.trim() !== "");
  const primeraLinea =
    indicePrimeraLinea === -1 ? "" : quitarMarcadorEncabezado(lineas[indicePrimeraLinea].trim());
  return PATRON_ENCABEZADO_VERSION.test(primeraLinea);
}

export function parsearBlueprint(textoCrudo: string, biblioteca: BibliotecaConocida): ResultadoParseoCBD {
  const errores: string[] = [];
  const lineas = textoCrudo.split(/\r?\n/);

  const indicePrimeraLinea = lineas.findIndex((l) => l.trim() !== "");
  const primeraLinea =
    indicePrimeraLinea === -1 ? "" : quitarMarcadorEncabezado(lineas[indicePrimeraLinea].trim());
  const matchVersion = primeraLinea.match(PATRON_ENCABEZADO_VERSION);

  if (!matchVersion) {
    errores.push(
      'Falta el encabezado de versión — la primera línea debe ser "Creative Blueprint v1" (con o sin "#" adelante).',
    );
    return { version: null, errores, ...RESULTADO_VACIO };
  }

  const version = Number.parseInt(matchVersion[1], 10);
  if (version !== 1) {
    errores.push(`Este Blueprint es v${version} — esta versión de la plataforma solo interpreta v1.`);
    return { version, errores, ...RESULTADO_VACIO };
  }

  const resto = lineas.slice(indicePrimeraLinea + 1);
  const indicePrimeraSeccion = resto.findIndex((l) => tituloSiEncabezadoSeccion(l) !== null);
  const lineasEncabezado = indicePrimeraSeccion === -1 ? resto : resto.slice(0, indicePrimeraSeccion);
  const lineasSecciones = indicePrimeraSeccion === -1 ? [] : resto.slice(indicePrimeraSeccion);

  const camposEncabezado = parsearBloque(lineasEncabezado, CAMPOS_ENCABEZADO);
  const encabezado: EncabezadoCBD = {
    version,
    autor: (camposEncabezado.autor as string) ?? "",
    fecha: (camposEncabezado.fecha as string) ?? "",
    conversacion: (camposEncabezado.conversacion as string) ?? "",
  };

  const secciones = dividirPorEncabezado(lineasSecciones, tituloSiEncabezadoSeccion);
  const advertencias: string[] = [];

  let contexto: string | null = null;
  let produccion: ProduccionCBD | null = null;
  let recursosGlobales: RecursosGlobalesCBD | null = null;
  let escenas: EscenaCBD[] = [];

  for (const seccion of secciones) {
    if (seccion.titulo === "Contexto") {
      contexto = seccion.lineas.join("\n").trim();
    } else if (seccion.titulo === "Producción") {
      const campos = parsearBloque(seccion.lineas, CAMPOS_PRODUCCION);
      produccion = {
        titulo: (campos.titulo as string) ?? "",
        proyecto: (campos.proyecto as string) ?? "",
        canal: (campos.canal as string) ?? "",
        formato: (campos.formato as string) ?? "",
        ideaCentral: (campos.ideaCentral as string) ?? "",
        objetivoGeneral: (campos.objetivoGeneral as string) ?? "",
        objetivoEspectador: (campos.objetivoEspectador as string[]) ?? [],
        publicoObjetivo: (campos.publicoObjetivo as string) ?? "",
        duracionEstimada: parsearDuracion(campos.duracionEstimada as string | undefined),
        notas: (campos.notas as string) ?? "",
      };
    } else if (seccion.titulo === "Recursos globales") {
      const campos = parsearBloque(seccion.lineas, CAMPOS_RECURSOS_GLOBALES);
      recursosGlobales = {
        musicaPrincipal: (campos.musicaPrincipal as string) ?? "",
        intro: (campos.intro as string) ?? "",
        outro: (campos.outro as string) ?? "",
      };
    } else if (seccion.titulo === "Escenas") {
      const bloquesEscena = dividirPorEncabezado(seccion.lineas, tituloSiEncabezadoEscena);
      escenas = bloquesEscena.map((bloque, indice) =>
        parsearEscena(bloque, indice, errores, advertencias, biblioteca),
      );
    }
    // Encabezados de sección no reconocidos se ignoran (forward-compat).
  }

  if (!produccion || !produccion.titulo) {
    errores.push("Falta el Título de la Producción.");
  }
  if (escenas.length === 0) {
    errores.push("El Blueprint no tiene ninguna escena.");
  }

  if (produccion?.proyecto && !coincideCaseInsensitive(produccion.proyecto, biblioteca.proyectos)) {
    advertencias.push(`Proyecto "${produccion.proyecto}" no coincide con ningún proyecto existente.`);
  }
  if (produccion && produccion.duracionEstimada !== null && escenas.length > 0) {
    const sumaReal = escenas.reduce((acc, e) => acc + (e.duracionEstimada ?? 0), 0);
    if (sumaReal !== produccion.duracionEstimada) {
      advertencias.push(
        `La duración estimada de la Producción (${produccion.duracionEstimada}s) no coincide con la suma de las escenas (${sumaReal}s) — es solo informativo.`,
      );
    }
  }

  return { version, encabezado, contexto, produccion, recursosGlobales, escenas, errores, advertencias };
}
