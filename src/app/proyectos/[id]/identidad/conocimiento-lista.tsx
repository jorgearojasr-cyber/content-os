"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Conocimiento } from "@/lib/types";

export function ConocimientoLista({
  entradas,
  onDelete,
}: {
  entradas: Conocimiento[];
  onDelete: (conocimientoId: string) => Promise<void>;
}) {
  if (entradas.length === 0) {
    return <p className="text-[13px] text-text-muted">Todavía no hay entradas de conocimiento.</p>;
  }

  return (
    <div className="space-y-3">
      {entradas.map((entrada) => (
        <ConocimientoCard key={entrada.id} entrada={entrada} onDelete={onDelete} />
      ))}
    </div>
  );
}

function ConocimientoCard({
  entrada,
  onDelete,
}: {
  entrada: Conocimiento;
  onDelete: (conocimientoId: string) => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[14px]">{entrada.titulo}</p>
        <Button
          variant="danger"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => setConfirmOpen(true)}
        >
          Eliminar
        </Button>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] text-text-muted">{entrada.contenido}</p>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar esta entrada de conocimiento?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => onDelete(entrada.id)}
      />
    </div>
  );
}
