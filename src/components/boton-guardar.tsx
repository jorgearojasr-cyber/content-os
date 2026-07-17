"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui";

const DURACION_CONFIRMACION_MS = 2000;

/**
 * Botón de submit para formularios con Server Action que confirma
 * visualmente el guardado: cambia a "Guardado ✓" por ~2s justo después de
 * que el envío termina sin errores — mismo patrón de confirmación temporal
 * que ya usa el botón "Copiar" en los resultados de Crear.
 *
 * Debe montarse DENTRO del <form> — `useFormStatus` lee el <form> padre más
 * cercano — pero el <form> en sí sigue siendo un Server Component normal,
 * sin necesidad de convertir todo el formulario a cliente.
 */
export function BotonGuardar({
  texto,
  textoEnviando,
  textoConfirmado = "Guardado ✓",
  className,
}: {
  texto: string;
  textoEnviando?: string;
  textoConfirmado?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [confirmado, setConfirmado] = useState(false);
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending) {
      setConfirmado(true);
      const t = setTimeout(() => setConfirmado(false), DURACION_CONFIRMACION_MS);
      return () => clearTimeout(t);
    }
    eraPending.current = pending;
  }, [pending]);

  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? (textoEnviando ?? `${texto}…`) : confirmado ? textoConfirmado : texto}
    </Button>
  );
}
