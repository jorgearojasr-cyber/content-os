"use client";

import { detectarMotoresSugeridos } from "@/lib/motor-ia";
import type { MotorIA } from "@/lib/types";

/**
 * Sugiere un Motor IA (estrategia narrativa) por palabras clave contra la
 * idea escrita — texto plano, sin IA. El Formato sigue determinando la
 * estructura de salida; esto solo aporta el ángulo narrativo. Selección
 * siempre manual/override: la sugerencia nunca se aplica sola.
 */
export function SelectorMotor({
  idea,
  motores,
  motorId,
  onChange,
}: {
  idea: string;
  motores: MotorIA[];
  motorId: string;
  onChange: (motorId: string) => void;
}) {
  const activos = motores.filter((m) => m.estado === "activo");
  const sugeridos = detectarMotoresSugeridos(idea, activos);
  const mejor = sugeridos[0];
  const motorElegido = activos.find((m) => m.id === motorId);

  return (
    <div className="mt-3.5">
      <label className="mb-1 block text-[12.5px] text-text-muted">
        Estrategia narrativa (Motor IA) — opcional
      </label>
      <p className="mb-1.5 text-[12px] leading-snug text-text-muted/80">
        Cómo contar la idea (educativo, comparativo, storytelling…) — el Formato ya elegido sigue
        definiendo la estructura de salida, esto solo aporta el ángulo.
      </p>

      {mejor && mejor.motor.id !== motorId ? (
        <button
          type="button"
          onClick={() => onChange(mejor.motor.id)}
          className="mb-1.5 flex w-full items-center justify-between rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-2.5 text-left text-[12.5px] text-text transition-colors hover:border-accent/50"
        >
          <span>
            ✨ Sugerido: <strong>{mejor.motor.nombre}</strong>{" "}
            <span className="text-text-muted">({mejor.porcentaje}% de coincidencia)</span>
          </span>
          <span className="shrink-0 text-accent">Usar →</span>
        </button>
      ) : null}

      <select
        value={motorId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[13.5px] text-text"
      >
        <option value="">Ninguno / automático</option>
        {activos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
            {m.origen === "usuario" ? " (personalizado)" : ""}
          </option>
        ))}
      </select>

      {motorElegido ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-text-muted">{motorElegido.descripcion}</p>
      ) : null}
    </div>
  );
}
