/** Colores tomados del sistema de diseño existente (--text-muted, --accent,
 * --text, --success) — sin inventar tokens nuevos para los 4 estados.
 * Vive fuera de cualquier archivo "use client" para poder importarse desde
 * Server Components sin pasar por el boundary de cliente. */
export const ESTADO_PRODUCCION_INFO: Record<string, { icono: string; etiqueta: string; clase: string }> = {
  BORRADOR: { icono: "○", etiqueta: "Borrador", clase: "text-text-muted" },
  GRABADA: { icono: "●", etiqueta: "Grabada", clase: "text-accent" },
  EDITADA: { icono: "●", etiqueta: "Editada", clase: "text-text" },
  PUBLICADA: { icono: "✓", etiqueta: "Publicada", clase: "text-success" },
};

export function infoEstadoProduccion(estado: string) {
  return ESTADO_PRODUCCION_INFO[estado] ?? ESTADO_PRODUCCION_INFO.BORRADOR;
}
