/**
 * CALENDARIO DE CONTENIDO — utilidades puras de calendario
 * ------------------------------------------------------------------
 * Sin acceso a base de datos ni a la hora del sistema (salvo
 * `mesActualChile`, la única función que sí la usa). El resto son
 * funciones puras de aritmética de calendario para que la grilla mensual
 * sea fácil de testear sin renderizar nada. Semanas de Lunes a Domingo.
 * ------------------------------------------------------------------
 */

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export type AnioMes = { anio: number; mes: number };

export type CeldaCalendario = {
  /** "YYYY-MM-DD" */
  fecha: string;
  diaMes: number;
  /** false para los días de relleno del mes anterior/siguiente, que
   * completan la primera y última semana de la grilla. */
  enMesActual: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function aFecha(anio: number, mes: number, dia: number): string {
  return `${anio}-${pad2(mes)}-${pad2(dia)}`;
}

/** Cuántos días tiene `mes` (1-12) de `anio` — usa el "día 0" del mes
 * siguiente (0-indexado por `Date`, así que pasar `mes` tal cual ya
 * apunta al mes siguiente en el índice de `Date`), sin tocar zona horaria
 * (`Date` local, nunca ISO/UTC). */
function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

/** Día de la semana (0 = Lunes ... 6 = Domingo) del día 1 de `mes`/`anio`. */
function diaSemanaInicio(anio: number, mes: number): number {
  const diaJs = new Date(anio, mes - 1, 1).getDay(); // 0 = Domingo (JS)
  return (diaJs + 6) % 7;
}

export function mesAnterior({ anio, mes }: AnioMes): AnioMes {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function mesSiguiente({ anio, mes }: AnioMes): AnioMes {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

export function nombreMes(mes: number): string {
  return NOMBRES_MES[mes - 1] ?? "";
}

/** Año y mes actuales, en horario de Chile — igual criterio de zona
 * horaria por nombre ("America/Santiago") que el resto de `fecha.ts`. */
export function mesActualChile(): AnioMes {
  const partes = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const anio = Number(partes.find((p) => p.type === "year")?.value);
  const mes = Number(partes.find((p) => p.type === "month")?.value);
  return { anio, mes };
}

/**
 * Genera la grilla completa (semanas de Lunes a Domingo) de `mes`/`anio` —
 * incluye los días de relleno del mes anterior/siguiente que completan la
 * primera y última semana, marcados con `enMesActual: false`, para que la
 * vista siempre pinte semanas completas.
 */
export function generarCeldasMes({ anio, mes }: AnioMes): CeldaCalendario[] {
  const celdas: CeldaCalendario[] = [];
  const offsetInicio = diaSemanaInicio(anio, mes);
  const totalDiasMes = diasEnMes(anio, mes);

  if (offsetInicio > 0) {
    const { anio: anioAnt, mes: mesAnt } = mesAnterior({ anio, mes });
    const diasMesAnterior = diasEnMes(anioAnt, mesAnt);
    for (let i = offsetInicio - 1; i >= 0; i--) {
      const dia = diasMesAnterior - i;
      celdas.push({ fecha: aFecha(anioAnt, mesAnt, dia), diaMes: dia, enMesActual: false });
    }
  }

  for (let dia = 1; dia <= totalDiasMes; dia++) {
    celdas.push({ fecha: aFecha(anio, mes, dia), diaMes: dia, enMesActual: true });
  }

  const offsetFinal = celdas.length % 7;
  if (offsetFinal > 0) {
    const { anio: anioSig, mes: mesSig } = mesSiguiente({ anio, mes });
    for (let dia = 1; dia <= 7 - offsetFinal; dia++) {
      celdas.push({ fecha: aFecha(anioSig, mesSig, dia), diaMes: dia, enMesActual: false });
    }
  }

  return celdas;
}

/** Divide una grilla ya generada (múltiplo de 7) en semanas — para el
 * layout de tabla/grid del calendario. */
export function agruparPorSemana(celdas: CeldaCalendario[]): CeldaCalendario[][] {
  const semanas: CeldaCalendario[][] = [];
  for (let i = 0; i < celdas.length; i += 7) {
    semanas.push(celdas.slice(i, i + 7));
  }
  return semanas;
}
