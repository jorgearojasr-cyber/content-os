"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Chip } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Area, Proyecto } from "@/lib/types";

export function ProyectosLista({
  proyectos,
  areas,
  onDelete,
  conteoContenido,
}: {
  proyectos: Proyecto[];
  areas: Area[];
  onDelete: (id: string) => Promise<void>;
  /** Piezas activas guardadas en la Biblioteca de cada proyecto — un
   * proyecto en 0 muestra el badge "Sin contenido aún" en su tarjeta. */
  conteoContenido: Record<string, number>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const termino = busqueda.trim();
  // Filtro client-side simple — ya se trajo la lista completa de una vez,
  // sin necesidad de una consulta nueva al servidor.
  const filtrados = termino
    ? proyectos.filter((p) => p.nombre.toLowerCase().includes(termino.toLowerCase()))
    : proyectos;

  // Agrupado por Área (nivel intermedio entre Centro Personal y Proyectos)
  // — mismas Áreas de /areas, en el mismo orden, más "Sin Área" al final.
  // Mientras hay búsqueda activa, se ocultan los grupos sin coincidencias.
  const proyectosPorArea = new Map<string, Proyecto[]>();
  const sinArea: Proyecto[] = [];
  for (const p of filtrados) {
    if (p.areaId) {
      const lista = proyectosPorArea.get(p.areaId) ?? [];
      lista.push(p);
      proyectosPorArea.set(p.areaId, lista);
    } else {
      sinArea.push(p);
    }
  }
  const gruposArea = areas
    .map((a) => ({ area: a, proyectos: proyectosPorArea.get(a.id) ?? [] }))
    .filter((g) => !termino || g.proyectos.length > 0);

  return (
    <div>
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar marca por nombre..."
        className="mb-4 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text placeholder:text-text-muted/60"
      />
      {filtrados.length === 0 ? (
        <p className="text-[13.5px] text-text-muted">
          Sin resultados para &ldquo;{termino}&rdquo;.
        </p>
      ) : (
        <div className="space-y-5">
          {gruposArea.map(({ area, proyectos: proyectosDeArea }) => (
            <div key={area.id}>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[1px] text-text-muted">
                🏛 {area.nombre}
              </p>
              {proyectosDeArea.length === 0 ? (
                <p className="text-[12.5px] text-text-muted">Sin marcas todavía.</p>
              ) : (
                <div className="space-y-3">
                  {proyectosDeArea.map((p) => (
                    <ProyectoCard
                      key={p.id}
                      proyecto={p}
                      onDelete={onDelete}
                      sinContenido={(conteoContenido[p.id] ?? 0) === 0}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {sinArea.length > 0 ? (
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[1px] text-text-muted">
                Sin Área
              </p>
              <div className="space-y-3">
                {sinArea.map((p) => (
                  <ProyectoCard
                    key={p.id}
                    proyecto={p}
                    onDelete={onDelete}
                    sinContenido={(conteoContenido[p.id] ?? 0) === 0}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProyectoCard({
  proyecto,
  onDelete,
  sinContenido,
}: {
  proyecto: Proyecto;
  onDelete: (id: string) => Promise<void>;
  sinContenido: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card className="flex items-start justify-between gap-3 transition-colors hover:border-accent/50">
      <Link href={`/proyectos/${proyecto.id}/crear`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-display text-[17px]">{proyecto.nombre}</div>
          {sinContenido ? <Chip>Sin contenido aún</Chip> : null}
        </div>
        {proyecto.descripcion ? (
          <p className="mt-1 text-[13px] text-text-muted">{proyecto.descripcion}</p>
        ) : null}
      </Link>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Eliminar ${proyecto.nombre}`}
        title="Eliminar marca"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-danger"
      >
        🗑
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Eliminar "${proyecto.nombre}"?`}
        description="Se eliminarán también su identidad, todo su contenido guardado (incluida la papelera) y sus activos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar marca"
        onConfirm={() => onDelete(proyecto.id)}
      />
    </Card>
  );
}
