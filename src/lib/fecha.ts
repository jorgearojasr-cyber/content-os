const FORMATO_CHILE = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Postgres devuelve `created_at` (columna `text`, default `now()`) como
 * "2026-07-16 22:13:00.123456+00" — separador de espacio y offset sin
 * minutos, que algunos motores JS (Safari) no parsean de forma confiable.
 * Se normaliza a ISO 8601 estricto antes de construir el Date.
 */
function aFechaISO(valor: string): Date {
  const normalizado = valor.trim().replace(" ", "T");
  const conOffsetCompleto = /[+-]\d{2}$/.test(normalizado)
    ? `${normalizado}:00`
    : normalizado;
  return new Date(conOffsetCompleto);
}

/**
 * Formatea `createdAt` en horario de Chile, ej. "16 jul 2026, 22:13".
 * Usa el nombre de zona "America/Santiago" (nunca un offset fijo) para que
 * el cambio de horario de verano se maneje solo.
 */
export function formatearFechaChile(fecha: string): string {
  if (!fecha) return "";
  const date = aFechaISO(fecha);
  if (Number.isNaN(date.getTime())) return "";
  return FORMATO_CHILE.format(date);
}
