"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContenidoRelacionado, NotaRelacionada } from "@/lib/actions";
import type { ResultadoRelacionado } from "@/lib/reutilizacion";

const LARGO_MINIMO_TEMA = 4;

type Estado = "inicial" | "cargando" | "listo";

/**
 * "Contenido relacionado que podrías revisar" — un solo componente reutilizado en los
 * 3 modos de Crear (vía CamposCreacion, que ya es compartido). MANUAL: solo
 * busca cuando el usuario presiona "Ver contenido relacionado" — antes se
 * disparaba solo con debounce mientras escribía, pero eso mostraba falsos
 * positivos sin que el usuario los pidiera. Si el tema cambia después de
 * una búsqueda, el resultado se descarta y vuelve a aparecer el botón (los
 * resultados viejos ya no corresponden a lo que hay escrito ahora).
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
  const [estado, setEstado] = useState<Estado>("inicial");
  const [resultado, setResultado] = useState<ContenidoRelacionado | null>(null);
  const [abierto, setAbierto] = useState(true);
  // Descarta un resultado obsoleto durante el render (no en un efecto —
  // patrón recomendado de React para "ajustar estado cuando cambia una
  // prop") apenas el tema deja de ser el que se buscó: evita mostrar
  // resultados de una idea que el usuario ya reescribió.
  const [temaBuscado, setTemaBuscado] = useState(tema);
  if (tema !== temaBuscado) {
    setTemaBuscado(tema);
    if (estado !== "inicial") setEstado("inicial");
    if (resultado !== null) setResultado(null);
  }

  const temaActual = tema.trim();
  if (temaActual.length < LARGO_MINIMO_TEMA) return null;

  async function buscar() {
    setEstado("cargando");
    try {
      const encontrado = await onBuscar(proyectoId, temaActual);
      setResultado(encontrado);
    } catch {
      setResultado(null);
    } finally {
      setEstado("listo");
    }
  }

  const total = resultado ? resultado.biblioteca.length + resultado.segundoCerebro.length : 0;

  return (
    <div className="mt-3">
      {estado === "inicial" ? (
        <button
          type="button"
          onClick={buscar}
          className="text-[12.5px] font-medium text-accent underline hover:no-underline"
        >
          🔍 Ver contenido relacionado
        </button>
      ) : null}

      {estado === "cargando" ? (
        <p className="text-[12.5px] text-text-muted">Buscando contenido relacionado…</p>
      ) : null}

      {estado === "listo" && total === 0 ? (
        <p className="text-[12.5px] text-text-muted">Sin contenido relacionado encontrado.</p>
      ) : null}

      {estado === "listo" && resultado && total > 0 ? (
        <div className="rounded-xl border border-accent/30 bg-accent-soft p-3.5">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left text-[13.5px] font-medium text-text"
          >
            <span>💡 Contenido relacionado que podrías revisar ({total})</span>
            <span className="text-text-muted">{abierto ? "▲" : "▼"}</span>
          </button>

          {abierto ? (
            <div className="mt-3 space-y-3">
              <SeccionRelacionada titulo="En tu Biblioteca" resultados={resultado.biblioteca} />
              <SeccionSegundoCerebro proyectoId={proyectoId} notas={resultado.segundoCerebro} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SeccionSegundoCerebro({ proyectoId, notas }: { proyectoId: string; notas: NotaRelacionada[] }) {
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set());
  if (notas.length === 0) return null;

  const pendientes = notas.filter((n) => n.estado !== "trabajada");
  const trabajadas = notas.filter((n) => n.estado === "trabajada" && !descartadas.has(n.id));

  return (
    <div className="space-y-1.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        En tu Segundo Cerebro
      </p>
      <ul className="space-y-1.5">
        {trabajadas.map((n) => (
          <li key={n.id} className="rounded-lg bg-surface px-2.5 py-2 text-[12.5px] text-text">
            <p>
              💡 Esto podría parecerse a algo que ya creaste
              {n.bloqueTitulo ? (
                <>
                  : <span className="font-medium">{n.bloqueTitulo}</span>
                  {n.bloqueFormato ? ` (${n.bloqueFormato})` : ""}
                </>
              ) : null}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              {n.bloqueId ? (
                <Link
                  href={`/proyectos/${proyectoId}/biblioteca/${n.bloqueId}/editar`}
                  className="text-[12px] font-medium text-accent underline"
                >
                  Ver en Biblioteca
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setDescartadas((prev) => new Set(prev).add(n.id))}
                className="text-[12px] text-text-muted underline hover:text-text"
              >
                Continuar de todas formas
              </button>
            </div>
          </li>
        ))}
        {pendientes.map((n) => (
          <li key={n.id} className="rounded-lg bg-surface px-2.5 py-2 text-[12.5px] text-text">
            <span className="font-medium">{n.titulo}</span>
            {n.fragmento && n.fragmento !== n.titulo ? (
              <span className="block text-text-muted">{n.fragmento}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeccionRelacionada({ titulo, resultados }: { titulo: string; resultados: ResultadoRelacionado[] }) {
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
