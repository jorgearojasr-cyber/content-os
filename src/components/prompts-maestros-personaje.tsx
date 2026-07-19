"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { compilarPersonaje } from "@/lib/personaje-compiler";
import { parseFotosPersonaje } from "@/lib/types";
import type { Identidad, Personaje } from "@/lib/types";

const DURACION_CONFIRMACION_MS = 2000;

const ETIQUETAS: Array<[keyof ReturnType<typeof compilarPersonaje>, string]> = [
  ["maestro", "Prompt Maestro"],
  ["imagen", "Prompt Imagen"],
  ["video", "Prompt Video"],
  ["voz", "Prompt Voz"],
  ["miniaturas", "Prompt Miniaturas"],
  ["carruseles", "Prompt Carruseles"],
  ["storytelling", "Prompt Storytelling"],
  ["narracion", "Prompt Narración"],
];

/**
 * PROMPTS MAESTROS VIVOS — los 8 prompts de `compilarPersonaje()`, siempre
 * actualizados (se recalculan en cada render desde la ficha guardada, no
 * son texto guardado en la base de datos). Si el Personaje tiene un
 * override manual en promptMaestro/Imagen/Video/Voz (Fase 2 del Creative
 * OS), ese texto exacto es el que se muestra acá para esos 4 — no se
 * pierde ni se ignora.
 */
export function PromptsMaestrosPersonaje({
  personaje,
  identidad,
}: {
  personaje: Personaje;
  identidad: Identidad | null;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const fotos = parseFotosPersonaje(personaje.fotosUrlsJson);
  const prompts = compilarPersonaje(personaje, { identidad, fotos });

  function copiar(clave: string, texto: string) {
    navigator.clipboard.writeText(texto);
    setCopiado(clave);
    setTimeout(() => setCopiado((v) => (v === clave ? null : v)), DURACION_CONFIRMACION_MS);
  }

  return (
    <div>
      <p className="text-[13px] text-text-muted">
        Se recalculan solos cada vez que guardas la ficha de arriba — cópialos y pégalos en
        cualquier IA externa. Los Elementos Invariables van primero en cada uno.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ETIQUETAS.map(([clave, etiqueta]) => {
          const texto = prompts[clave];
          return (
            <div key={clave} className="rounded-xl border border-border bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-text">{etiqueta}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAbierto((v) => (v === clave ? null : clave))}
                    className="text-[11.5px] text-accent hover:underline"
                  >
                    {abierto === clave ? "Ocultar" : "Ver"}
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-[11.5px]"
                    disabled={!texto.trim()}
                    onClick={() => copiar(clave, texto)}
                  >
                    {copiado === clave ? "Copiado ✓" : "📋 Copiar"}
                  </Button>
                </div>
              </div>
              {abierto === clave ? (
                <pre className="mt-2 max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface p-2.5 font-mono text-[11.5px] text-text-muted">
                  {texto || "(vacío — completa la ficha para que se genere)"}
                </pre>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
