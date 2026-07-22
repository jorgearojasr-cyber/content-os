import { describe, expect, it } from "vitest";
import {
  defaultsPorFormato,
  generarEsqueletoPlan,
  parsearPasosEstructura,
  personajeSugeridoPorIdea,
} from "./asistente-crear";
import type { MotorIA, Personaje } from "./types";

function personajeBase(overrides: Partial<Personaje> = {}): Personaje {
  return {
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
    rolEcosistema: "",
    lugarOrigen: "",
    relacionOtrosPersonajes: "",
    temperamento: "",
    nivelEnergia: "",
    formaEnsenar: "",
    formaResponder: "",
    emocionesTransmite: "",
    defectos: "",
    fortalezas: "",
    valores: "",
    queNuncaHaria: "",
    acento: "",
    velocidad: "",
    tono: "",
    volumen: "",
    palabrasFavoritas: "",
    palabrasProhibidas: "",
    formalidad: "",
    humor: "",
    nivelTecnico: "",
    altura: "",
    complexion: "",
    edadAparente: "",
    colorPiel: "",
    cabello: "",
    barba: "",
    ojos: "",
    expresionesHabituales: "",
    postura: "",
    accesorios: "",
    gestoManos: "",
    gestoMirada: "",
    gestoSonrisa: "",
    gestoSenalar: "",
    formaCaminar: "",
    formaPararse: "",
    formaInteractuar: "",
    herramientasQueUsa: "",
    materialesQueMuestra: "",
    ambientesProhibidos: "",
    elementosInvariables: "",
    fotosContextoJson: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function motorBase(overrides: Partial<MotorIA> = {}): MotorIA {
  return {
    id: "m-1",
    proyectoId: null,
    nombre: "Educativo",
    descripcion: "",
    objetivo: "",
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

describe("personajeSugeridoPorIdea", () => {
  it("sugiere el Personaje cuyo rol/historia coincide con la idea", () => {
    const donJose = personajeBase({
      id: "don-jose",
      nombre: "Don José",
      rolEcosistema: "Educador principal",
      historia: "Maestro con 30 años de experiencia en construcción y albañilería",
    });
    const sugerido = personajeSugeridoPorIdea([donJose], [], "errores comunes en construcción");
    expect(sugerido?.personaje.id).toBe("don-jose");
    expect(sugerido?.score).toBeGreaterThan(0);
  });

  it("no sugiere nada si ningún Personaje coincide (cae a Ninguno)", () => {
    const donJose = personajeBase({ nombre: "Don José", historia: "Maestro de construcción" });
    expect(personajeSugeridoPorIdea([donJose], [], "receta de cocina para principiantes")).toBeNull();
  });

  it("no sugiere nada sin Personajes disponibles", () => {
    expect(personajeSugeridoPorIdea([], [], "cualquier idea con palabras largas")).toBeNull();
  });

  it("no sugiere nada si la idea no tiene palabras clave reales", () => {
    const donJose = personajeBase({ nombre: "Don José" });
    expect(personajeSugeridoPorIdea([donJose], [], "eso")).toBeNull();
  });
});

describe("defaultsPorFormato", () => {
  it("Video Corto: duración y escenas por defecto, tipoProduccion automático", () => {
    const d = defaultsPorFormato("Video Corto");
    expect(d.duracion).toBe("30s");
    expect(d.numeroEscenas).toBe("5");
    expect(d.tipoProduccion).toBe("IA decide automáticamente");
  });

  it("Carrusel: número de páginas por defecto", () => {
    expect(defaultsPorFormato("Carrusel").numeroPaginas).toBe("7");
  });

  it("Imagen: estilo por defecto", () => {
    expect(defaultsPorFormato("Imagen").estiloImagen).toBe("Fotografía realista");
  });

  it("Historia: sin duración/escenas propias (no tiene Paso 4)", () => {
    const d = defaultsPorFormato("Historia");
    expect(d.duracion).toBe("");
    expect(d.numeroEscenas).toBe("");
  });
});

describe("parsearPasosEstructura", () => {
  it("divide una estructura numerada en pasos individuales", () => {
    const pasos = parsearPasosEstructura(
      "1) Nombra el error tal como se ve. 2) Por qué pasa. 3) La consecuencia concreta. 4) Cómo hacerlo bien.",
    );
    expect(pasos).toEqual([
      "Nombra el error tal como se ve",
      "Por qué pasa",
      "La consecuencia concreta",
      "Cómo hacerlo bien",
    ]);
  });

  it("texto vacío da un arreglo vacío", () => {
    expect(parsearPasosEstructura("")).toEqual([]);
  });
});

describe("generarEsqueletoPlan", () => {
  it("Video Corto sin Motor: gancho + desarrollo genérico + CTA, según numeroEscenas", () => {
    const plan = generarEsqueletoPlan("Video Corto", { numeroEscenas: "5", numeroPaginas: "" }, null);
    expect(plan.escenas).toHaveLength(5);
    expect(plan.escenas[0].rol).toBe("Gancho inicial");
    expect(plan.escenas[4].rol).toBe("CTA / Cierre");
    expect(plan.escenas[1].rol).toBe("Desarrollo — parte 1");
    expect(plan.extras).toEqual(["Copy", "Hashtags", "CTA", "Miniatura"]);
  });

  it("Video Corto con Motor: usa los pasos reales de estructuraNarrativa en el medio", () => {
    const motor = motorBase({
      estructuraNarrativa: "1) Nombra el error. 2) Por qué pasa. 3) La consecuencia.",
    });
    const plan = generarEsqueletoPlan("Video Corto", { numeroEscenas: "5", numeroPaginas: "" }, motor);
    expect(plan.escenas.map((e) => e.rol)).toEqual([
      "Gancho inicial",
      "Nombra el error",
      "Por qué pasa",
      "La consecuencia",
      "CTA / Cierre",
    ]);
  });

  it("Imagen: una sola escena, sin Miniatura en extras", () => {
    const plan = generarEsqueletoPlan("Imagen", { numeroEscenas: "", numeroPaginas: "" }, null);
    expect(plan.escenas).toEqual([{ numero: 1, rol: "Contenido" }]);
    expect(plan.extras).toEqual(["Copy", "Hashtags", "CTA"]);
  });

  it("Historia: una sola escena, sin Miniatura", () => {
    const plan = generarEsqueletoPlan("Historia", { numeroEscenas: "", numeroPaginas: "" }, null);
    expect(plan.escenas).toHaveLength(1);
    expect(plan.extras).not.toContain("Miniatura");
  });

  it("Carrusel: usa numeroPaginas, con Miniatura en extras", () => {
    const plan = generarEsqueletoPlan("Carrusel", { numeroEscenas: "", numeroPaginas: "7" }, null);
    expect(plan.escenas).toHaveLength(7);
    expect(plan.extras).toContain("Miniatura");
  });
});
