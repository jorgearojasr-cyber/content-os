/** Un color reconocible por estado (--text-muted, --accent, --info,
 * --success) — Editada usaba --text hasta la auditoría de Fase 3.2.5, que
 * confirmó que se veía igual que el texto normal de la tarjeta; --info es
 * el único token nuevo que agregó ese ajuste. Vive fuera de cualquier
 * archivo "use client" para poder importarse desde Server Components sin
 * pasar por el boundary de cliente. */
export const ESTADO_PRODUCCION_INFO: Record<string, { icono: string; etiqueta: string; clase: string }> = {
  BORRADOR: { icono: "○", etiqueta: "Borrador", clase: "text-text-muted" },
  GRABADA: { icono: "●", etiqueta: "Grabada", clase: "text-accent" },
  EDITADA: { icono: "●", etiqueta: "Editada", clase: "text-info" },
  PUBLICADA: { icono: "✓", etiqueta: "Publicada", clase: "text-success" },
};

export function infoEstadoProduccion(estado: string) {
  return ESTADO_PRODUCCION_INFO[estado] ?? ESTADO_PRODUCCION_INFO.BORRADOR;
}

/** Resultado de `resolverFaseCopiloto()`: qué le corresponde ver al usuario
 * ahora mismo dentro del Copiloto, calculado siempre desde el estado real
 * de las escenas — nunca desde qué pestaña hizo click. */
export type FaseCopiloto =
  | { fase: "vacio" }
  | { fase: "grabar"; escenaId: string }
  | { fase: "editar" }
  | { fase: "cierre" }
  | { fase: "publicado" };

/**
 * El "siguiente paso" del Copiloto (UX Migration 3A/3B) — misma lógica que
 * ya validó la auditoría: primera escena en Borrador por `orden` para
 * grabar; si no queda ninguna pero hay alguna Grabada, pasar a editar el
 * video completo; si no queda ninguna Grabada pero hay alguna Editada,
 * pasar al cierre (publicar); si todo está Publicada (o no hay escenas
 * cargadas), no hay nada pendiente. Recibe las escenas YA ordenadas por
 * `orden` (ver `getStoryboardEscenas`).
 */
export function resolverFaseCopiloto(escenas: { id: string; orden: number; estadoProduccion: string }[]): FaseCopiloto {
  if (escenas.length === 0) return { fase: "vacio" };

  const primeraBorrador = escenas.find((e) => e.estadoProduccion === "BORRADOR");
  if (primeraBorrador) return { fase: "grabar", escenaId: primeraBorrador.id };

  if (escenas.some((e) => e.estadoProduccion === "GRABADA")) return { fase: "editar" };
  if (escenas.some((e) => e.estadoProduccion === "EDITADA")) return { fase: "cierre" };

  return { fase: "publicado" };
}
