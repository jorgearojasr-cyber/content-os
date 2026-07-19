"use client";

import { useEffect, useState } from "react";
import type { EstadoBloque } from "@/lib/madurez";

const DURACION_MS = 4500;

/**
 * Toast discreto de refuerzo — se muestra UNA vez, al recargar la página
 * después de guardar, cuando un bloque que tiene al menos un campo 🟢
 * Esencial pasa de no-Completo a Completo. Compara contra el último
 * snapshot guardado en localStorage (por proyecto): no hay estado nuevo
 * en la base de datos, es puramente una pista de UX en el cliente. No es
 * un modal, no bloquea nada, desaparece solo.
 */
export function MadurezToast({
  storageKey,
  estadoPorSeccion,
  seccionesConEsencial,
  mensaje,
}: {
  storageKey: string;
  estadoPorSeccion: Record<string, EstadoBloque>;
  seccionesConEsencial: readonly string[];
  mensaje: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const guardadoPrevio = localStorage.getItem(storageKey);
    // Primera visita real (nunca se guardó snapshot en este navegador): solo
    // se establece la línea base, sin toast — de lo contrario cualquiera
    // que abra la pestaña con datos ya completos vería el mensaje sin haber
    // completado nada en esta sesión.
    const esPrimeraVisita = guardadoPrevio === null;
    let anteriores: string[] = [];
    try {
      anteriores = esPrimeraVisita ? [] : JSON.parse(guardadoPrevio);
    } catch {
      anteriores = [];
    }

    const completosAhora = Object.entries(estadoPorSeccion)
      .filter(([, estado]) => estado === "completo")
      .map(([id]) => id);

    localStorage.setItem(storageKey, JSON.stringify(completosAhora));

    if (esPrimeraVisita) return;

    const nuevos = completosAhora.filter(
      (id) => !anteriores.includes(id) && seccionesConEsencial.includes(id),
    );

    if (nuevos.length === 0) return;

    // setVisible se dispara en un callback (rAF), no de forma síncrona en
    // el cuerpo del efecto — evita el render en cascada que señala la
    // regla react-hooks/set-state-in-effect.
    const mostrar = requestAnimationFrame(() => setVisible(true));
    const ocultar = setTimeout(() => setVisible(false), DURACION_MS);
    return () => {
      cancelAnimationFrame(mostrar);
      clearTimeout(ocultar);
    };
  }, [storageKey, estadoPorSeccion, seccionesConEsencial]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-accent/30 bg-surface px-4 py-2.5 text-[13px] text-text shadow-[var(--shadow-card)] sm:left-auto sm:right-5 sm:translate-x-0"
    >
      ✨ {mensaje}
    </div>
  );
}
