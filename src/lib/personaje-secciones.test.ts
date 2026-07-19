import { describe, expect, it } from "vitest";
import {
  estadoSeccionPersonaje,
  madurezPersonajeCompleta,
  NIVELES_CAMPOS_PERSONAJE,
  SECCIONES_PERSONAJE,
} from "./personaje-secciones";
import type { Personaje } from "./types";

function personajeVacio(overrides: Partial<Personaje> = {}): Personaje {
  const base = {
    id: "p-1",
    proyectoId: "proyecto-1",
    nombre: "",
    personalidad: "",
    fisica: "",
    vestuario: "",
    vozDescrita: "",
    gestos: "",
    muletillas: "",
    historia: "",
    edad: "",
    profesion: "",
    contexto: "",
    promptMaestro: "",
    promptImagen: "",
    promptVideo: "",
    promptVoz: "",
    notas: "",
    versionesJson: [],
    fotosUrlsJson: [],
    fotosContextoJson: [],
    createdAt: new Date().toISOString(),
  } as unknown as Personaje;
  for (const campo of Object.keys(NIVELES_CAMPOS_PERSONAJE) as (keyof Personaje)[]) {
    (base as Record<string, string>)[campo] = "";
  }
  return { ...base, ...overrides };
}

describe("NIVELES_CAMPOS_PERSONAJE", () => {
  it("cubre exactamente los mismos campos que las 7 secciones", () => {
    const camposDeSecciones = new Set(SECCIONES_PERSONAJE.flatMap((s) => s.campos));
    const camposConNivel = new Set(Object.keys(NIVELES_CAMPOS_PERSONAJE));
    expect(camposConNivel).toEqual(camposDeSecciones);
  });

  it("tiene al menos un campo Esencial (elementosInvariables) por sección de mayor peso", () => {
    const niveles = Object.values(NIVELES_CAMPOS_PERSONAJE);
    expect(niveles.filter((n) => n === "esencial").length).toBeGreaterThan(0);
    expect(NIVELES_CAMPOS_PERSONAJE.elementosInvariables).toBe("esencial");
  });
});

describe("madurezPersonajeCompleta", () => {
  it("0% con un personaje totalmente vacío", () => {
    expect(madurezPersonajeCompleta(personajeVacio()).porcentaje).toBe(0);
  });

  it("100% cuando todos los campos de las 7 secciones están llenos", () => {
    const llena = personajeVacio(
      Object.fromEntries(Object.keys(NIVELES_CAMPOS_PERSONAJE).map((campo) => [campo, "algo"])),
    );
    expect(madurezPersonajeCompleta(llena).porcentaje).toBe(100);
  });
});

describe("estadoSeccionPersonaje", () => {
  it("Pendiente cuando la sección de Invariables no tiene nada", () => {
    const seccion = SECCIONES_PERSONAJE.find((s) => s.id === "invariables")!;
    expect(estadoSeccionPersonaje(personajeVacio(), seccion)).toBe("pendiente");
  });

  it("Completo cuando la sección de Invariables tiene su único campo lleno", () => {
    const seccion = SECCIONES_PERSONAJE.find((s) => s.id === "invariables")!;
    const p = personajeVacio({ elementosInvariables: "casco amarillo" });
    expect(estadoSeccionPersonaje(p, seccion)).toBe("completo");
  });
});
