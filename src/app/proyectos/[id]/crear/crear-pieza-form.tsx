"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { explicarError } from "@/lib/errores";

/**
 * Reemplazo mínimo del asistente eliminado en Fase 1 — sin Motor, sin
 * animación, sin pasos. Pide solo lo que `createBloque` necesita de
 * verdad (título + texto); todo lo demás en esa acción tiene default. El
 * Storyboard de escenas (Fase 2/3) reemplazará esto como punto de entrada
 * principal para producir piezas nuevas.
 */
export function CrearPiezaForm({
  proyectoId,
  onCreate,
}: {
  proyectoId: string;
  onCreate: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  return (
    <Card>
      <SectionTitle subtitle="Guarda una pieza nueva en tu Biblioteca — sin pasos ni ayuda automática, solo lo esencial.">
        Nueva pieza
      </SectionTitle>
      <form
        action={async (fd) => {
          setGuardando(true);
          setError("");
          try {
            await onCreate(fd);
            router.push(`/proyectos/${proyectoId}/biblioteca`);
          } catch (e) {
            setError(explicarError(e));
            setGuardando(false);
          }
        }}
      >
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" placeholder="Ej: 5 errores típicos en la construcción" required />

        <Label htmlFor="texto">Texto</Label>
        <Textarea
          id="texto"
          name="texto"
          placeholder="El guión, copy o contenido de esta pieza"
          className="min-h-[180px]"
          required
        />

        {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
        <Button type="submit" disabled={guardando} className="mt-4">
          {guardando ? "Guardando…" : "Guardar en Biblioteca"}
        </Button>
      </form>
    </Card>
  );
}
