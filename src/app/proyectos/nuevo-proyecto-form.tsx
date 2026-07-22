"use client";

import { useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import type { Area } from "@/lib/types";

function normalizar(nombre: string) {
  return nombre.trim().toLowerCase().replace(/\s+/g, " ");
}

export function NuevoProyectoForm({
  nombresExistentes,
  areas,
  onCreate,
}: {
  nombresExistentes: string[];
  /** Áreas de Conocimiento existentes, para el selector opcional — "" (Sin
   * Área) es el default, mismo resultado que asignarla después desde
   * Configuración. */
  areas: Area[];
  onCreate: (formData: FormData) => Promise<void>;
}) {
  const [nombre, setNombre] = useState("");
  const normalizados = new Set(nombresExistentes.map(normalizar));
  const esDuplicado = nombre.trim() !== "" && normalizados.has(normalizar(nombre));

  return (
    <form action={onCreate}>
      <Label htmlFor="nombre">Nombre</Label>
      <Input
        id="nombre"
        name="nombre"
        placeholder="Ej: OBRABIEN"
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      {esDuplicado ? (
        <p className="mt-1.5 text-[12.5px] text-danger">
          Ya existe un proyecto con este nombre — ¿seguro que quieres crear otro?
        </p>
      ) : null}
      <Label htmlFor="descripcion">Descripción (opcional)</Label>
      <Textarea id="descripcion" name="descripcion" placeholder="De qué trata este proyecto" />
      {areas.length > 0 ? (
        <>
          <Label htmlFor="areaId">Área (opcional)</Label>
          <select
            id="areaId"
            name="areaId"
            defaultValue=""
            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text"
          >
            <option value="">Sin Área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <Button type="submit" className="mt-4">
        Crear proyecto
      </Button>
    </form>
  );
}
