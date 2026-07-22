"use client";

import { Button, Input, Label, Textarea } from "@/components/ui";

export function NuevaAreaForm({ onCreate }: { onCreate: (formData: FormData) => Promise<void> }) {
  return (
    <form action={onCreate}>
      <Label htmlFor="nombre">Nombre</Label>
      <Input id="nombre" name="nombre" placeholder="Ej: Construcción" required />
      <Label htmlFor="descripcion">Descripción (opcional)</Label>
      <Textarea
        id="descripcion"
        name="descripcion"
        placeholder="Qué conocimiento comparten los proyectos de esta Área"
      />
      <Button type="submit" className="mt-4">
        Crear Área
      </Button>
    </form>
  );
}
