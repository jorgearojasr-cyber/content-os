"use client";

import { useState } from "react";
import { Button, Card, Chip } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TIPOS_ACTIVO } from "@/lib/types";
import type { Activo } from "@/lib/types";

const TIPOS_CON_PREVIEW = new Set(["foto", "logo", "icono"]);

function esArchivo(tipo: string) {
  return TIPOS_ACTIVO.find((t) => t.value === tipo)?.archivo ?? false;
}

function etiquetaTipo(tipo: string) {
  return TIPOS_ACTIVO.find((t) => t.value === tipo)?.label ?? tipo;
}

export function ActivosLista({
  activos,
  onDelete,
}: {
  activos: Activo[];
  onDelete: (activoId: string) => Promise<void>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {activos.map((activo) => (
        <ActivoCard key={activo.id} activo={activo} onDelete={onDelete} />
      ))}
    </div>
  );
}

function ActivoCard({
  activo,
  onDelete,
}: {
  activo: Activo;
  onDelete: (activoId: string) => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Chip>{etiquetaTipo(activo.tipo)}</Chip>
          <div className="mt-1.5 font-display text-[15px]">{activo.nombre}</div>
        </div>
        <Button
          variant="danger"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => setConfirmOpen(true)}
        >
          Eliminar
        </Button>
      </div>

      {esArchivo(activo.tipo) ? (
        TIPOS_CON_PREVIEW.has(activo.tipo) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activo.valor}
            alt={activo.nombre}
            className="mt-2 h-28 w-full rounded-lg object-cover"
          />
        ) : (
          <a
            href={activo.valor}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-[13px] text-accent underline"
          >
            Ver archivo
          </a>
        )
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-text">{activo.valor}</p>
      )}

      {activo.notas ? <p className="mt-2 text-[12.5px] text-text-muted">{activo.notas}</p> : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar este activo?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => onDelete(activo.id)}
      />
    </Card>
  );
}
