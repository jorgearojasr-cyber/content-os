import { TIPOS_ESCENA_STORYBOARD } from "./types";
import type { TipoEscenaStoryboard } from "./types";

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
      .filter((c) => lineaTrim.startsWith(`${c.etiqueta}:`))
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

/** Divide líneas en bloques cada vez que aparece una línea con el prefijo
 * dado (ej. "## " o "### ") — usado tanto para secciones como para
 * escenas dentro de la sección Escenas. */
function dividirPorEncabezado(lineas: string[], prefijo: string): { titulo: string; lineas: string[] }[] {
  const bloques: { titulo: string; lineas: string[] }[] = [];
  let actual: { titulo: string; lineas: string[] } | null = null;
  for (const linea of lineas) {
    if (linea.startsWith(prefijo)) {
      if (actual) bloques.push(actual);
      actual = { titulo: linea.slice(prefijo.length).trim(), lineas: [] };
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
  const normalizado = valor.trim().toLowerCase();
  const indice = ETIQUETAS_TIPO_ESCENA_CBD.findIndex((e) => e.toLowerCase() === normalizado);
  return indice === -1 ? null : TIPOS_ESCENA_STORYBOARD[indice];
}

function coincideCaseInsensitive(valor: string, conocidos: string[]): boolean {
  const normalizado = valor.trim().toLowerCase();
  return conocidos.some((c) => c.trim().toLowerCase() === normalizado);
}

function extraerNumero(tituloBloque: string): number | null {
  const match = tituloBloque.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
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

  const personajes = (campos.personajes as string[]) ?? [];
  for (const nombre of personajes) {
    if (!coincideCaseInsensitive(nombre, biblioteca.personajes)) {
      advertencias.push(`${ubicacion}: Personaje "${nombre}" no coincide con ningún Personaje existente.`);
    }
  }
  const locacion = ((campos.locacion as string) ?? "").trim();
  if (locacion && !coincideCaseInsensitive(locacion, biblioteca.locaciones)) {
    advertencias.push(`${ubicacion}: Locación "${locacion}" no coincide con ninguna Locación existente.`);
  }
  const plano = ((campos.plano as string) ?? "").trim();
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

export function parsearBlueprint(textoCrudo: string, biblioteca: BibliotecaConocida): ResultadoParseoCBD {
  const errores: string[] = [];
  const lineas = textoCrudo.split(/\r?\n/);

  const indicePrimeraLinea = lineas.findIndex((l) => l.trim() !== "");
  const primeraLinea = indicePrimeraLinea === -1 ? "" : lineas[indicePrimeraLinea].trim();
  const matchVersion = primeraLinea.match(/^# Creative Blueprint v(\d+)(?:\.\d+)?$/);

  if (!matchVersion) {
    errores.push('Falta el encabezado de versión — la primera línea debe ser "# Creative Blueprint v1".');
    return { version: null, errores, ...RESULTADO_VACIO };
  }

  const version = Number.parseInt(matchVersion[1], 10);
  if (version !== 1) {
    errores.push(`Este Blueprint es v${version} — esta versión de la plataforma solo interpreta v1.`);
    return { version, errores, ...RESULTADO_VACIO };
  }

  const resto = lineas.slice(indicePrimeraLinea + 1);
  const indicePrimeraSeccion = resto.findIndex((l) => l.startsWith("## "));
  const lineasEncabezado = indicePrimeraSeccion === -1 ? resto : resto.slice(0, indicePrimeraSeccion);
  const lineasSecciones = indicePrimeraSeccion === -1 ? [] : resto.slice(indicePrimeraSeccion);

  const camposEncabezado = parsearBloque(lineasEncabezado, CAMPOS_ENCABEZADO);
  const encabezado: EncabezadoCBD = {
    version,
    autor: (camposEncabezado.autor as string) ?? "",
    fecha: (camposEncabezado.fecha as string) ?? "",
    conversacion: (camposEncabezado.conversacion as string) ?? "",
  };

  const secciones = dividirPorEncabezado(lineasSecciones, "## ");
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
      const bloquesEscena = dividirPorEncabezado(seccion.lineas, "### ");
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
