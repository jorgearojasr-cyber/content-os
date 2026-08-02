import type { TipoEscenaStoryboard } from "./types";

/** Cuántas palabras por minuto asume la estimación — ritmo de habla
 * conversacional promedio, ni apurado ni pausado. */
const PALABRAS_POR_MINUTO = 150;

/** Segundos que suma cada pausa natural (., !, ?) después de la primera —
 * la primera no cuenta porque ya está implícita en el ritmo base de
 * palabras/minuto; a partir de la segunda, cada corte de oración agrega
 * un respiro real que el cálculo lineal no captura. */
const SEGUNDOS_POR_PAUSA_ADICIONAL = 0.3;

const BONUS_GANCHO_SEGUNDOS = 1;
const BONUS_CTA_SEGUNDOS = 2;
const MINIMO_BROLL_SIN_TEXTO_SEGUNDOS = 3;
const PISO_ABSOLUTO_SEGUNDOS = 2;

/**
 * Estimación determinística de cuánto puede durar una escena, a partir de
 * su Texto hablado y su Tipo — nunca usa IA (UX Fix 2, post
 * UX-MIGRATION-4). Sirve como valor por defecto editable cuando el CBD no
 * trae una Duración estimada explícita: `confirmarImportacionBlueprint`
 * (actions.ts) solo la usa para reemplazar el `0` con el que arrancaba
 * antes — una duración explícita del CBD nunca se toca.
 *
 * Regla base: palabras ÷ 150 palabras/minuto × 60, más ajustes
 * determinísticos (pausas naturales, tipo de escena, piso mínimo para
 * B-roll sin diálogo, piso absoluto de 2s para cualquier escena). El
 * resultado se redondea al segundo entero, que es lo que guarda la
 * columna `duracionSegundos`. */
export function estimarDuracionSegundos(textoHablado: string, tipo: TipoEscenaStoryboard): number {
  const texto = textoHablado.trim();
  const palabras = texto.length === 0 ? 0 : texto.split(/\s+/).length;

  let segundos = (palabras / PALABRAS_POR_MINUTO) * 60;

  const pausas = (texto.match(/[.!?]/g) ?? []).length;
  if (pausas > 1) {
    segundos += (pausas - 1) * SEGUNDOS_POR_PAUSA_ADICIONAL;
  }

  if (tipo === "GANCHO") segundos += BONUS_GANCHO_SEGUNDOS;
  if (tipo === "CTA") segundos += BONUS_CTA_SEGUNDOS;

  if (tipo === "BROLL" && texto.length === 0) {
    segundos = Math.max(segundos, MINIMO_BROLL_SIN_TEXTO_SEGUNDOS);
  }

  segundos = Math.max(segundos, PISO_ABSOLUTO_SEGUNDOS);

  return Math.round(segundos);
}
