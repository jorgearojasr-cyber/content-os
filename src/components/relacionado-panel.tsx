"use client";

import { useState } from "react";
import Link from "next/link";
import type { RelacionesEntidad, RelacionItem } from "@/lib/actions";

type Estado = "inicial" | "cargando" | "listo";

/**
 * "Relacionado" de una entidad (Personaje, Activo…) — el grafo de
 * conocimiento en la práctica: al expandir, carga todo lo conectado a esa
 * entidad (contenido, prompts, documentos, ideas, activos) vía la acción
 * que se le pase. Carga bajo demanda (botón), nunca automática — mismo
 * criterio manual que el panel de Contenido relacionado de Crear.
 */
export function RelacionadoPanel({ onCargar }: { onCargar: () => Promise<RelacionesEntidad> }) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [relaciones, setRelaciones] = useState<RelacionesEntidad | null>(null);

  async function cargar() {
    setEstado("cargando");
    try {
      setRelaciones(await onCargar());
    } catch {
      setRelaciones(null);
    } finally {
      setEstado("listo");
    }
  }

  const total = relaciones
    ? relaciones.bloques.length +
      relaciones.prompts.length +
      relaciones.documentos.length +
      relaciones.ideas.length +
      relaciones.activos.length
    : 0;

  if (estado === "inicial") {
    return (
      <button
        type="button"
        onClick={cargar}
        className="mt-2 text-[12.5px] font-medium text-accent underline hover:no-underline"
      >
        🔗 Ver relacionado
      </button>
    );
  }

  if (estado === "cargando") {
    return <p className="mt-2 text-[12.5px] text-text-muted">Buscando relaciones…</p>;
  }

  if (!relaciones || total === 0) {
    return <p className="mt-2 text-[12.5px] text-text-muted">Sin relaciones encontradas todavía.</p>;
  }

  return (
    <div className="mt-2.5 space-y-2.5 rounded-xl border border-border bg-surface-2/60 p-3">
      <GrupoRelacion
        titulo="Contenido"
        items={relaciones.bloques}
        href={(r) => (r.proyectoId ? `/proyectos/${r.proyectoId}/biblioteca/${r.id}/editar` : "/biblioteca")}
      />
      <GrupoRelacion
        titulo="Prompts"
        items={relaciones.prompts}
        href={(r) => (r.proyectoId ? `/prompts?proyecto=${r.proyectoId}` : "/prompts")}
      />
      <GrupoRelacion
        titulo="Documentos"
        items={relaciones.documentos}
        href={(r) => (r.proyectoId ? `/conocimiento?proyecto=${r.proyectoId}` : "/conocimiento")}
      />
      <GrupoRelacion titulo="Ideas" items={relaciones.ideas} href={() => "/segundo-cerebro"} />
      <GrupoRelacion
        titulo="Activos"
        items={relaciones.activos}
        href={(r) => (r.proyectoId ? `/proyectos/${r.proyectoId}/activos` : "/proyectos")}
      />
    </div>
  );
}

function GrupoRelacion({
  titulo,
  items,
  href,
}: {
  titulo: string;
  items: RelacionItem[];
  href: (item: RelacionItem) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
        {titulo} ({items.length})
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={href(item)}
              className="block truncate rounded-md bg-surface px-2 py-1.5 text-[12px] text-text hover:text-accent"
            >
              {item.titulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
