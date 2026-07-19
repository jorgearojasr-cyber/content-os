/**
 * MOTOR DE MADUREZ — función pura y genérica de scoring ponderado,
 * reutilizada por Identidad (Fase A) y Personaje (Fase B). El nombre
 * `calcularMadurezIdentidad` se conserva a propósito (así lo pidió la
 * ronda que la creó) aunque el motor ya no es específico de Identidad —
 * cualquier entidad con campos clasificados en 3 niveles de importancia
 * puede usarlo pasando su propia lista de {valor, nivel}.
 */

export type NivelCampo = "esencial" | "recomendado" | "opcional";

/** Esencial pesa más que Recomendado, que pesa más que Opcional — así el
 * % no cuenta todos los campos por igual. */
export const PESO_POR_NIVEL: Record<NivelCampo, number> = {
  esencial: 3,
  recomendado: 2,
  opcional: 1,
};

export const EMOJI_NIVEL: Record<NivelCampo, string> = {
  esencial: "🟢",
  recomendado: "🟡",
  opcional: "🔵",
};

export type CampoParaMadurez = { valor: string; nivel: NivelCampo };

export type EtapaMadurez = "semilla" | "fundamentos" | "consistente" | "experta";

export const ETAPAS_MADUREZ: Record<EtapaMadurez, { emoji: string; etiqueta: string }> = {
  semilla: { emoji: "🌱", etiqueta: "Semilla" },
  fundamentos: { emoji: "🧩", etiqueta: "Fundamentos" },
  consistente: { emoji: "🚀", etiqueta: "Consistente" },
  experta: { emoji: "🏆", etiqueta: "Experta" },
};

export type ResultadoMadurez = {
  /** 0-100, redondeado. */
  porcentaje: number;
  etapa: EtapaMadurez;
  /** Mensaje dinámico según el % — para mostrar debajo de la barra. */
  mensaje: string;
  pesoCompletado: number;
  pesoTotal: number;
};

function etapaParaPorcentaje(porcentaje: number): EtapaMadurez {
  if (porcentaje < 20) return "semilla";
  if (porcentaje < 50) return "fundamentos";
  if (porcentaje < 80) return "consistente";
  return "experta";
}

function mensajeParaPorcentaje(etapa: EtapaMadurez, porcentaje: number): string {
  if (etapa === "experta" && porcentaje < 100) {
    return "Falta poco para completar el entrenamiento — unos pocos campos más y estará al 100%.";
  }
  switch (etapa) {
    case "semilla":
      return "Recién estás empezando — completa los bloques esenciales primero para que la IA entienda lo básico.";
    case "fundamentos":
      return "Ya tienes las bases. Sigue sumando detalle para que la voz sea más consistente.";
    case "consistente":
      return "Tu marca ya tiene una identidad sólida y consistente.";
    case "experta":
      return "Entrenamiento completo — la IA tiene todo lo que necesita para sonar exactamente como tu marca.";
  }
}

/** Scoring puro y determinista: % ponderado, etapa de madurez y mensaje —
 * sin IA, sin efectos secundarios. `pesos` es opcional para poder ajustar
 * la importancia relativa de cada nivel en otro contexto (ej. Personaje). */
export function calcularMadurezIdentidad(
  campos: readonly CampoParaMadurez[],
  pesos: Record<NivelCampo, number> = PESO_POR_NIVEL,
): ResultadoMadurez {
  const pesoTotal = campos.reduce((acc, c) => acc + pesos[c.nivel], 0);
  const pesoCompletado = campos
    .filter((c) => c.valor.trim().length > 0)
    .reduce((acc, c) => acc + pesos[c.nivel], 0);
  const porcentaje = pesoTotal === 0 ? 0 : Math.round((pesoCompletado / pesoTotal) * 100);
  const etapa = etapaParaPorcentaje(porcentaje);
  return { porcentaje, etapa, mensaje: mensajeParaPorcentaje(etapa, porcentaje), pesoCompletado, pesoTotal };
}

export type EstadoBloque = "completo" | "parcial" | "pendiente";

export const ESTADO_BLOQUE_INFO: Record<EstadoBloque, { icono: string; etiqueta: string }> = {
  completo: { icono: "✓", etiqueta: "Completo" },
  parcial: { icono: "⚠", etiqueta: "Parcial" },
  pendiente: { icono: "○", etiqueta: "Pendiente" },
};

/** Estado de un bloque/sección — no ponderado (a diferencia del % global):
 * todo lleno = Completo, nada lleno = Pendiente, lo demás = Parcial. */
export function estadoBloque(campos: readonly CampoParaMadurez[]): EstadoBloque {
  if (campos.length === 0) return "pendiente";
  const completados = campos.filter((c) => c.valor.trim().length > 0).length;
  if (completados === 0) return "pendiente";
  if (completados === campos.length) return "completo";
  return "parcial";
}
