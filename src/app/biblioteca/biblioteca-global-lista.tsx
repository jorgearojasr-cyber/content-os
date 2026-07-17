"use client";

import { useState } from "react";
import { Empty } from "@/components/ui";
import { BloqueCard, type BloqueConDias } from "@/app/proyectos/[id]/biblioteca/biblioteca-lista";
import type { Proyecto } from "@/lib/types";

type BloqueGlobal = BloqueConDias & { proyectoNombre: string };

/**
 * Lista global de Biblioteca: mismas tarjetas (`BloqueCard`) que la
 * Biblioteca por proyecto, con la etiqueta de proyecto agregada, más un
 * filtro por proyecto arriba. El filtrado es puramente en el cliente —
 * ya se trajeron todos los bloques activos del servidor de una vez.
 */
export function BibliotecaGlobalLista({
  bloques,
  proyectos,
}: {
  bloques: BloqueGlobal[];
  proyectos: Proyecto[];
}) {
  const [filtro, setFiltro] = useState<string>("");

  const bloquesFiltrados = filtro ? bloques.filter((b) => b.proyectoId === filtro) : bloques;

  return (
    <div>
      <select
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="mb-4 w-full max-w-[280px] rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
      >
        <option value="">Todos los proyectos</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>

      {bloquesFiltrados.length === 0 ? (
        <Empty title="No hay contenido para este filtro">
          {bloques.length === 0 ? "Ve a Crear en un proyecto y guarda tu primera pieza." : "Prueba con otro proyecto."}
        </Empty>
      ) : (
        <div className="space-y-3">
          {bloquesFiltrados.map((bloque) => (
            <BloqueCard
              key={bloque.id}
              proyectoId={bloque.proyectoId}
              vista="activos"
              bloque={bloque}
              otrosProyectos={proyectos
                .filter((p) => p.id !== bloque.proyectoId)
                .map((p) => ({ id: p.id, nombre: p.nombre }))}
              nombreProyecto={bloque.proyectoNombre}
            />
          ))}
        </div>
      )}
    </div>
  );
}
