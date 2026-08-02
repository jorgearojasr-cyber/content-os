import { describe, expect, it } from "vitest";
import { estimarDuracionSegundos } from "./estimacion-duracion";

describe("estimarDuracionSegundos — Fix 2 (post UX-MIGRATION-4)", () => {
  it("sin texto hablado, aplica el piso absoluto de 2s", () => {
    expect(estimarDuracionSegundos("", "OTRA")).toBe(2);
    expect(estimarDuracionSegundos("   ", "OTRA")).toBe(2);
  });

  it("B-roll sin texto hablado tiene su propio mínimo de 3s, más alto que el piso general", () => {
    expect(estimarDuracionSegundos("", "BROLL")).toBe(3);
  });

  it("B-roll CON texto hablado corto no aplica el mínimo de 3s — solo cae al piso general de 2s", () => {
    expect(estimarDuracionSegundos("Ok.", "BROLL")).toBe(2);
  });

  it("150 palabras y una sola pausa duran exactamente 60s (sin bonus de pausa, la primera no cuenta)", () => {
    const texto = `${Array(150).fill("palabra").join(" ")}.`;
    expect(estimarDuracionSegundos(texto, "OTRA")).toBe(60);
  });

  it("cada pausa adicional después de la primera suma 0.3s", () => {
    // 20 palabras, 3 signos de puntuación -> base 8s + (3-1)*0.3 = 8.6 -> redondea a 9
    const texto = `${Array(6).fill("palabra").join(" ")}. ${Array(6).fill("palabra").join(" ")}! ${Array(8).fill("palabra").join(" ")}?`;
    expect(estimarDuracionSegundos(texto, "OTRA")).toBe(9);
  });

  it("Gancho suma 1s sobre la base", () => {
    const texto = Array(10).fill("palabra").join(" "); // base = 10/150*60 = 4s
    expect(estimarDuracionSegundos(texto, "GANCHO")).toBe(5);
  });

  it("CTA suma 2s sobre la base", () => {
    const texto = Array(5).fill("palabra").join(" "); // base = 5/150*60 = 2s
    expect(estimarDuracionSegundos(texto, "CTA")).toBe(4);
  });

  it("nunca baja del piso absoluto de 2s aunque la base + bonus sea menor", () => {
    // texto vacío + Gancho: base 0 + 1 = 1, pero el piso lo sube a 2
    expect(estimarDuracionSegundos("", "GANCHO")).toBe(2);
  });

  it("redondea al segundo entero", () => {
    // 7 palabras -> base = 7/150*60 = 2.8 -> redondea a 3
    const texto = Array(7).fill("palabra").join(" ");
    expect(estimarDuracionSegundos(texto, "OTRA")).toBe(3);
  });
});
