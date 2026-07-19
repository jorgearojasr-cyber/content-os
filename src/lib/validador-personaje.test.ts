import { describe, expect, it } from "vitest";
import { evaluarConsistenciaPersonaje } from "./validador-personaje";
import type { Bloque, Personaje } from "./types";

function bloqueBase(overrides: Partial<Bloque> = {}): Bloque {
  return {
    id: "b-1",
    proyectoId: "proyecto-1",
    personajeId: null,
    personajeIdsJson: null,
    titulo: "Pieza",
    formato: "Video Corto",
    texto: "",
    identidadCompilada: "",
    estado: "activo",
    eliminadoAt: "",
    escenasJson: null,
    planEdicionJson: null,
    linkPublicacion: null,
    instagramEmbedHtml: null,
    fechaPlanificada: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function personajeBase(overrides: Partial<Personaje> = {}): Personaje {
  return {
    id: "p-1",
    proyectoId: "proyecto-1",
    fotosUrlsJson: [],
    ...overrides,
  } as unknown as Personaje;
}

describe("evaluarConsistenciaPersonaje", () => {
  it("los 3 chequeos fallan cuando la pieza no usó este Personaje", () => {
    const bloque = bloqueBase({ personajeId: "otro-personaje" });
    const personaje = personajeBase({ id: "p-1", fotosUrlsJson: [{ url: "x", tipo: "rostro" }] });
    const r = evaluarConsistenciaPersonaje(bloque, personaje);
    expect(r.usoPersonaje.ok).toBe(false);
    expect(r.exportoConPersonaje.ok).toBe(false);
    expect(r.incluyeFotos.ok).toBe(false);
  });

  it("uso y exportación OK cuando personajeId coincide, pero fotos falla si el Personaje no tiene fotos", () => {
    const bloque = bloqueBase({ personajeId: "p-1" });
    const personaje = personajeBase({ id: "p-1", fotosUrlsJson: [] });
    const r = evaluarConsistenciaPersonaje(bloque, personaje);
    expect(r.usoPersonaje.ok).toBe(true);
    expect(r.exportoConPersonaje.ok).toBe(true);
    expect(r.incluyeFotos.ok).toBe(false);
  });

  it("los 3 chequeos pasan cuando el personaje aparece en personajeIdsJson (2+ Personajes) y tiene fotos", () => {
    const bloque = bloqueBase({ personajeId: "otro", personajeIdsJson: ["otro", "p-1"] });
    const personaje = personajeBase({ id: "p-1", fotosUrlsJson: [{ url: "x", tipo: "rostro" }] });
    const r = evaluarConsistenciaPersonaje(bloque, personaje);
    expect(r.usoPersonaje.ok).toBe(true);
    expect(r.exportoConPersonaje.ok).toBe(true);
    expect(r.incluyeFotos.ok).toBe(true);
  });
});
