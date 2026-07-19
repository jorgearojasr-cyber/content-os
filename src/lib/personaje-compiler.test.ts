import { describe, expect, it } from "vitest";
import { compilarPersonaje } from "./personaje-compiler";
import type { Identidad, Personaje } from "./types";

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

describe("compilarPersonaje", () => {
  it("con un personaje totalmente vacío, los 8 prompts son cadenas vacías o casi vacías", () => {
    const prompts = compilarPersonaje(personajeVacio());
    expect(prompts.maestro).toBe("Personaje: sin nombre.");
    expect(prompts.imagen).toBe("Personaje: sin nombre.");
    expect(prompts.voz).toBe("Personaje: sin nombre.");
  });

  it("los Elementos Invariables aparecen PRIMERO en Prompt Maestro, Imagen y Video", () => {
    const p = personajeVacio({
      nombre: "Don José",
      elementosInvariables: "siempre con casco amarillo, nunca sin lentes de seguridad",
      fisica: "hombre robusto de 58 años",
      gestos: "gesticula mucho con las manos",
    });
    const prompts = compilarPersonaje(p);
    for (const texto of [prompts.maestro, prompts.imagen, prompts.video]) {
      const idxInvariables = texto.indexOf("ELEMENTOS INVARIABLES");
      expect(idxInvariables).toBeGreaterThan(-1);
      // La línea de invariables es la segunda línea (después del encabezado
      // "Personaje: X."), es decir, va antes que cualquier otro campo.
      const lineas = texto.split("\n");
      expect(lineas[1]).toContain("ELEMENTOS INVARIABLES");
      expect(lineas[1]).toContain("casco amarillo");
    }
  });

  it("un override manual de promptMaestro se usa TAL CUAL, sin generar uno nuevo", () => {
    const p = personajeVacio({
      nombre: "Don José",
      personalidad: "cercano y paciente",
      promptMaestro: "Eres Don José, maestro chileno de 58 años.",
    });
    const prompts = compilarPersonaje(p);
    expect(prompts.maestro).toBe("Eres Don José, maestro chileno de 58 años.");
    expect(prompts.maestro).not.toContain("cercano y paciente");
  });

  it("sin override manual, el Prompt Maestro se genera desde los campos granulares", () => {
    const p = personajeVacio({
      nombre: "Don José",
      personalidad: "cercano y paciente",
      rolEcosistema: "Educador principal",
    });
    const prompts = compilarPersonaje(p);
    expect(prompts.maestro).toContain("Personalidad: cercano y paciente");
    expect(prompts.maestro).toContain("Rol en el ecosistema: Educador principal");
  });

  it("Prompt Video se genera desde los campos de Gestos, no desde Apariencia", () => {
    const p = personajeVacio({
      nombre: "Don José",
      gestoManos: "mueve mucho las manos al explicar",
      altura: "1.75m",
    });
    const prompts = compilarPersonaje(p);
    expect(prompts.video).toContain("Cómo mueve las manos: mueve mucho las manos al explicar");
    expect(prompts.video).not.toContain("Altura");
  });

  it("Prompt Voz resuelve formalidad/humor/nivelTecnico heredados de Identidad cuando el Personaje los deja vacíos", () => {
    const identidad = { formalidad: "Cercano pero profesional", humor: "Humor cotidiano y cercano", nivelTecnico: "Simple" } as Identidad;
    const p = personajeVacio({ nombre: "Don José" });
    const prompts = compilarPersonaje(p, { identidad });
    expect(prompts.voz).toContain("Formalidad: Cercano pero profesional");
    expect(prompts.voz).toContain("Humor: Humor cotidiano y cercano");
  });

  it("Prompt Voz usa el valor PROPIO del Personaje cuando lo definió, ignorando el de Identidad", () => {
    const identidad = { formalidad: "Formal" } as Identidad;
    const p = personajeVacio({ nombre: "Don José", formalidad: "Muy cercano (tuteo, coloquial)" });
    const prompts = compilarPersonaje(p, { identidad });
    expect(prompts.voz).toContain("Formalidad: Muy cercano (tuteo, coloquial)");
    expect(prompts.voz).not.toContain("Formal\n");
  });

  it("Prompt Imagen menciona las fotos de referencia cuando se le pasan", () => {
    const p = personajeVacio({ nombre: "Don José" });
    const prompts = compilarPersonaje(p, { fotos: [{ url: "https://x/rostro.jpg", tipo: "rostro" }] });
    expect(prompts.imagen).toContain("Usa las 1 foto de referencia real");
  });

  it("Prompt Storytelling y Prompt Narración son campos distintos, sin mezclar apariencia", () => {
    const p = personajeVacio({
      nombre: "Don José",
      historia: "empezó como ayudante a los 15 años",
      tono: "cálido y pausado",
    });
    const prompts = compilarPersonaje(p);
    expect(prompts.storytelling).toContain("Historia: empezó como ayudante a los 15 años");
    expect(prompts.storytelling).not.toContain("Tono:");
    expect(prompts.narracion).toContain("Tono: cálido y pausado");
    expect(prompts.narracion).not.toContain("Historia:");
  });
});
