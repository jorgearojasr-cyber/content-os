/**
 * REUTILIZACIÓN INTELIGENTE
 * ------------------------------------------------------------------
 * Coincidencia simple por palabras clave — nada de embeddings ni búsqueda
 * semántica en esta ronda (mejora futura, no construida ahora). La lógica
 * de extracción/ranking vive acá como funciones puras (testeables sin
 * tocar la base de datos); `buscarContenidoRelacionado` en actions.ts hace
 * las consultas y usa estas funciones para puntuar y recortar resultados.
 * ------------------------------------------------------------------
 */

const PALABRAS_IGNORADAS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en",
  "con", "por", "para", "que", "como", "cómo", "y", "o", "a", "al", "su",
  "sus", "es", "son", "sobre", "mi", "tu", "lo", "se", "mas", "más", "muy",
  "este", "esta", "estos", "estas", "sin", "todo", "toda",
]);

const LONGITUD_MINIMA_PALABRA = 4;

const DIACRITICOS_COMBINADOS = new RegExp("[\\u0300-\\u036f]", "g");

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(DIACRITICOS_COMBINADOS, "");
}

/** Extrae las palabras clave reales de un tema/idea: minúsculas, sin
 * tildes, sin palabras vacías, sin duplicados, de al menos 4 letras. Un
 * tema sin ninguna palabra clave real (ej. "eso", "algo así") no produce
 * ninguna búsqueda — evita coincidencias falsas basadas en nada. */
export function extraerPalabrasClave(tema: string): string[] {
  const normalizado = sinTildes(tema.toLowerCase());
  const palabras = normalizado.split(/[^a-z0-9]+/).filter(Boolean);
  return Array.from(
    new Set(palabras.filter((p) => p.length >= LONGITUD_MINIMA_PALABRA && !PALABRAS_IGNORADAS.has(p))),
  );
}

/** Cuenta cuántas palabras clave distintas aparecen dentro de `texto`
 * (case/tilde-insensitive). 0 = sin coincidencia. */
export function contarCoincidencias(texto: string, palabrasClave: string[]): number {
  const normalizado = sinTildes(texto.toLowerCase());
  return palabrasClave.filter((palabra) => normalizado.includes(palabra)).length;
}

/** Recorta un texto largo a un fragmento legible para mostrar en el panel. */
export function extraerFragmento(texto: string, longitud = 140): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > longitud ? `${limpio.slice(0, longitud)}…` : limpio;
}

export type ResultadoRelacionado = {
  id: string;
  titulo: string;
  fragmento: string;
};

/** Puntúa cada item contra las palabras clave, descarta los que no
 * coinciden con nada, ordena por más coincidencias primero, y recorta al
 * límite pedido (3-5 resultados por fuente). */
export function rankearResultados<T>(
  items: T[],
  obtenerTexto: (item: T) => string,
  aResultado: (item: T) => ResultadoRelacionado,
  palabrasClave: string[],
  limite: number,
): ResultadoRelacionado[] {
  return items
    .map((item) => ({ item, score: contarCoincidencias(obtenerTexto(item), palabrasClave) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ item }) => aResultado(item));
}
