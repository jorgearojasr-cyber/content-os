import { ETAPAS_MADUREZ, type ResultadoMadurez } from "@/lib/madurez";

/**
 * Barra de progreso ponderada + etapa de madurez ("🌱 Semilla" →
 * "🏆 Experta") + mensaje dinámico. Puramente presentacional — el % ya
 * viene calculado por `calcularMadurezIdentidad`; este componente solo lo
 * dibuja. Genérico a propósito: Identidad (Fase A) y Personaje (Fase B)
 * comparten el mismo componente con un `titulo` distinto.
 */
export function MadurezBar({ resultado, titulo }: { resultado: ResultadoMadurez; titulo: string }) {
  const { porcentaje, etapa, mensaje } = resultado;
  const { emoji, etiqueta } = ETAPAS_MADUREZ[etapa];

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            {emoji}
          </span>
          <div>
            <p className="font-display text-base tracking-wide sm:text-lg">
              {titulo}: {etiqueta}
            </p>
            <p className="text-[12.5px] text-text-muted">{mensaje}</p>
          </div>
        </div>
        <span className="font-mono text-sm text-text-muted">{porcentaje}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
