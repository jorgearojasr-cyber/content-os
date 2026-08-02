import { normalizarTexto } from "./similitud";

/**
 * Decision Engine (PRODUCT-ARCHITECTURE, 2026-08-02) — capa determinística,
 * sin IA, que propone valores para campos que Content OS ya tiene señal
 * suficiente para inferir. Mismo espíritu que `recomendaciones-
 * audiovisuales.ts` (tablas planas, nunca un motor de reglas ni IA) —
 * este archivo cubre los campos nuevos que ese Nivel 1 no cubría.
 *
 * Principio no negociable heredado: "automático" nunca significa
 * "silencioso". Estas funciones solo devuelven la sugerencia — quién la
 * muestra decide, en la UI, si la fricción es Automático (se pre-llena,
 * con nota visible, siempre editable) o Sugerido (se ofrece, el usuario
 * confirma con una acción explícita). Ninguna de las dos oculta nunca la
 * decisión ni pisa un valor que ya exista.
 */

const MOVIMIENTO_POR_PLANO: Record<string, string> = {
  "primer plano": "Cámara fija — no distraigas de la expresión.",
  "primerisimo primer plano": "Cámara fija, sin movimiento — la intimidad se rompe con cualquier temblor.",
  "plano detalle": "Cámara fija o zoom lento — deja que el objeto hable solo.",
  "plano general": "Paneo lento o fijo — dale tiempo al espectador para leer el espacio.",
  "plano entero": "Sigue el movimiento con un leve paneo si hay desplazamiento.",
  "plano americano": "Cámara fija — es un plano de diálogo, no de acción.",
  "plano medio": "Cámara fija — el plano más versátil no necesita movimiento para funcionar.",
  "plano conjunto": "Fijo, salvo que la interacción se mueva — priorizá que el grupo entre bien en cuadro.",
  contrapicado: "Fijo — el ángulo ya hace el trabajo, no le sumes movimiento.",
  picado: "Fijo — mismo motivo que contrapicado.",
  "plano cenital": "Fijo, cámara estática desde arriba.",
  "plano subjetivo": "Sigue el movimiento natural de la mirada del personaje.",
  "plano lateral": "Paneo que acompaña el desplazamiento.",
  "plano caminando": "Handheld o steadycam — el movimiento es el punto de este plano.",
  "plano secuencia": "Movimiento continuo y planificado — no hay corte que lo resuelva después.",
  "plano por encima del hombro": "Fijo — es un plano de escucha, no de acción.",
};

/**
 * Nivel Automático — la correlación plano→movimiento es una convención de
 * dirección de fotografía, no una coincidencia débil, así que se
 * pre-llena sin pedir confirmación explícita (sigue siendo editable).
 * `null` si el Plano no está en la tabla — nunca se inventa un genérico,
 * mismo criterio que `recomendacionBaseParaPlano`.
 */
export function movimientoSugeridoParaPlano(nombrePlano: string): string | null {
  return MOVIMIENTO_POR_PLANO[normalizarTexto(nombrePlano)] ?? null;
}

const EMOCION_POR_TIPO: Partial<Record<string, string>> = {
  GANCHO: "Curiosidad",
  PROBLEMA: "Tensión",
  DESCUBRIMIENTO: "Sorpresa",
  SOLUCION: "Confianza",
  CTA: "Urgencia",
};

/**
 * Nivel Sugerido — el tipo de escena es una señal real pero más débil que
 * el Plano (el tono emocional depende del contenido específico de la
 * escena, no solo de su función narrativa), así que nunca se pre-llena
 * sola: se ofrece y el usuario la confirma. B-roll/Transición/Otra no
 * tienen entrada — el patrón no aplica bien a esos tipos, y no inventar
 * nada es preferible a una sugerencia débil.
 *
 * Recibe `tipoEscena` como string plano (no el union `TipoEscenaStoryboard`
 * de types.ts) a propósito, mismo criterio que `movimientoSugeridoParaPlano`
 * — evita que este archivo determinístico dependa del tipo exacto que use
 * cada pantalla para representar el tipo de escena.
 *
 * El llamador es responsable de no invocar esto si el campo ya tiene un
 * valor (del CBD o editado a mano) — esta función no lo sabe ni debe
 * saberlo, solo propone.
 */
export function emocionSugeridaParaTipo(tipoEscena: string): string | null {
  return EMOCION_POR_TIPO[tipoEscena] ?? null;
}
