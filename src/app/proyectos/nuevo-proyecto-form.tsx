"use client";

import { useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";

function normalizar(nombre: string) {
  return nombre.trim().toLowerCase().replace(/\s+/g, " ");
}

export function NuevoProyectoForm({
  nombresExistentes,
  onCreate,
}: {
  nombresExistentes: string[];
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
      <Button type="submit" className="mt-4">
        Crear proyecto
      </Button>
    </form>
  );
}
