"use client";

import { useRef, useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { TIPOS_ACTIVO } from "@/lib/types";

type TipoActivo = (typeof TIPOS_ACTIVO)[number]["value"];

export function NuevoActivoForm({
  onCreateArchivo,
  onCreateTexto,
}: {
  onCreateArchivo: (formData: FormData) => Promise<void>;
  onCreateTexto: (formData: FormData) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoActivo>(TIPOS_ACTIVO[0].value);
  const formRef = useRef<HTMLFormElement>(null);
  const esArchivo = TIPOS_ACTIVO.find((t) => t.value === tipo)?.archivo ?? false;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        if (esArchivo) {
          await onCreateArchivo(formData);
        } else {
          await onCreateTexto(formData);
        }
        formRef.current?.reset();
        setTipo(TIPOS_ACTIVO[0].value);
      }}
    >
      <Label htmlFor="tipo">Tipo</Label>
      <select
        id="tipo"
        name="tipo"
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoActivo)}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        {TIPOS_ACTIVO.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <Label htmlFor="nombre">Nombre</Label>
      <Input
        id="nombre"
        name="nombre"
        placeholder="Ej: Foto de producto, Ícono de la app, Prompt de fotos"
        required
      />

      {esArchivo ? (
        <>
          <Label htmlFor="archivo">Archivo</Label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            required
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13.5px] text-text file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-2.5 file:py-1.5 file:text-accent"
          />
        </>
      ) : (
        <>
          <Label htmlFor="valor">Valor</Label>
          <Textarea
            id="valor"
            name="valor"
            placeholder="Ej: #C9A24B, o el texto del prompt"
            required
          />
        </>
      )}

      <Label htmlFor="notas">Notas (opcional)</Label>
      <Textarea id="notas" name="notas" placeholder="Contexto para cuándo usarlo" />

      <Button type="submit" className="mt-4">
        Guardar activo
      </Button>
    </form>
  );
}
