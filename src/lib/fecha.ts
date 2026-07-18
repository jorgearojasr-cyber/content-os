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

/** Hora actual (0-23) en Chile — mismo criterio de zona horaria por nombre
 * ("America/Santiago") que el resto de este archivo, nunca un offset fijo. */
function horaActualChile(): number {
  const horaTexto = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  return Number(horaTexto);
}

/** Saludo dinámico según la hora real en Chile ahora mismo — "Buenos días"
 * antes de las 12, "Buenas tardes" hasta las 19, "Buenas noches" después. */
export function saludoChile(): string {
  const hora = horaActualChile();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/**
 * Formatea una fecha PLANA "YYYY-MM-DD" (sin hora, sin zona horaria — ej.
 * `bloque.fechaPlanificada`) como "18 jul 2026". A diferencia de
 * `formatearFechaChile`, nunca construye un `Date` (que interpretaría
 * "YYYY-MM-DD" como medianoche UTC y podría mostrar el día anterior según
 * la zona horaria del navegador) — el string ya es el día exacto elegido,
 * se parsea con split, no con el constructor de Date.
 */
export function formatearFechaPlanificada(fecha: string): string {
  const m = fecha.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const [, anio, mes, dia] = m;
  const mesTexto = MESES_CORTOS[Number(mes) - 1] ?? "";
  return `${Number(dia)} ${mesTexto} ${anio}`;
}
