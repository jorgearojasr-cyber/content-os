"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { explicarError } from "@/lib/errores";

/** Formulario mínimo para arrancar una Producción nueva — solo Título,
 * mismo criterio que "+ Nueva escena": bocetar primero, completar después.
 * El resto de los campos del CBD (formato, idea central, objetivos,
 * contexto, recursos globales) quedan vacíos hasta que haga falta usarlos. */
export function CrearProduccionForm({ onCrear }: { onCrear: (formData: FormData) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  if (!abierto) {
    return (
      <Button type="button" variant="secondary" onClick={() => setAbierto(true)}>
        + Nueva producción
      </Button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setGuardando(true);
        setError("");
        try {
          await onCrear(formData);
          setAbierto(false);
        } catch (e) {
          setError(explicarError(e));
          setGuardando(false);
        }
      }}
      className="flex flex-wrap items-start gap-2"
    >
      <Input
        name="titulo"
        placeholder="Título de la producción"
        autoFocus
        required
        className="max-w-[320px]"
      />
      <Button type="submit" disabled={guardando}>
        {guardando ? "Creando…" : "Crear"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setAbierto(false)}>
        Cancelar
      </Button>
      {error ? <p className="w-full text-[12.5px] text-danger">{error}</p> : null}
    </form>
  );
}
