import { describe, expect, it } from "vitest";
import { promptImagenSugerido, promptVideoSugerido } from "./escena-prompt-compiler";
import type { Activo, Personaje, Plano, StoryboardEscenaConPersonajes } from "./types";

function personajeVacio(overrides: Partial<Personaje> = {}): Personaje {
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

function escenaVacia(overrides: Partial<StoryboardEscenaConPersonajes> = {}): StoryboardEscenaConPersonajes {
  return {
    id: "e-1",
    proyectoId: "proyecto-1",
    produccionId: "produccion-1",
    numero: 1,
    orden: 1,
    duracionSegundos: 0,
    tipoEscena: "GANCHO",
    objetivoNarrativo: "",
    emocion: "",
    valorEspectador: "",
    locacionId: null,
    planoId: null,
    movimientoCamara: "",
    accion: "",
    textoHablado: "",
    textoPantalla: "",
    recursosNecesarios: "",
    promptIa: "",
    promptVideoIa: "",
    musica: "",
    transicion: "",
    estadoProduccion: "BORRADOR",
    notas: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    personajeIds: [],
    ...overrides,
  };
}

const planoDetalle: Plano = {
  id: "plano-1",
  nombre: "Plano detalle",
  descripcion: "",
  cuandoUsarlo: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const locacionConFoto: Activo = {
  id: "loc-1",
  proyectoId: "proyecto-1",
  tipo: "foto",
  nombre: "Mesón de la panadería",
  valor: "https://blob.example/meson.png",
  notas: "",
  etiquetas: "",
  createdAt: new Date().toISOString(),
};

describe("promptImagenSugerido", () => {
  it("con todo vacío, no inventa nada — devuelve cadena vacía", () => {
    expect(promptImagenSugerido({ escena: escenaVacia(), personajes: [], plano: undefined, locacion: undefined, formato: "" })).toBe("");
  });

  it("combina personaje, plano, locación y contenido de la escena", () => {
    const personaje = personajeVacio({ nombre: "Panadera", fisica: "mujer de 40 años" });
    const escena = escenaVacia({ objetivoNarrativo: "Mostrar el pan recién horneado", emocion: "Orgullo" });
    const prompt = promptImagenSugerido({
      escena,
      personajes: [personaje],
      plano: planoDetalle,
      locacion: locacionConFoto,
      formato: "Reel Instagram",
    });
    expect(prompt).toContain("Panadera");
    expect(prompt).toContain("Plano: Plano detalle");
    expect(prompt).toContain("Mesón de la panadería");
    expect(prompt).toContain("https://blob.example/meson.png");
    expect(prompt).toContain("Qué pasa en la escena: Mostrar el pan recién horneado");
    expect(prompt).toContain("Emoción: Orgullo");
    expect(prompt).toContain("Relación de aspecto: 9:16 (vertical).");
  });

  it("sin foto en la Locación, la describe por nombre en vez de omitirla", () => {
    const sinFoto: Activo = { ...locacionConFoto, valor: "" };
    const prompt = promptImagenSugerido({
      escena: escenaVacia(),
      personajes: [],
      plano: undefined,
      locacion: sinFoto,
      formato: "",
    });
    expect(prompt).toBe("Locación: Mesón de la panadería");
  });

  it("numera cada personaje cuando hay más de uno", () => {
    const p1 = personajeVacio({ id: "p-1", nombre: "Panadera" });
    const p2 = personajeVacio({ id: "p-2", nombre: "Cliente" });
    const prompt = promptImagenSugerido({
      escena: escenaVacia(),
      personajes: [p1, p2],
      plano: undefined,
      locacion: undefined,
      formato: "",
    });
    expect(prompt).toContain("Personaje 1:");
    expect(prompt).toContain("Personaje 2:");
  });

  it("un formato sin relación de aspecto conocida no inventa una", () => {
    const prompt = promptImagenSugerido({
      escena: escenaVacia({ objetivoNarrativo: "algo" }),
      personajes: [],
      plano: undefined,
      locacion: undefined,
      formato: "Nota manual",
    });
    expect(prompt).not.toContain("Relación de aspecto");
  });
});

describe("promptVideoSugerido", () => {
  it("prefiere el movimientoCamara ya guardado en la escena sobre la heurística de Plano", () => {
    const escena = escenaVacia({ movimientoCamara: "Paneo lento hacia la izquierda" });
    const prompt = promptVideoSugerido({ escena, personajes: [], plano: planoDetalle, locacion: undefined, formato: "" });
    expect(prompt).toContain("Movimiento de cámara: Paneo lento hacia la izquierda");
  });

  it("sin movimientoCamara guardado, recurre a movimientoSugeridoParaPlano", () => {
    const prompt = promptVideoSugerido({
      escena: escenaVacia(),
      personajes: [],
      plano: planoDetalle,
      locacion: undefined,
      formato: "",
    });
    expect(prompt).toContain("Movimiento de cámara: Cámara fija o zoom lento");
  });

  it("incluye la duración cuando está estimada", () => {
    const prompt = promptVideoSugerido({
      escena: escenaVacia({ duracionSegundos: 12 }),
      personajes: [],
      plano: undefined,
      locacion: undefined,
      formato: "",
    });
    expect(prompt).toContain("Duración aproximada: 12 segundos");
  });

  it("sin duración estimada, no inventa una", () => {
    const prompt = promptVideoSugerido({
      escena: escenaVacia({ objetivoNarrativo: "algo" }),
      personajes: [],
      plano: undefined,
      locacion: undefined,
      formato: "",
    });
    expect(prompt).not.toContain("Duración aproximada");
  });
});
