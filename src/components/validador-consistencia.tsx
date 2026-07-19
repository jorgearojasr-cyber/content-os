import { evaluarConsistenciaPersonaje } from "@/lib/validador-personaje";
import type { Bloque, Personaje } from "@/lib/types";

/**
 * VALIDADOR DE CONSISTENCIA — 3 chequeos estructurales deterministas (sin
 * IA de visión) sobre un Personaje usado en una pieza concreta. Ver
 * `evaluarConsistenciaPersonaje` para el alcance exacto y su límite
 * intencional.
 */
export function ValidadorConsistencia({ bloque, personaje }: { bloque: Bloque; personaje: Personaje }) {
  const r = evaluarConsistenciaPersonaje(bloque, personaje);

  return (
    <div className="flex flex-wrap gap-1.5">
      {[r.usoPersonaje, r.exportoConPersonaje, r.incluyeFotos].map((chequeo, i) => (
        <span
          key={i}
          className={`rounded-full border px-2.5 py-1 text-[11.5px] ${
            chequeo.ok
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-border bg-surface-2 text-text-muted"
          }`}
        >
          {chequeo.ok ? "✓" : "⚠"} {chequeo.etiqueta}
        </span>
      ))}
    </div>
  );
}
