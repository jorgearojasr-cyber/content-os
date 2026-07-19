"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

/**
 * Error Boundary de esta ruta (Next.js App Router) — si algo revienta al
 * renderizar Identidad (ej. un Personaje/Avatar con datos inesperados),
 * esto reemplaza la pantalla en negro / "This page couldn't load" del
 * navegador por un mensaje claro dentro de la app, con la opción de
 * reintentar sin perder el resto de la sesión.
 */
export default function ErrorIdentidad({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error en /identidad:", error);
  }, [error]);

  return (
    <Card className="border border-danger/30">
      <p className="mb-1 font-display text-[16px]">Algo salió mal en Identidad</p>
      <p className="mb-4 text-[13px] text-text-muted">
        Ocurrió un error inesperado al cargar esta página. Puedes intentar de nuevo — el resto de tu
        proyecto sigue intacto.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </Card>
  );
}
