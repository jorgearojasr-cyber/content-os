"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { compileIdentity } from "@/lib/identity-compiler";
import type { ActivoVisual } from "@/lib/identity-compiler";
import type { Avatar, Identidad, Personaje } from "@/lib/types";

const DURACION_CONFIRMACION_MS = 2000;

/**
 * PROMPT MAESTRO DE IDENTIDAD — el documento compilado completo de la
 * marca, siempre actualizado (es compileIdentity() en vivo, no una copia
 * guardada), listo para copiar y pegar en cualquier IA externa sin pasar
 * por el flujo de Crear. Compilación determinista de texto: cero IA.
 * Incluye todos los Personajes del proyecto y el Avatar más reciente; los
 * datos de Contacto quedan fuera a propósito (nunca se exportan salvo
 * activación explícita en Crear, igual que siempre).
 */
export function PromptMaestro({
  identidad,
  personajes,
  avatar,
  activosVisuales,
}: {
  identidad: Identidad;
  personajes: Personaje[];
  avatar: Avatar | null;
  activosVisuales: ActivoVisual[];
}) {
  const [copiado, setCopiado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const texto = compileIdentity(identidad, { personajes, avatar, activosVisuales });

  return (
    <div>
      <p className="text-[13px] text-text-muted">
        Este es el documento completo de tu marca, compilado en vivo desde todo lo guardado en esta
        pestaña (más tus Personajes y fotos de referencia). Se actualiza solo cada vez que guardas —
        cópialo y pégalo al inicio de cualquier conversación con ChatGPT, Gemini o Claude para que esa
        IA trabaje &ldquo;entrenada&rdquo; con tu identidad.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="px-4 py-2.5 text-[13.5px]"
          onClick={() => {
            navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), DURACION_CONFIRMACION_MS);
          }}
        >
          {copiado ? "Copiado ✓" : "📋 Copiar Prompt Maestro"}
        </Button>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="text-[12.5px] text-accent hover:underline"
        >
          {abierto ? "Ocultar texto completo" : "Ver texto completo"}
        </button>
        <span className="font-mono text-[11px] text-text-muted">
          {texto.length.toLocaleString("es-CL")} caracteres
        </span>
      </div>

      {abierto ? (
        <pre className="mt-3 max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-3.5 font-mono text-[12.5px] text-text-muted">
          {texto}
        </pre>
      ) : null}
    </div>
  );
}
