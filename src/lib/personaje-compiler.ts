import { resolverVozPersonaje } from "./types";
import type { FotoPersonaje, Identidad, Personaje } from "./types";

/**
 * COMPILADOR DE PERSONAJE — genera automáticamente, a partir de todos los
 * campos de la ficha, 8 prompts listos para copiar y pegar en distintas
 * herramientas de IA externa. Determinista y puro: sin `fetch`, sin IA, sin
 * acceso a base de datos — mismo principio que `compileIdentity`.
 *
 * Los ELEMENTOS INVARIABLES van siempre PRIMERO en cada prompt (máxima
 * prioridad: es lo que nunca debe cambiar entre piezas).
 *
 * `promptMaestro`/`promptImagen`/`promptVideo`/`promptVoz` en la ficha de
 * Personaje son un override MANUAL preexistente (Fase 2 del Creative OS,
 * con su propia UI) — si el usuario los llenó a mano, ese texto exacto se
 * usa tal cual (se respeta su intención explícita); si los dejó vacíos, se
 * genera automáticamente acá desde los campos granulares nuevos. Ningún
 * dato ni comportamiento anterior se pierde.
 */

const chips = (valor: string): string[] =>
  valor
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

/** Exportados para que otros compiladores deterministas (ver
 * `escena-prompt-compiler.ts`) arment sus propios bloques con el mismo
 * formato "Etiqueta: valor" en vez de reimplementar el mismo helper de una
 * línea en cada archivo. */
export const linea = (etiqueta: string, valor: string): string => (valor.trim() ? `${etiqueta}: ${valor.trim()}` : "");

export const unir = (...lineas: string[]): string => lineas.filter((l) => l.length > 0).join("\n");

function bloqueInvariables(personaje: Personaje): string {
  const items = chips(personaje.elementosInvariables);
  if (items.length === 0) return "";
  return `ELEMENTOS INVARIABLES (máxima prioridad, nunca cambian): ${items.join(" · ")}.`;
}

function bloqueFotosReferencia(fotos: FotoPersonaje[] | undefined): string {
  if (!fotos || fotos.length === 0) return "";
  return `Usa las ${fotos.length} foto${fotos.length === 1 ? "" : "s"} de referencia real del personaje en vez de describir su apariencia desde cero.`;
}

function encabezado(personaje: Personaje): string {
  return `Personaje: ${personaje.nombre || "sin nombre"}.`;
}

export type PromptsPersonaje = {
  maestro: string;
  imagen: string;
  video: string;
  voz: string;
  miniaturas: string;
  carruseles: string;
  storytelling: string;
  narracion: string;
};

function generarMaestro(personaje: Personaje, identidad: Identidad | null): string {
  const voz = resolverVozPersonaje(personaje, identidad, "formalidad");
  return unir(
    encabezado(personaje),
    bloqueInvariables(personaje),
    linea("Rol en el ecosistema", personaje.rolEcosistema),
    linea("Personalidad", personaje.personalidad),
    linea("Temperamento", personaje.temperamento),
    linea("Valores", personaje.valores),
    linea("Qué nunca haría", personaje.queNuncaHaria),
    linea("Descripción física", personaje.fisica),
    linea("Vestuario", personaje.vestuario),
    linea("Voz", personaje.vozDescrita),
    linea("Formalidad", voz.valor),
    linea("Historia", personaje.historia),
    linea("Contexto habitual", personaje.contexto),
  );
}

function generarImagen(personaje: Personaje, fotos: FotoPersonaje[] | undefined): string {
  return unir(
    encabezado(personaje),
    bloqueInvariables(personaje),
    linea("Descripción física", personaje.fisica),
    linea("Altura", personaje.altura),
    linea("Complexión", personaje.complexion),
    linea("Edad aparente", personaje.edadAparente),
    linea("Color de piel", personaje.colorPiel),
    linea("Cabello", personaje.cabello),
    linea("Barba", personaje.barba),
    linea("Ojos", personaje.ojos),
    linea("Expresiones habituales", personaje.expresionesHabituales),
    linea("Postura", personaje.postura),
    linea("Vestuario", personaje.vestuario),
    linea("Accesorios", personaje.accesorios),
    bloqueFotosReferencia(fotos),
  );
}

function generarVideo(personaje: Personaje, fotos: FotoPersonaje[] | undefined): string {
  return unir(
    encabezado(personaje),
    bloqueInvariables(personaje),
    linea("Nivel de energía", personaje.nivelEnergia),
    linea("Gestos (general)", personaje.gestos),
    linea("Cómo mueve las manos", personaje.gestoManos),
    linea("Cómo mira", personaje.gestoMirada),
    linea("Cómo sonríe", personaje.gestoSonrisa),
    linea("Cómo señala", personaje.gestoSenalar),
    linea("Cómo camina", personaje.formaCaminar),
    linea("Cómo está de pie", personaje.formaPararse),
    linea("Cómo interactúa", personaje.formaInteractuar),
    bloqueFotosReferencia(fotos),
  );
}

function generarVoz(personaje: Personaje, identidad: Identidad | null): string {
  const formalidad = resolverVozPersonaje(personaje, identidad, "formalidad");
  const humor = resolverVozPersonaje(personaje, identidad, "humor");
  const nivelTecnico = resolverVozPersonaje(personaje, identidad, "nivelTecnico");
  return unir(
    encabezado(personaje),
    linea("Voz (descripción)", personaje.vozDescrita),
    linea("Acento", personaje.acento),
    linea("Velocidad", personaje.velocidad),
    linea("Tono", personaje.tono),
    linea("Volumen", personaje.volumen),
    linea("Formalidad", formalidad.valor),
    linea("Humor", humor.valor),
    linea("Nivel técnico", nivelTecnico.valor),
    linea("Muletillas / frases frecuentes", personaje.muletillas),
    linea("Palabras favoritas", personaje.palabrasFavoritas),
    linea("Palabras prohibidas", personaje.palabrasProhibidas),
  );
}

function generarMiniaturas(personaje: Personaje): string {
  return unir(
    encabezado(personaje),
    bloqueInvariables(personaje),
    "Encuadre de miniatura: expresión clara y de alto contraste, rostro visible, fondo simple.",
    linea("Expresiones habituales", personaje.expresionesHabituales),
    linea("Vestuario", personaje.vestuario),
    linea("Contexto habitual", personaje.contexto),
  );
}

function generarCarruseles(personaje: Personaje): string {
  return unir(
    encabezado(personaje),
    bloqueInvariables(personaje),
    "Mantén la apariencia IDÉNTICA entre todas las láminas del carrusel — mismo rostro, mismo vestuario, misma paleta de piel/cabello.",
    linea("Descripción física", personaje.fisica),
    linea("Vestuario", personaje.vestuario),
    linea("Accesorios", personaje.accesorios),
    linea("Expresiones habituales", personaje.expresionesHabituales),
  );
}

function generarStorytelling(personaje: Personaje): string {
  return unir(
    encabezado(personaje),
    bloqueInvariables(personaje),
    linea("Historia", personaje.historia),
    linea("Valores", personaje.valores),
    linea("Qué nunca haría", personaje.queNuncaHaria),
    linea("Forma de enseñar/explicar", personaje.formaEnsenar),
    linea("Emociones que transmite", personaje.emocionesTransmite),
    linea("Fortalezas", personaje.fortalezas),
    linea("Defectos", personaje.defectos),
  );
}

function generarNarracion(personaje: Personaje, identidad: Identidad | null): string {
  const formalidad = resolverVozPersonaje(personaje, identidad, "formalidad");
  return unir(
    encabezado(personaje),
    "Narración en off (voz en off, no diálogo a cámara):",
    linea("Voz (descripción)", personaje.vozDescrita),
    linea("Tono", personaje.tono),
    linea("Acento", personaje.acento),
    linea("Velocidad", personaje.velocidad),
    linea("Volumen", personaje.volumen),
    linea("Formalidad", formalidad.valor),
    linea("Muletillas / frases frecuentes", personaje.muletillas),
  );
}

export function compilarPersonaje(
  personaje: Personaje,
  opciones: { identidad?: Identidad | null; fotos?: FotoPersonaje[] } = {},
): PromptsPersonaje {
  const { identidad = null, fotos } = opciones;
  return {
    maestro: personaje.promptMaestro.trim() || generarMaestro(personaje, identidad),
    imagen: personaje.promptImagen.trim() || generarImagen(personaje, fotos),
    video: personaje.promptVideo.trim() || generarVideo(personaje, fotos),
    voz: personaje.promptVoz.trim() || generarVoz(personaje, identidad),
    miniaturas: generarMiniaturas(personaje),
    carruseles: generarCarruseles(personaje),
    storytelling: generarStorytelling(personaje),
    narracion: generarNarracion(personaje, identidad),
  };
}
