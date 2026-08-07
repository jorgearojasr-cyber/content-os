import { describe, expect, it } from "vitest";
import {
  agruparPendientesCpp,
  construirRevisionCpp,
  faltanDecisionesCpp,
  type EscenaCppEnRevision,
} from "./creator-os-import-shared";
import type { EscenaCPP } from "./creator-os-package";
import { resolverCampo } from "./blueprint-import-shared";

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

  it("un nombre sin ninguna candidata en la Biblioteca queda pendiente (mismo motivo que Blueprint)", () => {
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
  });
});

describe("faltanDecisionesCpp", () => {
  it("true mientras quede un campo genuinamente pendiente", () => {
    const escenas: EscenaCppEnRevision[] = construirRevisionCpp(
      [escenaCpp({ locacion: "Estudio Nuevo" })],
      [],
      [],
      [],
    );
    expect(faltanDecisionesCpp(escenas)).toBe(true);
  });

  it("false una vez que todo está resuelto, auto-resuelto o decidido explícitamente", () => {
    const escenas: EscenaCppEnRevision[] = [
      {
        escena: escenaCpp(),
        personajes: [{ resuelto: true, id: "p1", nombre: "Ana" }],
        locacion: null,
        plano: null,
      },
    ];
    expect(faltanDecisionesCpp(escenas)).toBe(false);
  });
});

describe("agruparPendientesCpp — consolida el mismo nombre repetido en varias escenas", () => {
  it("el mismo Personaje pendiente en 2 escenas produce una sola tarjeta", () => {
    const escenas = construirRevisionCpp(
      [escenaCpp({ numero: 1, personajes: ["Don José"] }), escenaCpp({ numero: 2, personajes: ["Don José"] })],
      [],
      [],
      [],
    );
    const pendientes = agruparPendientesCpp(escenas);
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]).toMatchObject({ tipo: "personaje", ocurrencias: 2 });
  });

  it("excluye lo ya resuelto/auto-resuelto/decidido — coherente con el mismo criterio de Blueprint", () => {
    const yaDecidido = resolverCampo("Piso", []);
    if (yaDecidido.resuelto) throw new Error("unreachable");
    const escenas: EscenaCppEnRevision[] = [
      {
        escena: escenaCpp(),
        personajes: [],
        locacion: { resuelto: true, id: "l1", nombre: "Oficina" },
        plano: { ...yaDecidido, decision: null },
      },
    ];
    expect(agruparPendientesCpp(escenas)).toEqual([]);
  });
});
