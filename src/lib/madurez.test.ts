import { describe, expect, it } from "vitest";
import { calcularMadurezIdentidad, estadoBloque, type CampoParaMadurez } from "./madurez";

describe("calcularMadurezIdentidad", () => {
  it("da 0% y etapa Semilla cuando todos los campos están vacíos", () => {
    const campos: CampoParaMadurez[] = [
      { valor: "", nivel: "esencial" },
      { valor: "", nivel: "recomendado" },
      { valor: "", nivel: "opcional" },
    ];
    const r = calcularMadurezIdentidad(campos);
    expect(r.porcentaje).toBe(0);
    expect(r.etapa).toBe("semilla");
  });

  it("da 100% y etapa Experta cuando todos los campos están llenos", () => {
    const campos: CampoParaMadurez[] = [
      { valor: "algo", nivel: "esencial" },
      { valor: "algo", nivel: "recomendado" },
      { valor: "algo", nivel: "opcional" },
    ];
    const r = calcularMadurezIdentidad(campos);
    expect(r.porcentaje).toBe(100);
    expect(r.etapa).toBe("experta");
  });

  it("pondera Esencial más que Recomendado y Opcional — llenar solo lo esencial pesa más", () => {
    const soloEsencial = calcularMadurezIdentidad([
      { valor: "algo", nivel: "esencial" },
      { valor: "", nivel: "recomendado" },
      { valor: "", nivel: "opcional" },
    ]);
    const soloOpcional = calcularMadurezIdentidad([
      { valor: "", nivel: "esencial" },
      { valor: "", nivel: "recomendado" },
      { valor: "algo", nivel: "opcional" },
    ]);
    expect(soloEsencial.porcentaje).toBeGreaterThan(soloOpcional.porcentaje);
  });

  it("recorre las 4 etapas en los umbrales correctos (20/50/80)", () => {
    // 20 campos de igual peso "esencial" — cada uno vale 5 puntos exactos.
    const campos = (n: number): CampoParaMadurez[] =>
      Array.from({ length: 20 }, (_, i) => ({ valor: i < n ? "x" : "", nivel: "esencial" }));

    expect(calcularMadurezIdentidad(campos(3)).etapa).toBe("semilla"); // 15%
    expect(calcularMadurezIdentidad(campos(4)).etapa).toBe("fundamentos"); // 20%
    expect(calcularMadurezIdentidad(campos(9)).etapa).toBe("fundamentos"); // 45%
    expect(calcularMadurezIdentidad(campos(10)).etapa).toBe("consistente"); // 50%
    expect(calcularMadurezIdentidad(campos(15)).etapa).toBe("consistente"); // 75%
    expect(calcularMadurezIdentidad(campos(16)).etapa).toBe("experta"); // 80%
    expect(calcularMadurezIdentidad(campos(20)).etapa).toBe("experta"); // 100%
  });

  it("acepta pesos personalizados para reutilizarse en otro contexto (ej. Personaje)", () => {
    const campos: CampoParaMadurez[] = [
      { valor: "algo", nivel: "esencial" },
      { valor: "", nivel: "recomendado" },
    ];
    const conPesosIguales = calcularMadurezIdentidad(campos, { esencial: 1, recomendado: 1, opcional: 1 });
    expect(conPesosIguales.porcentaje).toBe(50);
  });

  it("no revienta con una lista vacía de campos", () => {
    expect(calcularMadurezIdentidad([]).porcentaje).toBe(0);
  });
});

describe("estadoBloque", () => {
  it("Pendiente cuando nada está lleno", () => {
    expect(estadoBloque([{ valor: "", nivel: "esencial" }])).toBe("pendiente");
  });

  it("Completo cuando todo está lleno", () => {
    expect(estadoBloque([{ valor: "a", nivel: "esencial" }, { valor: "b", nivel: "opcional" }])).toBe("completo");
  });

  it("Parcial cuando hay una mezcla", () => {
    expect(estadoBloque([{ valor: "a", nivel: "esencial" }, { valor: "", nivel: "opcional" }])).toBe("parcial");
  });

  it("Pendiente para una lista vacía de campos", () => {
    expect(estadoBloque([])).toBe("pendiente");
  });
});
