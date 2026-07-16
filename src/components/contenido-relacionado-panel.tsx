"use client";

import { useEffect, useState } from "react";
import type { ContenidoRelacionado } from "@/lib/actions";
import type { ResultadoRelacionado } from "@/lib/reutilizacion";

const DEBOUNCE_MS = 500;
const LARGO_MINIMO_TEMA = 4;

/**
 * "Esto ya existe sobre este tema" — un solo componente reutilizado en los
 * 3 modos de Crear (vía CamposCreacion, que ya es compartido). Busca con
 * debounce mientras el usuario escribe el tema; si no hay resultados, no
 * renderiza nada (nunca muestra una sección vacía).
 */
export function ContenidoRelacionadoPanel({
  proyectoId,
  tema,
  onBuscar,
}: {
  proyectoId: string;
  tema: string;
  onBuscar: (proyectoId: string, tema: string) => Promise<ContenidoRelacionado>;
}) {
  const [resultado, setResultado] = useState<ContenidoRelacionado | null>(null);
  const [abierto, setAbierto] = useState(true);

  useEffect(() => {
    const temaActual = tema.trim();
    if (temaActual.length < LARGO_MINIMO_TEMA) return;

    let cancelado = false;
    const temporizador = setTimeout(async () => {
      try {
        const encontrado = await onBuscar(proyectoId, temaActual);
        if (!cancelado) setResultado(encontrado);
      } catch {
        if (!cancelado) setResultado(null);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [proyectoId, tema, onBuscar]);

  // El tema se volvió demasiado corto (o vacío) después de una búsqueda
  // anterior — no mostrar resultados de un tema que ya no es el actual.
  if (tema.trim().length < LARGO_MINIMO_TEMA) return null;
  if (!resultado) return null;
  const total =
    resultado.biblioteca.length + resultado.conocimiento.length + resultado.segundoCerebro.length;
  if (total === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft p-3.5">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-[13.5px] font-medium text-text"
      >
        <span>💡 Esto ya existe sobre este tema ({total})</span>
        <span className="text-text-muted">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto ? (
        <div className="mt-3 space-y-3">
          <SeccionRelacionada titulo="En tu Biblioteca" resultados={resultado.biblioteca} />
          <SeccionRelacionada titulo="En tu Base de Conocimiento" resultados={resultado.conocimiento} />
          <SeccionRelacionada titulo="En tu Segundo Cerebro" resultados={resultado.segundoCerebro} />
        </div>
      ) : null}
    </div>
  );
}

function SeccionRelacionada({
  titulo,
  resultados,
}: {
  titulo: string;
  resultados: ResultadoRelacionado[];
}) {
  if (resultados.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {titulo}
      </p>
      <ul className="space-y-1.5">
        {resultados.map((r) => (
          <li key={r.id} className="rounded-lg bg-surface px-2.5 py-2 text-[12.5px] text-text">
            <span className="font-medium">{r.titulo}</span>
            {r.fragmento && r.fragmento !== r.titulo ? (
              <span className="block text-text-muted">{r.fragmento}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
