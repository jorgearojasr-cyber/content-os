"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { IDENTIDAD_SIN_CONTENIDO } from "@/lib/identity-compiler";

/** Solo lo que ChatGPT no puede saber por su cuenta: la narrativa. Proyecto,
 * Autor, Fecha, Público objetivo y la Duración total ya los completa
 * Content OS (ver `confirmarImportacionBlueprint`), y Formato se elige con
 * un selector en la revisión — pedírselos de vuelta a ChatGPT era ruido
 * (UX Migration 1.2). Personajes/Locación/Plano se mantienen como campos
 * del CBD, pero ya no representan referencias exactas de la Biblioteca —
 * ver la instrucción en `construirPrompt`. */
const FORMATO_CBD = `# Creative Blueprint v1

## Producción
Título: ...
Objetivo general: ...

## Escenas

### Escena 1
Tipo: [Gancho | Problema | Descubrimiento | Solución | CTA | B-roll | Transición | Otra]
Objetivo narrativo: ...
Emoción: [opcional]
Personajes:
- ...
Locación: ...
Plano: ...
Texto hablado: ...
Texto en pantalla: ...

### Escena 2
[repetir la misma estructura por cada escena que necesite el video]`;

/** El prompt completo que el usuario copia y pega en ChatGPT — arranca con
 * su propia idea tal cual la escribió (para que sienta que la plataforma
 * lo escuchó), sigue con el contexto de marca ya compilado por
 * `compileIdentity()` (sin tocar esa función) y cierra con el formato
 * reducido que `parsearBlueprint()` sabe leer — solo narrativa, nada que
 * Content OS ya sepa o vaya a resolver por su cuenta (UX Migration 1.2). */
function construirPrompt(idea: string, contexto: string): string {
  const hayContexto = contexto.trim().length > 0 && contexto !== IDENTIDAD_SIN_CONTENIDO;
  const bloqueMarca = hayContexto
    ? contexto
    : "Todavía no tenemos información cargada sobre esta marca — generá el Blueprint apoyándote solamente en la idea de arriba, con un tono neutro y profesional.";

  return `Tu idea:
"${idea}"

Usando esta idea y el siguiente contexto de marca, generá SOLO la parte narrativa de un Creative Blueprint Document para un video corto: título, objetivo general, y el guion escena por escena.

Para Personajes, Locaciones y Planos utilizá nombres narrativos naturales (ej.: Presentador, Cliente, Oficina, Taller, Primer plano). No intentes adivinar los nombres exactos de mi Biblioteca — Content OS los va a resolver durante la importación.

${bloqueMarca}

---

Formato esperado — seguí esta estructura exactamente, sin cambiar las etiquetas ni el orden (agregá tantas escenas como necesite el video):

${FORMATO_CBD}`;
}

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
