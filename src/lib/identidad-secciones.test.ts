import { describe, expect, it } from "vitest";
import {
  estadoSeccion,
  madurezIdentidadCompleta,
  NIVELES_CAMPOS_IDENTIDAD,
  SECCIONES_IDENTIDAD,
} from "./identidad-secciones";
import type { Identidad } from "./types";

function identidadVacia(overrides: Partial<Identidad> = {}): Identidad {
  return {
    id: "id-1",
    proyectoId: "proyecto-1",
    voz: "",
    reglas: "",
    objetivo: "",
    historia: "",
    valores: "",
    audiencia: "",
    competidores: "",
    manualMarca: "",
    ctaHabituales: "",
    hashtagsFrecuentes: "",
    restricciones: "",
    promesa: "",
    posicionamiento: "",
    arquetipo: "",
    manifiesto: "",
    emociones: "",
    impactoEsperado: "",
    adaptacionAudiencia: "",
    formalidad: "",
    humor: "",
    nivelTecnico: "",
    palabrasSiempre: "",
    palabrasNunca: "",
    frasesCaracteristicas: "",
    estructuraContenidos: "",
    respuestaCriticas: "",
    diferenciadores: "",
    avatarJson: {},
    personajeNombre: "",
    personajePersonalidad: "",
    fisica: "",
    vestuario: "",
    vozDescrita: "",
    gestos: "",
    muletillas: "",
    fotosUrlsJson: [],
    paleta: "",
    tipografia: "",
    look: "",
    camara: "",
    ritmo: "",
    estructuraCta: "",
    logoUrl: "",
    sitioWeb: "",
    telefono: "",
    direccion: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("NIVELES_CAMPOS_IDENTIDAD", () => {
  it("clasifica los 34 campos de entrenamiento en exactamente 10 esenciales, 16 recomendados y 8 opcionales", () => {
    const niveles = Object.values(NIVELES_CAMPOS_IDENTIDAD);
    expect(niveles).toHaveLength(34);
    expect(niveles.filter((n) => n === "esencial")).toHaveLength(10);
    expect(niveles.filter((n) => n === "recomendado")).toHaveLength(16);
    expect(niveles.filter((n) => n === "opcional")).toHaveLength(8);
  });

  it("cubre exactamente los mismos campos que las 6 secciones (sin huérfanos de ningún lado)", () => {
    const camposDeSecciones = new Set(SECCIONES_IDENTIDAD.flatMap((s) => s.campos));
    const camposConNivel = new Set(Object.keys(NIVELES_CAMPOS_IDENTIDAD));
    expect(camposConNivel).toEqual(camposDeSecciones);
  });
});

describe("madurezIdentidadCompleta", () => {
  it("0% con una identidad completamente vacía", () => {
    expect(madurezIdentidadCompleta(identidadVacia()).porcentaje).toBe(0);
  });

  it("100% cuando los 34 campos de entrenamiento están llenos", () => {
    const llena = identidadVacia(
      Object.fromEntries(Object.keys(NIVELES_CAMPOS_IDENTIDAD).map((campo) => [campo, "algo"])),
    );
    expect(madurezIdentidadCompleta(llena).porcentaje).toBe(100);
  });

  it("llenar solo los 10 campos esenciales da más % que llenar solo los 8 opcionales", () => {
    const camposPorNivel = (nivel: string) =>
      Object.entries(NIVELES_CAMPOS_IDENTIDAD)
        .filter(([, n]) => n === nivel)
        .map(([campo]) => campo);

    const soloEsenciales = madurezIdentidadCompleta(
      identidadVacia(Object.fromEntries(camposPorNivel("esencial").map((c) => [c, "algo"]))),
    ).porcentaje;
    const soloOpcionales = madurezIdentidadCompleta(
      identidadVacia(Object.fromEntries(camposPorNivel("opcional").map((c) => [c, "algo"]))),
    ).porcentaje;
    expect(soloEsenciales).toBeGreaterThan(soloOpcionales);
  });
});

describe("estadoSeccion", () => {
  it("Pendiente cuando la sección no tiene nada guardado", () => {
    const seccion = SECCIONES_IDENTIDAD.find((s) => s.id === "esencia")!;
    expect(estadoSeccion(identidadVacia(), seccion)).toBe("pendiente");
  });

  it("Completo cuando todos los campos de la sección están llenos", () => {
    const seccion = SECCIONES_IDENTIDAD.find((s) => s.id === "limites")!;
    const llena = identidadVacia({ restricciones: "x", competidores: "x", diferenciadores: "x" });
    expect(estadoSeccion(llena, seccion)).toBe("completo");
  });

  it("Parcial cuando solo algunos campos de la sección están llenos", () => {
    const seccion = SECCIONES_IDENTIDAD.find((s) => s.id === "limites")!;
    const parcial = identidadVacia({ restricciones: "x" });
    expect(estadoSeccion(parcial, seccion)).toBe("parcial");
  });
});
