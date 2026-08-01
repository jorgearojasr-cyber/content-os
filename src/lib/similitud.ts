/**
 * Similitud de texto — función pura, sin dependencias, usada por
 * `resolverCampo` (blueprint-import-shared.tsx) para sugerir candidatos de
 * Biblioteca cuando un nombre del Creative Blueprint no coincide exacto
 * (UX Migration 1.2). Nunca decide por su cuenta: solo ordena y filtra
 * candidatos — la confirmación siempre queda en manos del usuario.
 */

/** Distancia de Levenshtein clásica: mínimo de inserciones, eliminaciones
 * o sustituciones para transformar `a` en `b`. */
function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = Array.from({ length: filas }, () => new Array<number>(columnas).fill(0));

  for (let i = 0; i < filas; i++) matriz[i][0] = i;
  for (let j = 0; j < columnas; j++) matriz[0][j] = j;

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(matriz[i - 1][j] + 1, matriz[i][j - 1] + 1, matriz[i - 1][j - 1] + costo);
    }
  }

  return matriz[filas - 1][columnas - 1];
}

/** "Presentador" -> "presentador", "López" -> "lopez" — minúsculas y sin
 * tildes, para que la coincidencia exacta y la similitud no dependan de
 * mayúsculas ni acentos que un nombre narrativo de ChatGPT no tiene por
 * qué respetar. */
const PATRON_DIACRITICOS = new RegExp("[̀-ͯ]", "g");

export function normalizarTexto(texto: string): string {
  return texto.trim().toLowerCase().normalize("NFD").replace(PATRON_DIACRITICOS, "");
}

/** Similitud entre 0 (nada en común) y 1 (idénticos tras normalizar),
 * usando la distancia de Levenshtein normalizada por el largo del string
 * más largo — la forma estándar de expresar esa distancia como un
 * porcentaje legible. */
export function similitudTexto(a: string, b: string): number {
  const x = normalizarTexto(a);
  const y = normalizarTexto(b);
  if (x === y) return 1;
  const largoMax = Math.max(x.length, y.length);
  if (largoMax === 0) return 1;
  return 1 - distanciaLevenshtein(x, y) / largoMax;
}

/** >= 85%: sugerencia fuerte, se distingue visualmente pero igual requiere
 * un clic explícito — nunca se autoselecciona (filosofía QA-1). */
export const UMBRAL_SUGERENCIA_FUERTE = 0.85;

/** < 60%: no se sugiere — evita asociaciones de baja calidad ("Presentador"
 * pareciéndose un poco a cualquier nombre corto de la Biblioteca). */
export const UMBRAL_SUGERENCIA_MINIMA = 0.6;
