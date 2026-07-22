"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Area } from "@/lib/types";

/** Editar nombre/descripción de un Área y eliminarla — mismo patrón que
 * ProyectoCard (editar-in-place + ConfirmDialog antes de borrar). */
export function AreaAcciones({
  area,
  onUpdate,
  onDelete,
}: {
  area: Area;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

  if (editando) {
    return (
      <Card className="mb-5">
        <form
          action={async (fd) => {
            await onUpdate(fd);
            setEditando(false);
            router.refresh();
          }}
        >
          <Label htmlFor="area-nombre">Nombre</Label>
          <Input id="area-nombre" name="nombre" defaultValue={area.nombre} required />
          <Label htmlFor="area-descripcion">Descripción</Label>
          <Textarea id="area-descripcion" name="descripcion" defaultValue={area.descripcion} />
          <div className="mt-4 flex gap-2">
            <Button type="submit">Guardar cambios</Button>
            <Button type="button" variant="secondary" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        className="px-3 py-2 text-[12.5px]"
        onClick={() => setEditando(true)}
      >
        Editar Área
      </Button>
      <Button
        type="button"
        variant="danger"
        className="px-3 py-2 text-[12.5px]"
        onClick={() => setConfirmEliminar(true)}
      >
        Eliminar Área
      </Button>
      <ConfirmDialog
        open={confirmEliminar}
        onOpenChange={setConfirmEliminar}
        title={`¿Eliminar "${area.nombre}"?`}
        description='Sus proyectos quedan "sin Área" (no se borran). El Conocimiento propio de esta Área sí se elimina. Esta acción no se puede deshacer.'
        confirmLabel="Eliminar Área"
        onConfirm={onDelete}
      />
    </div>
  );
}
