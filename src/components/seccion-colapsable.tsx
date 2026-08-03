"use client";

import { useState, type ReactNode } from "react";
import { ESTADO_BLOQUE_INFO, type EstadoBloque } from "@/lib/madurez";

/**
 * Panel plegable para las secciones de Identidad. Estado inicial
 * inteligente: si `tieneContenido` es true arranca plegada (con un ✓ y un
 * resumen de una línea); si es false arranca expandida, porque lo que falta
 * por llenar debe quedar a la vista, no escondido. Puramente presentación —
 * los campos de adentro siguen siendo los mismos inputs del mismo <form>,
 * nada cambia en cómo se guardan.
 */
export function SeccionColapsable({
  titulo,
  subtitulo,
  tieneContenido,
  resumen,
  progreso,
  estado,
  abierto,
  onAbiertoChange,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  tieneContenido: boolean;
  /** Texto de una línea mostrado en vez del subtítulo mientras está plegada
   * (ej. el primer campo con contenido, o "N entradas"). */
  resumen?: string;
  /** Indicador sutil de completitud, ej. "3/6 completados" — puramente
   * informativo, nunca bloquea nada. */
  progreso?: string;
  /** ✓ Completo / ⚠ Parcial / ○ Pendiente — reemplaza el simple ✓ de
   * `tieneContenido` cuando la sección tiene un cálculo real de estado
   * (ej. las secciones de entrenamiento de Identidad/Personaje). Si no se
   * pasa, se usa el comportamiento anterior (✓ si `tieneContenido`). */
  estado?: EstadoBloque;
  /** Par controlado/no-controlado (PHASE-2-IMPLEMENTACION-3B), mismo
   * criterio que un `<input>`: si se pasa `abierto`, el padre decide
   * abierto/cerrado (y debe manejar `onAbiertoChange`) — pensado para
   * deep-links externos que necesitan revelar un campo de acá adentro (ej.
   * Copiloto). Si no se pasa, la sección sigue siendo no-controlada, con
   * el mismo comportamiento interno de siempre. */
  abierto?: boolean;
  onAbiertoChange?: (abierto: boolean) => void;
  children: ReactNode;
}) {
  const [abiertoInterno, setAbiertoInterno] = useState(!tieneContenido);
  const esControlada = abierto !== undefined;
  const abiertoActual = esControlada ? abierto : abiertoInterno;

  function alternar() {
    const siguiente = !abiertoActual;
    if (esControlada) onAbiertoChange?.(siguiente);
    else setAbiertoInterno(siguiente);
  }

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abiertoActual}
        className="-m-1.5 flex w-[calc(100%+0.75rem)] cursor-pointer items-start justify-between gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-surface-2"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-normal tracking-wide sm:text-xl">{titulo}</h2>
            {estado ? (
              <span
                className={
                  estado === "completo"
                    ? "text-[11.5px] text-accent"
                    : "text-[11.5px] text-text-muted"
                }
                title={ESTADO_BLOQUE_INFO[estado].etiqueta}
              >
                {ESTADO_BLOQUE_INFO[estado].icono} {ESTADO_BLOQUE_INFO[estado].etiqueta}
              </span>
            ) : tieneContenido ? (
              <span className="text-accent" aria-hidden>
                ✓
              </span>
            ) : null}
            {progreso ? (
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-text-muted">
                {progreso}
              </span>
            ) : null}
          </div>
          {!abiertoActual && resumen ? (
            <p className="mt-0.5 truncate text-[13px] text-text-muted">{resumen}</p>
          ) : subtitulo ? (
            <p className="mt-1 text-sm text-text-muted">{subtitulo}</p>
          ) : null}
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`mt-1 h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 ${abiertoActual ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: abiertoActual ? "10000px" : "0px" }}
      >
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
