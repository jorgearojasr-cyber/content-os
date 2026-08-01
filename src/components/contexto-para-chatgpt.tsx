"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * Pantalla "Contexto para ChatGPT" (UX Migration 1) — muestra el resultado
 * de `generarContextoParaChatGPT()` (el compilador determinístico de
 * Identidad ya existente, `compileIdentity()`, invocado de forma aislada)
 * listo para copiar, con la instrucción de desarrollar el guion afuera y
 * volver a pegarlo en "Hoy". No hay ninguna pantalla previa que reemplace:
 * el mecanismo anterior ("Exportar contexto") fue eliminado por completo
 * en Fase 1, antes de que esta pantalla existiera — ver auditoría
 * UX-MIGRATION-1A.
 */
export function ContextoParaChatGPT({ contexto, onVolver }: { contexto: string; onVolver: () => void }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(contexto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-lg font-normal tracking-wide text-text">Tu contexto para ChatGPT</p>
        <p className="mt-1 text-[13px] text-text-muted">
          Llevá esto a ChatGPT y desarrollá tu idea. Cuando tengas el guion, volvé acá y pegalo.
        </p>
      </div>

      {contexto ? (
        <>
          <Button type="button" onClick={copiar}>
            {copiado ? "Copiado ✓" : "Copiar"}
          </Button>
          <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface-2 p-3.5 text-[12.5px] text-text-muted">
            {contexto}
          </p>
        </>
      ) : (
        <p className="text-[13px] text-text-muted">
          Esta Marca todavía no tiene Identidad cargada — podés seguir igual, ChatGPT va a necesitar que le
          cuentes vos el contexto directamente en la conversación.
        </p>
      )}

      <Button type="button" variant="secondary" onClick={onVolver}>
        Volver
      </Button>
    </div>
  );
}
