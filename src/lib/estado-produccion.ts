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
