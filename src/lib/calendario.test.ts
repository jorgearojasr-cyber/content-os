import { describe, expect, it } from "vitest";
import { agruparPorSemana, generarCeldasMes, mesAnterior, mesSiguiente, nombreMes } from "./calendario";

describe("generarCeldasMes", () => {
  it("julio 2026 empieza en miércoles — 3 días de relleno del mes anterior", () => {
    const celdas = generarCeldasMes({ anio: 2026, mes: 7 });
    // Lunes 29, Martes 30 (junio), Miércoles 1 (julio, día 1 real)
    expect(celdas[0]).toMatchObject({ fecha: "2026-06-29", enMesActual: false });
    expect(celdas[1]).toMatchObject({ fecha: "2026-06-30", enMesActual: false });
    expect(celdas[2]).toMatchObject({ fecha: "2026-07-01", diaMes: 1, enMesActual: true });
  });

  it("incluye todos los 31 días de julio marcados enMesActual", () => {
    const celdas = generarCeldasMes({ anio: 2026, mes: 7 });
    const diasReales = celdas.filter((c) => c.enMesActual);
    expect(diasReales).toHaveLength(31);
    expect(diasReales[0].fecha).toBe("2026-07-01");
    expect(diasReales[30].fecha).toBe("2026-07-31");
  });

  it("la grilla siempre es múltiplo de 7 (semanas completas)", () => {
    for (let mes = 1; mes <= 12; mes++) {
      const celdas = generarCeldasMes({ anio: 2026, mes });
      expect(celdas.length % 7).toBe(0);
    }
  });

  it("febrero de año bisiesto tiene 29 días", () => {
    const celdas = generarCeldasMes({ anio: 2028, mes: 2 });
    const diasReales = celdas.filter((c) => c.enMesActual);
    expect(diasReales).toHaveLength(29);
  });

  it("diciembre completa la semana con días de enero del año siguiente", () => {
    const celdas = generarCeldasMes({ anio: 2026, mes: 12 });
    const ultimaCelda = celdas[celdas.length - 1];
    if (!ultimaCelda.enMesActual) {
      expect(ultimaCelda.fecha.startsWith("2027-01")).toBe(true);
    }
  });
});

describe("agruparPorSemana", () => {
  it("divide la grilla en arreglos de 7", () => {
    const celdas = generarCeldasMes({ anio: 2026, mes: 7 });
    const semanas = agruparPorSemana(celdas);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas.length * 7).toBe(celdas.length);
  });
});

describe("mesAnterior / mesSiguiente", () => {
  it("retrocede de enero a diciembre del año anterior", () => {
    expect(mesAnterior({ anio: 2026, mes: 1 })).toEqual({ anio: 2025, mes: 12 });
  });

  it("avanza de diciembre a enero del año siguiente", () => {
    expect(mesSiguiente({ anio: 2026, mes: 12 })).toEqual({ anio: 2027, mes: 1 });
  });

  it("dentro del mismo año en casos normales", () => {
    expect(mesAnterior({ anio: 2026, mes: 7 })).toEqual({ anio: 2026, mes: 6 });
    expect(mesSiguiente({ anio: 2026, mes: 7 })).toEqual({ anio: 2026, mes: 8 });
  });
});

describe("nombreMes", () => {
  it("devuelve el nombre en español", () => {
    expect(nombreMes(1)).toBe("Enero");
    expect(nombreMes(7)).toBe("Julio");
    expect(nombreMes(12)).toBe("Diciembre");
  });
});
