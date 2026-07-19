import { describe, expect, it } from "vitest";
import {
  bloqueEstrategiaNarrativa,
  construirVariablesMotor,
  detectarMotoresSugeridos,
  reemplazarVariablesMotor,
} from "./motor-ia";
import type { Identidad, MotorIA } from "./types";

function motorBase(overrides: Partial<MotorIA> = {}): MotorIA {
  return {
    id: "m-1",
    proyectoId: null,
    nombre: "Educativo",
    descripcion: "Explica un concepto paso a paso.",
    objetivo: "Enseñar",
    cuandoUsar: "",
    cuandoNoUsar: "",
    tipoContenidoRecomendado: "",
    palabrasClave: "",
    prioridad: 3,
    estructuraNarrativa: "",
    variablesUtilizadas: "",
    promptMaestro: "",
    ejemplo: "",
    notasInternas: "",
    estado: "activo",
    categoria: "Educativo",
    version: 1,
    origen: "sistema",
    motorOriginalId: null,
    vecesUsado: 0,
    ultimoUsoAt: null,
    proyectosUsadosJson: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("detectarMotoresSugeridos", () => {
  it("sugiere el Motor Educativo para una idea sobre humedad por capilaridad", () => {
    const educativo = motorBase({
      id: "educativo",
      nombre: "Educativo",
      palabrasClave: "qué es, cómo funciona, por qué, explicar, humedad",
    });
    const venta = motorBase({
      id: "venta",
      nombre: "Venta",
      palabrasClave: "oferta, descuento, cotiza, compra ahora",
    });
    const sugeridos = detectarMotoresSugeridos("qué es la humedad por capilaridad", [educativo, venta]);
    expect(sugeridos).toHaveLength(1);
    expect(sugeridos[0].motor.id).toBe("educativo");
    expect(sugeridos[0].porcentaje).toBeGreaterThan(0);
  });

  it("no sugiere nada si la idea está vacía", () => {
    expect(detectarMotoresSugeridos("", [motorBase()])).toEqual([]);
  });

  it("no sugiere un Motor sin ninguna palabra clave coincidente", () => {
    const motor = motorBase({ palabrasClave: "receta, cocina, ingredientes" });
    expect(detectarMotoresSugeridos("cómo construir un muro", [motor])).toEqual([]);
  });

  it("ordena por % de coincidencia y desempata por prioridad", () => {
    const bajaCobertura = motorBase({ id: "a", palabrasClave: "casa, muro, obra, techo, piso", prioridad: 5 });
    const altaCobertura = motorBase({ id: "b", palabrasClave: "casa", prioridad: 1 });
    const sugeridos = detectarMotoresSugeridos("una casa nueva", [bajaCobertura, altaCobertura]);
    expect(sugeridos[0].motor.id).toBe("b");
  });
});

describe("construirVariablesMotor y reemplazarVariablesMotor", () => {
  it("resuelve las variables desde Identidad y el contexto de Crear", () => {
    const identidad = { audiencia: "dueños de casa", voz: "cercana", objetivo: "educar" } as Identidad;
    const variables = construirVariablesMotor({
      idea: "cómo evitar la humedad",
      identidad,
      identidadCompilada: "## Marca\n...",
      formato: "Video Corto",
      plataforma: "Instagram",
      proyectoNombre: "OBRABIEN",
    });
    expect(variables.IDEA).toBe("cómo evitar la humedad");
    expect(variables.AUDIENCIA).toBe("dueños de casa");
    expect(variables.MARCA).toBe("OBRABIEN");
    expect(variables.FORMATO).toBe("Video Corto");
  });

  it("AUDIENCIA toma solo el primer público y recorta el 'dirigido a' inicial, en vez del bloque crudo completo", () => {
    const identidad = {
      audiencia:
        "ObraBien está dirigido a propietarios que desean construir, remodelar o mantener su vivienda; " +
        "personas que no tienen experiencia en construcción pero quieren aprender antes de invertir; " +
        "maestros y contratistas que buscan mejorar sus conocimientos y reputación.",
    } as Identidad;
    const variables = construirVariablesMotor({
      idea: "",
      identidad,
      identidadCompilada: "",
      formato: "Video Corto",
    });
    expect(variables.AUDIENCIA).toBe("propietarios que desean construir, remodelar o mantener su vivienda");
  });

  it("CTA toma solo el primer ejemplo separado por línea en blanco, en vez de la lista completa", () => {
    const identidad = {
      ctaHabituales:
        "Guarda esta publicación para cuando la necesites.\r\n\r\n" +
        "Compártela con alguien que esté construyendo.\r\n\r\n" +
        "Síguenos para aprender más sobre construcción.",
    } as Identidad;
    const variables = construirVariablesMotor({
      idea: "",
      identidad,
      identidadCompilada: "",
      formato: "Video Corto",
    });
    expect(variables.CTA).toBe("Guarda esta publicación para cuando la necesites");
  });

  it("OBJETIVO toma solo el primer ítem separado por ';', en vez del bloque crudo completo", () => {
    const identidad = {
      objetivo:
        "Educar a propietarios, maestros, contratistas y empresas mediante contenido práctico y confiable; " +
        "construir una comunidad referente de la construcción; " +
        "posicionar a ObraBien como la fuente más confiable de conocimiento del rubro.",
    } as Identidad;
    const variables = construirVariablesMotor({
      idea: "",
      identidad,
      identidadCompilada: "",
      formato: "Video Corto",
    });
    expect(variables.OBJETIVO).toBe(
      "Educar a propietarios, maestros, contratistas y empresas mediante contenido práctico y confiable",
    );
  });

  it("reemplaza {{VARIABLES}} conocidas y deja vacías las no resueltas", () => {
    const texto = reemplazarVariablesMotor(
      "Habla sobre {{IDEA}} para {{AUDIENCIA}}, usando {{DESCONOCIDA}}.",
      { IDEA: "humedad", AUDIENCIA: "dueños de casa" },
    );
    expect(texto).toBe("Habla sobre humedad para dueños de casa, usando .");
  });
});

describe("bloqueEstrategiaNarrativa", () => {
  it('""  cuando no hay Motor seleccionado', () => {
    expect(bloqueEstrategiaNarrativa(null, {})).toBe("");
  });

  it("incluye el nombre del Motor y el promptMaestro resuelto", () => {
    const motor = motorBase({ nombre: "Educativo", promptMaestro: "Explica {{IDEA}} paso a paso." });
    const bloque = bloqueEstrategiaNarrativa(motor, { IDEA: "la humedad" });
    expect(bloque).toContain("## Estrategia narrativa: Educativo");
    expect(bloque).toContain("Explica la humedad paso a paso.");
  });

  it("cae a la descripción si el promptMaestro queda vacío tras resolver variables", () => {
    const motor = motorBase({ promptMaestro: "", descripcion: "Explica un concepto paso a paso." });
    const bloque = bloqueEstrategiaNarrativa(motor, {});
    expect(bloque).toContain("Explica un concepto paso a paso.");
  });
});
