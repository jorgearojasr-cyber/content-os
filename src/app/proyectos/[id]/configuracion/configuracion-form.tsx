"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { explicarError } from "@/lib/errores";
import type { Area, Proyecto } from "@/lib/types";

export function ConfiguracionForm({
  proyecto,
  areas,
  onUpdateProyecto,
  onAsignarArea,
}: {
  proyecto: Proyecto;
  areas: Area[];
  onUpdateProyecto: (formData: FormData) => Promise<void>;
  onAsignarArea: (areaId: string | null) => Promise<void>;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [asignando, setAsignando] = useState(false);

  return (
    <div className="space-y-5">
      <form
        action={async (fd) => {
          setGuardando(true);
          setError("");
          try {
            await onUpdateProyecto(fd);
            router.refresh();
          } catch (e) {
            setError(explicarError(e));
          } finally {
            setGuardando(false);
          }
        }}
      >
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" defaultValue={proyecto.nombre} required />
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" name="descripcion" defaultValue={proyecto.descripcion} />
        {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}
        <Button type="submit" disabled={guardando} className="mt-4">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <Label htmlFor="areaId">Área de Conocimiento</Label>
        <select
          id="areaId"
          defaultValue={proyecto.areaId ?? ""}
          disabled={asignando}
          onChange={async (e) => {
            setAsignando(true);
            try {
              await onAsignarArea(e.target.value || null);
              router.refresh();
            } finally {
              setAsignando(false);
            }
          }}
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text disabled:opacity-60"
        >
          <option value="">Sin Área</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[12px] text-text-muted">
          El Conocimiento propio de esa Área queda disponible automáticamente al generar
          contenido en este proyecto, sin subirlo a su Biblioteca.
        </p>
      </div>
    </div>
  );
}
