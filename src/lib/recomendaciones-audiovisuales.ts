import { normalizarTexto } from "./similitud";

/**
 * Nivel 1 de UX-PREP-4B.1 — base de conocimiento audiovisual universal, sin
 * IA. Determinística, sin costo, vive acá como conocimiento reutilizable
 * (no embebida en cada escena) para que cualquier pantalla que muestre un
 * Plano pueda consultarla. A propósito NO es un Motor IA ni un sistema de
 * reglas: es una tabla plana de nombre de Plano → recomendación de una
 * frase, igual de simple que agregarla a mano.
 *
 * Las claves cubren tanto los términos clásicos de fotografía/video como
 * los nombres reales que ya existen en Biblioteca (ej. "Plano caminando",
 * "Plano cenital") — si un Plano del usuario no matchea ninguna entrada,
 * simplemente no hay recomendación base para él, y no se muestra nada
 * (nunca se inventa una genérica). */
const RECOMENDACIONES_PLANO: Record<string, string> = {
  "primer plano": "Ideal para transmitir cercanía y conectar con la expresión.",
  "primerisimo primer plano": "Genera máxima intimidad — reservalo para momentos de alto impacto emocional.",
  "plano detalle": "Destaca un objeto o una acción específica.",
  "plano general": "Sirve para mostrar el contexto completo de la escena.",
  "plano entero": "Muestra a la persona de cuerpo completo, útil para acción o movimiento.",
  "plano americano": "Corta a la altura de la cintura — equilibra cercanía con lenguaje corporal.",
  "plano medio": "Balance entre cercanía y contexto, el más versátil para diálogo.",
  "plano conjunto": "Muestra a varias personas interactuando en el mismo encuadre.",
  contrapicado: "Genera sensación de autoridad o poder.",
  picado: "Genera sensación de vulnerabilidad o pequeñez.",
  "plano cenital": "Vista desde arriba — ideal para mostrar disposición espacial o procesos.",
  "plano subjetivo": "Pone al espectador en el punto de vista del personaje.",
  "plano lateral": "Muestra perfil y movimiento — útil para transiciones o acción de paso.",
  "plano caminando": "Acompaña el movimiento y genera dinamismo.",
  "plano secuencia": "Sin cortes — genera inmersión y sensación de tiempo real.",
  "plano por encima del hombro": "Ideal para diálogos, mantiene la conexión entre dos personajes.",
};

/** Devuelve la recomendación base para un nombre de Plano tal como existe
 * en la Biblioteca (case/tilde-insensitive, misma normalización que usa
 * la resolución de Revisión), o `null` si ese Plano no está en la base de
 * conocimiento — nunca un texto genérico de relleno. */
export function recomendacionBaseParaPlano(nombrePlano: string): string | null {
  return RECOMENDACIONES_PLANO[normalizarTexto(nombrePlano)] ?? null;
}
