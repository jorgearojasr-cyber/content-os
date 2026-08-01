import { describe, expect, it } from "vitest";
import { normalizarTexto, similitudTexto, UMBRAL_SUGERENCIA_FUERTE, UMBRAL_SUGERENCIA_MINIMA } from "./similitud";

describe("normalizarTexto", () => {
  it("pasa a minúsculas", () => {
    expect(normalizarTexto("PRESENTADOR")).toBe("presentador");
  });

  it("quita tildes", () => {
    expect(normalizarTexto("López")).toBe("lopez");
    expect(normalizarTexto("Oficina Técnica")).toBe("oficina tecnica");
  });

  it("recorta espacios en los extremos", () => {
    expect(normalizarTexto("  Jorge  ")).toBe("jorge");
  });
});

describe("similitudTexto", () => {
  it("es 1 para strings idénticos", () => {
    expect(similitudTexto("Jorge Rojas", "Jorge Rojas")).toBe(1);
  });

  it("es 1 ignorando mayúsculas y tildes", () => {
    expect(similitudTexto("jorge rojas", "JORGE ROJAS")).toBe(1);
    expect(similitudTexto("López", "LOPEZ")).toBe(1);
  });

  it("detecta un nombre parecido con una letra distinta como sugerencia fuerte", () => {
    const s = similitudTexto("Jorge Rojas", "Jorge Rojaz");
    expect(s).toBeGreaterThanOrEqual(UMBRAL_SUGERENCIA_FUERTE);
    expect(s).toBeLessThan(1);
  });

  it("es 0 para strings completamente distintos del mismo largo", () => {
    expect(similitudTexto("abc", "xyz")).toBe(0);
  });

  it("cae por debajo del umbral mínimo para nombres sin relación real", () => {
    expect(similitudTexto("Presentador", "Taller")).toBeLessThan(UMBRAL_SUGERENCIA_MINIMA);
  });

  it("es simétrica", () => {
    expect(similitudTexto("Oficina", "Ofisina")).toBe(similitudTexto("Ofisina", "Oficina"));
  });

  it("es 1 para dos strings vacíos", () => {
    expect(similitudTexto("", "")).toBe(1);
  });
});
