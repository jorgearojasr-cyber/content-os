import { describe, expect, it } from "vitest";
import { construirRevisionCpp } from "./creator-os-import-shared";
import type { EscenaCPP } from "./creator-os-package";

function escenaCpp(overrides: Partial<EscenaCPP> = {}): EscenaCPP {
  return {
    numero: 1,
    tipo: "gancho",
    objetivoNarrativo: "Objetivo de prueba",
    ...overrides,
  };
}

describe("construirRevisionCpp — adapta EscenaCPP al motor de resolución existente", () => {
  it("resuelve personajes/locación/plano contra los disponibles reales, igual que Blueprint", () => {
    const escenas = [
      escenaCpp({ personajes: ["Ana"], locacion: "Oficina", plano: "Primer plano" }),
    ];
    const revision = construirRevisionCpp(
      escenas,
      [{ id: "p1", nombre: "Ana" }],
      [{ id: "l1", nombre: "Oficina" }],
      [{ id: "pl1", nombre: "Primer plano" }],
    );
    expect(revision).toHaveLength(1);
    expect(revision[0].personajes[0]).toEqual({ resuelto: true, id: "p1", nombre: "Ana" });
    expect(revision[0].locacion).toEqual({ resuelto: true, id: "l1", nombre: "Oficina" });
    expect(revision[0].plano).toEqual({ resuelto: true, id: "pl1", nombre: "Primer plano" });
  });

  it("deja locación/plano en null cuando la escena no los declara — nunca fuerza una decisión sobre un campo ausente", () => {
    const revision = construirRevisionCpp([escenaCpp({ personajes: [] })], [], [], []);
    expect(revision[0].locacion).toBeNull();
    expect(revision[0].plano).toBeNull();
    expect(revision[0].personajes).toEqual([]);
  });

  it("un nombre sin ninguna candidata en la Biblioteca queda sin vincular — nunca bloquea (SPRING_REFACTOR_1)", () => {
    const revision = construirRevisionCpp(
      [escenaCpp({ personajes: ["Alguien Nuevo"] })],
      [],
      [],
      [],
    );
    const campo = revision[0].personajes[0];
    expect(campo.resuelto).toBe(false);
    if (campo.resuelto) throw new Error("unreachable");
    expect(campo.decision).toBeUndefined();
    expect(campo.nombre).toBe("Alguien Nuevo");
  });
});
