import { describe, expect, it } from "vitest";
import { emocionSugeridaParaTipo, movimientoSugeridoParaPlano } from "./decision-engine";

describe("movimientoSugeridoParaPlano — Decision Engine, Nivel Automático", () => {
  it("devuelve una sugerencia para un Plano conocido, case/tilde-insensitive", () => {
    expect(movimientoSugeridoParaPlano("Primer plano")).toContain("Cámara fija");
    expect(movimientoSugeridoParaPlano("PRIMER PLANO")).toContain("Cámara fija");
    expect(movimientoSugeridoParaPlano("plano caminando")).toContain("Handheld");
  });

  it("devuelve null para un Plano que no está en la tabla — nunca inventa una genérica", () => {
    expect(movimientoSugeridoParaPlano("Plano inventado que no existe")).toBeNull();
  });
});

describe("emocionSugeridaParaTipo — Decision Engine, Nivel Sugerido", () => {
  it("devuelve una sugerencia para los tipos de escena cubiertos", () => {
    expect(emocionSugeridaParaTipo("GANCHO")).toBe("Curiosidad");
    expect(emocionSugeridaParaTipo("PROBLEMA")).toBe("Tensión");
    expect(emocionSugeridaParaTipo("CTA")).toBe("Urgencia");
  });

  it("devuelve null para tipos donde el patrón no aplica bien (B-roll, Transición, Otra)", () => {
    expect(emocionSugeridaParaTipo("BROLL")).toBeNull();
    expect(emocionSugeridaParaTipo("TRANSICION")).toBeNull();
    expect(emocionSugeridaParaTipo("OTRA")).toBeNull();
  });

  it("devuelve null para un tipo desconocido en vez de fallar", () => {
    expect(emocionSugeridaParaTipo("")).toBeNull();
  });
});
