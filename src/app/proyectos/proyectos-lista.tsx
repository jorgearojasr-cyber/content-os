"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Proyecto } from "@/lib/types";

export function ProyectosLista({
  proyectos,
  onDelete,
}: {
  proyectos: Proyecto[];
  onDelete: (id: string) => Promise<void>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const termino = busqueda.trim();
  // Filtro client-side simple — ya se trajo la lista completa de una vez,
  // sin necesidad de una consulta nueva al servidor.
  const filtrados = termino
    ? proyectos.filter((p) => p.nombre.toLowerCase().includes(termino.toLowerCase()))
    : proyectos;

  return (
    <div>
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar proyecto por nombre..."
        className="mb-4 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text placeholder:text-text-muted/60"
      />
      {filtrados.length === 0 ? (
        <p className="text-[13.5px] text-text-muted">
          Sin resultados para &ldquo;{termino}&rdquo;.
        </p>
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => (
            <ProyectoCard key={p.id} proyecto={p} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProyectoCard({
  proyecto,
  onDelete,
}: {
  proyecto: Proyecto;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card className="flex items-start justify-between gap-3 transition-colors hover:border-accent/50">
      <Link href={`/proyectos/${proyecto.id}/crear`} className="min-w-0 flex-1">
        <div className="font-display text-[17px]">{proyecto.nombre}</div>
        {proyecto.descripcion ? (
          <p className="mt-1 text-[13px] text-text-muted">{proyecto.descripcion}</p>
        ) : null}
      </Link>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Eliminar ${proyecto.nombre}`}
        title="Eliminar proyecto"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-danger"
      >
        🗑
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Eliminar "${proyecto.nombre}"?`}
        description="Se eliminarán también su identidad, todo su contenido guardado (incluida la papelera) y sus activos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar proyecto"
        onConfirm={() => onDelete(proyecto.id)}
      />
    </Card>
  );
}
