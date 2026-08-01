"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { IDENTIDAD_SIN_CONTENIDO } from "@/lib/identity-compiler";
import { construirPrompt } from "@/lib/blueprint-prompt";

/**
 * Paso 2 de 3 del flujo "Hoy" (UX Migration 1.1/1.2) — guía al usuario a
 * copiar un prompt reducido (idea + contexto de marca + formato narrativo
 * del CBD), desarrollarlo en ChatGPT, y volver a esta misma pantalla —
 * `onContinuar` avisa al padre (`HoyScreen`) para pasar a Paso 3 sin
 * navegar ni perder el estado. Nunca invita a abandonar el flujo hacia
 * otra sección, incluso cuando la Marca todavía no tiene Identidad
 * cargada.
 */
export function ContextoParaChatGPT({
  idea,
  contexto,
  onVolver,
  onContinuar,
}: {
  idea: string;
  contexto: string;
  onVolver: () => void;
  onContinuar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const hayContexto = contexto.trim().length > 0 && contexto !== IDENTIDAD_SIN_CONTENIDO;
  const prompt = construirPrompt(idea, contexto);

  async function copiar() {
    await navigator.clipboard.writeText(prompt);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">Paso 2 de 3</p>
        <p className="mt-1 font-display text-lg font-normal tracking-wide text-text">Vamos a desarrollar tu idea</p>
        <p className="mt-2 text-[13px] text-text-muted">
          Preparé un prompt usando la información disponible de tu marca. Copialo, pegalo en ChatGPT, generá el
          guion y volvé acá para pegar el resultado.
        </p>
      </div>

      {!hayContexto ? (
        <p className="rounded-lg border border-accent/30 bg-accent-soft px-3.5 py-3 text-[12.5px] text-text">
          Aún no conocemos suficiente sobre tu marca. Por ahora vamos a construir el prompt usando solamente tu
          idea — más adelante vas a poder completar tu Identidad para obtener resultados todavía mejores.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copiar}>
          {copiado ? "Copiado ✓" : "Copiar prompt"}
        </Button>
        <Button type="button" variant="secondary" onClick={onContinuar}>
          Ya generé mi guion
        </Button>
      </div>

      <p className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-3.5 font-mono text-[11.5px] text-text-muted">
        {prompt}
      </p>

      <div className="rounded-xl border border-border bg-surface p-3.5">
        <p className="text-[12.5px] font-medium text-text">Cuando ChatGPT responda</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[12.5px] text-text-muted">
          <li>Copiá la respuesta completa.</li>
          <li>Volvé a esta pestaña.</li>
          <li>Hacé click en “Ya generé mi guion” y pegala ahí.</li>
        </ol>
      </div>

      <Button type="button" variant="secondary" onClick={onVolver}>
        Volver
      </Button>
    </div>
  );
}
