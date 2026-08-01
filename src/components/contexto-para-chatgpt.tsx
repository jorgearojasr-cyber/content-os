"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { IDENTIDAD_SIN_CONTENIDO } from "@/lib/identity-compiler";

const FORMATO_CBD = `# Creative Blueprint v1
Autor: [tu nombre]
Fecha: [fecha de hoy]
Conversación: [opcional]

## Contexto
[opcional — cualquier información adicional relevante solo para este video]

## Producción
Título: ...
Proyecto: ...
Canal: ...
Formato: ...
Idea central: ...
Objetivo general: ...
Objetivo del espectador:
- ...
Público objetivo: ...
Duración estimada: [segundos, solo el número]
Notas: ...

## Recursos globales
Música principal: ...
Intro: ...
Outro: ...

## Escenas

### Escena 1
Tipo: [Gancho | Problema | Descubrimiento | Solución | CTA | B-roll | Transición | Otra]
Objetivo narrativo: ...
Duración estimada: [segundos, solo el número]
Emoción: ...
Resultado esperado: ...
Personajes:
- ...
Locación: ...
Plano: ...
Movimiento de cámara: ...
Texto hablado: ...
Texto en pantalla: ...
Recursos necesarios: ...
Prompt IA (imagen): ...
Prompt IA (video): ...
Música: ...
Transición: ...
Notas: ...

### Escena 2
[repetir la misma estructura por cada escena que necesite el video]`;

/** El prompt completo que el usuario copia y pega en ChatGPT — arranca con
 * su propia idea tal cual la escribió (para que sienta que la plataforma
 * lo escuchó), sigue con el contexto de marca ya compilado por
 * `compileIdentity()` (sin tocar esa función) y cierra con el formato
 * exacto que `parsearBlueprint()` sabe leer, para que lo que vuelva de
 * ChatGPT importe sin fricción (UX Migration 1.1). */
function construirPrompt(idea: string, contexto: string): string {
  const hayContexto = contexto.trim().length > 0 && contexto !== IDENTIDAD_SIN_CONTENIDO;
  const bloqueMarca = hayContexto
    ? contexto
    : "Todavía no tenemos información cargada sobre esta marca — generá el Blueprint apoyándote solamente en la idea de arriba, con un tono neutro y profesional.";

  return `Tu idea:
"${idea}"

Usando esta idea y el siguiente contexto de marca, generá un Creative Blueprint Document completo para un video corto.

${bloqueMarca}

---

Formato esperado — seguí esta estructura exactamente, sin cambiar las etiquetas ni el orden, completando cada campo (agregá tantas escenas como necesite el video):

${FORMATO_CBD}`;
}

/**
 * Paso 2 de 3 del flujo "Hoy" (UX Migration 1.1) — guía al usuario a
 * copiar un prompt completo (idea + contexto de marca + formato del CBD),
 * desarrollarlo en ChatGPT, y volver a pegar el resultado en la pantalla
 * inicial. Nunca invita a abandonar el flujo hacia otra sección, incluso
 * cuando la Marca todavía no tiene Identidad cargada.
 */
export function ContextoParaChatGPT({
  idea,
  contexto,
  onVolver,
}: {
  idea: string;
  contexto: string;
  onVolver: () => void;
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

      <Button type="button" onClick={copiar}>
        {copiado ? "Copiado ✓" : "Copiar prompt"}
      </Button>

      <p className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-3.5 font-mono text-[11.5px] text-text-muted">
        {prompt}
      </p>

      <div className="rounded-xl border border-border bg-surface p-3.5">
        <p className="text-[12.5px] font-medium text-text">Cuando ChatGPT responda</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[12.5px] text-text-muted">
          <li>Copiá la respuesta completa.</li>
          <li>Volvé a Content OS.</li>
          <li>Pegala en la pantalla inicial.</li>
        </ol>
      </div>

      <Button type="button" variant="secondary" onClick={onVolver}>
        Volver
      </Button>
    </div>
  );
}
