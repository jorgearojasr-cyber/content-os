"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { PasoAnimado } from "@/lib/asistente-crear";

/**
 * Teatro de UI puro sobre lógica determinista ya resuelta ANTES de que
 * este componente se monte (ver `personajeSugeridoPorIdea`/
 * `detectarMotoresSugeridos`/`formatearConocimientoRelevante`/
 * `defaultsPorFormato` en crear-modos.tsx) — no dispara ningún fetch ni
 * llamada a IA, solo revela checkmarks con un pequeño delay entre cada
 * uno para que la "preparación" se sienta natural en vez de instantánea.
 */
export function AnimacionAnalisis({
  pasos,
  onCompletar,
  duracionPorPasoMs = 320,
}: {
  pasos: PasoAnimado[];
  onCompletar: () => void;
  duracionPorPasoMs?: number;
}) {
  const [visibles, setVisibles] = useState(0);

  useEffect(() => {
    if (visibles >= pasos.length) {
      const t = setTimeout(onCompletar, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibles((v) => v + 1), duracionPorPasoMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles, pasos.length, duracionPorPasoMs]);

  return (
    <Card>
      <div className="flex flex-col items-center gap-5 py-8">
        <p className="font-display text-[16px]">Preparando tu contexto…</p>
        <div className="w-full max-w-sm space-y-2">
          {pasos.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] transition-all duration-300 ${
                i < visibles
                  ? "border-accent/30 bg-accent-soft text-text opacity-100"
                  : "border-border bg-surface-2 text-text-muted opacity-50"
              }`}
            >
              <span className="text-[14px] leading-none">{i < visibles ? "✅" : "⏳"}</span>
              {p.etiqueta}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
