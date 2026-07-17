"use client";

import { useState, type ReactNode } from "react";

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
  children,
}: {
  titulo: string;
  subtitulo?: string;
  tieneContenido: boolean;
  /** Texto de una línea mostrado en vez del subtítulo mientras está plegada
   * (ej. el primer campo con contenido, o "N entradas"). */
  resumen?: string;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(!tieneContenido);

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-normal tracking-wide sm:text-xl">{titulo}</h2>
            {tieneContenido ? (
              <span className="text-accent" aria-hidden>
                ✓
              </span>
            ) : null}
          </div>
          {!abierto && resumen ? (
            <p className="mt-0.5 truncate text-[13px] text-text-muted">{resumen}</p>
          ) : subtitulo ? (
            <p className="mt-1 text-sm text-text-muted">{subtitulo}</p>
          ) : null}
        </div>
        <span
          className={`mt-1 shrink-0 text-[12px] text-text-muted transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: abierto ? "10000px" : "0px" }}
      >
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
