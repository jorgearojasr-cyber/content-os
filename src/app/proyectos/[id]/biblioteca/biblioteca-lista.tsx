"use client";

import { useState } from "react";
import {
  archivarBloque,
  desarchivarBloque,
  duplicarBloque,
  eliminarBloquePermanente,
  moverAPapelera,
  moverBloqueAProyecto,
  renombrarBloque,
  restaurarBloque,
} from "@/lib/actions";
import { Card, Chip } from "@/components/ui";
import { ActionMenu, ActionMenuItem } from "@/components/action-menu";
import { ConfirmDialog, PromptDialog, SelectDialog } from "@/components/confirm-dialog";
import { formatearFechaChile } from "@/lib/fecha";
import type { Bloque } from "@/lib/types";

type BloqueConDias = Bloque & { diasRestantes?: number };
type Vista = "activos" | "archivados" | "papelera";

export function BibliotecaLista({
  proyectoId,
  vista,
  bloques,
  otrosProyectos,
}: {
  proyectoId: string;
  vista: Vista;
  bloques: BloqueConDias[];
  otrosProyectos: { id: string; nombre: string }[];
}) {
  return (
    <div className="space-y-3">
      {bloques.map((bloque) => (
        <BloqueCard
          key={bloque.id}
          proyectoId={proyectoId}
          vista={vista}
          bloque={bloque}
          otrosProyectos={otrosProyectos}
        />
      ))}
    </div>
  );
}

function BloqueCard({
  proyectoId,
  vista,
  bloque,
  otrosProyectos,
}: {
  proyectoId: string;
  vista: Vista;
  bloque: BloqueConDias;
  otrosProyectos: { id: string; nombre: string }[];
}) {
  const [confirmPapelera, setConfirmPapelera] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [moviendo, setMoviendo] = useState(false);

  return (
    <Card>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <Chip>{bloque.formato}</Chip>
          <div className="mt-1.5 font-display text-[16px]">{bloque.titulo}</div>
          {vista === "papelera" ? (
            <p className="mt-1 text-[12px] text-text-muted">
              Se elimina para siempre en {bloque.diasRestantes} día
              {bloque.diasRestantes === 1 ? "" : "s"}.
            </p>
          ) : null}
        </div>

        <ActionMenu>
          {vista === "activos" ? (
            <>
              <ActionMenuItem href={`/proyectos/${proyectoId}/biblioteca/${bloque.id}/editar`}>
                Ver / Editar
              </ActionMenuItem>
              <ActionMenuItem onSelect={() => duplicarBloque(proyectoId, bloque.id)}>
                Duplicar
              </ActionMenuItem>
              <ActionMenuItem onSelect={() => setRenombrando(true)}>Renombrar</ActionMenuItem>
              {otrosProyectos.length > 0 ? (
                <ActionMenuItem onSelect={() => setMoviendo(true)}>
                  Mover a otro proyecto
                </ActionMenuItem>
              ) : null}
              <ActionMenuItem onSelect={() => archivarBloque(proyectoId, bloque.id)}>
                Archivar
              </ActionMenuItem>
              <ActionMenuItem variant="danger" onSelect={() => setConfirmPapelera(true)}>
                Eliminar
              </ActionMenuItem>
            </>
          ) : null}
          {vista === "archivados" ? (
            <>
              <ActionMenuItem href={`/proyectos/${proyectoId}/biblioteca/${bloque.id}/editar`}>
                Ver / Editar
              </ActionMenuItem>
              <ActionMenuItem onSelect={() => desarchivarBloque(proyectoId, bloque.id)}>
                Desarchivar
              </ActionMenuItem>
              <ActionMenuItem variant="danger" onSelect={() => setConfirmPapelera(true)}>
                Eliminar
              </ActionMenuItem>
            </>
          ) : null}
          {vista === "papelera" ? (
            <>
              <ActionMenuItem onSelect={() => restaurarBloque(proyectoId, bloque.id)}>
                Restaurar
              </ActionMenuItem>
              <ActionMenuItem variant="danger" onSelect={() => setConfirmEliminar(true)}>
                Eliminar para siempre
              </ActionMenuItem>
            </>
          ) : null}
        </ActionMenu>
      </div>
      <p className="whitespace-pre-wrap text-[14px] text-text">{bloque.texto}</p>
      <p className="mt-2 text-[12px] text-text-muted">{formatearFechaChile(bloque.createdAt)}</p>

      <ConfirmDialog
        open={confirmPapelera}
        onOpenChange={setConfirmPapelera}
        title="¿Eliminar este bloque?"
        description="Se moverá a la papelera y podrás recuperarlo durante 7 días."
        confirmLabel="Eliminar"
        onConfirm={() => moverAPapelera(proyectoId, bloque.id)}
      />
      <ConfirmDialog
        open={confirmEliminar}
        onOpenChange={setConfirmEliminar}
        title="¿Eliminar para siempre?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar para siempre"
        onConfirm={() => eliminarBloquePermanente(proyectoId, bloque.id)}
      />
      <PromptDialog
        open={renombrando}
        onOpenChange={setRenombrando}
        title="Renombrar bloque"
        defaultValue={bloque.titulo}
        onSubmit={(titulo) => {
          const fd = new FormData();
          fd.set("titulo", titulo);
          renombrarBloque(proyectoId, bloque.id, fd);
        }}
      />
      <SelectDialog
        open={moviendo}
        onOpenChange={setMoviendo}
        title="Mover a otro proyecto"
        options={otrosProyectos.map((p) => ({ value: p.id, label: p.nombre }))}
        onSubmit={(destino) => moverBloqueAProyecto(bloque.id, proyectoId, destino)}
      />
    </Card>
  );
}
