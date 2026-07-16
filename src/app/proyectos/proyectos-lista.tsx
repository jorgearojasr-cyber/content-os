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
  return (
    <div className="space-y-3">
      {proyectos.map((p) => (
        <ProyectoCard key={p.id} proyecto={p} onDelete={onDelete} />
      ))}
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
