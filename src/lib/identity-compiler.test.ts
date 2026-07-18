import { describe, expect, it } from "vitest";
import {
  compileIdentity,
  identidadPorSeccion,
  identidadTieneContacto,
  identityHasContent,
  resumenPorSeccion,
} from "./identity-compiler";
import type { Avatar, Identidad, Personaje } from "./types";

function baseIdentidad(overrides: Partial<Identidad> = {}): Identidad {
  return {
    id: "id-1",
    proyectoId: "proy-1",
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
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function basePersonaje(overrides: Partial<Personaje> = {}): Personaje {
  return {
    id: "personaje-1",
    proyectoId: "proy-1",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseAvatar(overrides: Partial<Avatar> = {}): Avatar {
  return {
    id: "avatar-1",
    proyectoId: "proy-1",
    nombreFicticio: "",
    edad: "",
    profesion: "",
    nivelConocimiento: "",
    problemasFrecuentes: "",
    objetivos: "",
    miedos: "",
    queBuscaAprender: "",
    comoConsumeContenido: "",
    lenguaje: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("compileIdentity", () => {
  it("es determinístico: la misma entrada produce siempre la misma salida", () => {
    const identidad = baseIdentidad({ voz: "Directa y cálida" });
    const personaje = basePersonaje({ fisica: "Cabello corto" });
    const a = compileIdentity(identidad, { personajes: [personaje] });
    const b = compileIdentity(identidad, { personajes: [personaje] });
    expect(a).toBe(b);
  });

  it("omite secciones sin ningún campo cargado", () => {
    const identidad = baseIdentidad({ voz: "Directa" });
    const salida = compileIdentity(identidad);
    expect(salida).toContain("## Marca");
    expect(salida).not.toContain("## Personaje");
    expect(salida).not.toContain("## Estilo");
  });

  it("reproduce el texto de forma literal, sin resumir ni alterar", () => {
    const descripcionExacta =
      "mujer de 32 años, cabello castaño corto con raya al medio, ojos café";
    const personaje = basePersonaje({ fisica: descripcionExacta });
    const salida = compileIdentity(baseIdentidad(), { personajes: [personaje] });
    expect(salida).toContain(descripcionExacta);
  });

  it("avisa explícitamente cuando la identidad está vacía y no hay personaje ni avatar", () => {
    const salida = compileIdentity(baseIdentidad());
    expect(salida).toMatch(/todavía no tiene ningún campo cargado/);
  });

  it("incluye el objetivo del proyecto cuando está definido", () => {
    const identidad = baseIdentidad({ objetivo: "Educar" });
    const salida = compileIdentity(identidad);
    expect(salida).toContain("Objetivo del proyecto: Educar");
  });

  it("incluye los campos expandidos de Marca (historia/valores/audiencia/competidores/manual) cuando están definidos", () => {
    const identidad = baseIdentidad({
      historia: "Nació tras 15 años en obras",
      valores: "Honestidad técnica",
      audiencia: "Dueños de casa sin conocimiento técnico",
      competidores: "Canales de maestros en YouTube",
      manualMarca: "https://drive.google.com/manual",
    });
    const salida = compileIdentity(identidad);
    expect(salida).toContain("Historia de la marca: Nació tras 15 años en obras");
    expect(salida).toContain("Valores: Honestidad técnica");
    expect(salida).toContain("Audiencia: Dueños de casa sin conocimiento técnico");
    expect(salida).toContain("Competidores: Canales de maestros en YouTube");
    expect(salida).toContain("Manual de marca: https://drive.google.com/manual");
  });

  it("compila los Lineamientos de contenido en su propia sección, ligada a incluirMarca", () => {
    const identidad = baseIdentidad({
      ctaHabituales: "Escríbenos por WhatsApp",
      hashtagsFrecuentes: "#construccion #obrabien",
      restricciones: "Nunca prometer plazos exactos",
    });
    const salida = compileIdentity(identidad);
    expect(salida).toContain("## Lineamientos de contenido");
    expect(salida).toContain("CTA habituales: Escríbenos por WhatsApp");
    expect(salida).toContain("Hashtags frecuentes: #construccion #obrabien");
    expect(salida).toContain("Restricciones (qué evitar siempre): Nunca prometer plazos exactos");
    // Misma casilla que Marca en Crear — sin marca, sin lineamientos.
    expect(compileIdentity(identidad, { incluirMarca: false })).not.toContain("## Lineamientos");
  });

  it("con los campos nuevos vacíos, la salida es idéntica a la de antes de la expansión", () => {
    const identidad = baseIdentidad({ voz: "Directa", reglas: "Sin tecnicismos" });
    const salida = compileIdentity(identidad);
    expect(salida).toBe("## Marca\nVoz y personalidad: Directa\nReglas de escritura: Sin tecnicismos");
  });

  it("sin personaje seleccionado, la sección Personaje no aparece aunque incluirPersonaje sea true", () => {
    const salida = compileIdentity(baseIdentidad({ voz: "Directa" }), { incluirPersonaje: true });
    expect(salida).not.toContain("## Personaje");
  });

  it("incluye la personalidad del personaje SELECCIONADO cuando está definida", () => {
    const personaje = basePersonaje({
      nombre: "Don José Luis",
      personalidad: "Cercano, paciente, con humor sencillo",
    });
    const salida = compileIdentity(baseIdentidad(), { personajes: [personaje] });
    expect(salida).toContain("## Personaje");
    expect(salida).toContain("Personalidad: Cercano, paciente, con humor sencillo");
  });

  it("incluye la ficha completa y los prompts maestros del Personaje, pero NUNCA sus notas internas", () => {
    const personaje = basePersonaje({
      nombre: "Don José",
      edad: "58 años",
      profesion: "Maestro de construcción",
      historia: "Partió como ayudante a los 15",
      contexto: "Siempre en obra",
      promptMaestro: "Eres Don José, maestro chileno...",
      promptVoz: "Voz grave y pausada",
      notas: "SECRETO-INTERNO no debe salir",
    });
    const salida = compileIdentity(baseIdentidad(), { personajes: [personaje] });
    expect(salida).toContain("Edad: 58 años");
    expect(salida).toContain("Profesión: Maestro de construcción");
    expect(salida).toContain("Historia: Partió como ayudante a los 15");
    expect(salida).toContain("Contexto habitual: Siempre en obra");
    expect(salida).toContain("Prompt maestro: Eres Don José, maestro chileno...");
    expect(salida).toContain("Prompt para voz: Voz grave y pausada");
    expect(salida).not.toContain("SECRETO-INTERNO");
  });

  it("con la ficha completa vacía, la salida del Personaje es idéntica a la de antes de la expansión", () => {
    const personaje = basePersonaje({ nombre: "Don José", personalidad: "Cercano" });
    const salida = compileIdentity(baseIdentidad(), { personajes: [personaje] });
    expect(salida).toBe("## Personaje\nNombre: Don José\nPersonalidad: Cercano");
  });

  it("renderiza el avatar SELECCIONADO campo por campo, sin resumir", () => {
    const avatar = baseAvatar({
      nombreFicticio: "Marta",
      edad: "42",
      miedos: "Que el proyecto fracase por falta de tiempo",
    });
    const salida = compileIdentity(baseIdentidad(), { avatar });
    expect(salida).toContain("Avatar del cliente ideal:");
    expect(salida).toContain("Nombre ficticio: Marta");
    expect(salida).toContain("Edad: 42");
    expect(salida).toContain("Qué teme: Que el proyecto fracase por falta de tiempo");
    // Campos no cargados del avatar no aparecen como etiquetas vacías
    expect(salida).not.toContain("Profesión:");
  });

  it("sin avatar seleccionado no agrega el bloque de avatar", () => {
    const identidad = baseIdentidad({ voz: "Directa" });
    const salida = compileIdentity(identidad);
    expect(salida).not.toContain("Avatar del cliente ideal");
  });

  it("un avatar seleccionado pero completamente vacío tampoco agrega el bloque", () => {
    const identidad = baseIdentidad({ voz: "Directa" });
    const salida = compileIdentity(identidad, { avatar: baseAvatar() });
    expect(salida).not.toContain("Avatar del cliente ideal");
  });

  it("renderiza las fotos de referencia del Personaje SELECCIONADO numeradas, con su tipo", () => {
    const personaje = basePersonaje({
      nombre: "Don José Luis",
      fotosUrlsJson: [
        { url: "https://blob/foto1.jpg", tipo: "rostro" },
        { url: "https://blob/foto2.jpg", tipo: "cuerpoCompleto" },
      ],
    });
    const salida = compileIdentity(baseIdentidad(), { personajes: [personaje] });
    expect(salida).toContain("Fotos de referencia:");
    expect(salida).toContain("1. Rostro: https://blob/foto1.jpg");
    expect(salida).toContain("2. Cuerpo completo: https://blob/foto2.jpg");
  });

  it("nunca incluye Contacto por defecto, aunque haya datos cargados", () => {
    const identidad = baseIdentidad({ sitioWeb: "https://ejemplo.com", telefono: "+56911111111" });
    const salida = compileIdentity(identidad);
    expect(salida).not.toContain("## Contacto");
  });

  it("opciones.incluirContacto agrega la sección Contacto", () => {
    const identidad = baseIdentidad({
      sitioWeb: "https://ejemplo.com",
      telefono: "+56911111111",
      direccion: "Av. Siempre Viva 123",
    });
    const salida = compileIdentity(identidad, { incluirContacto: true });
    expect(salida).toContain("## Contacto");
    expect(salida).toContain("Sitio web: https://ejemplo.com");
    expect(salida).toContain("Teléfono: +56911111111");
    expect(salida).toContain("Dirección: Av. Siempre Viva 123");
  });

  it("opciones.incluirPersonaje = false omite toda la sección Personaje aunque haya uno seleccionado", () => {
    const personaje = basePersonaje({ nombre: "Don José Luis" });
    const salida = compileIdentity(baseIdentidad(), { personajes: [personaje], incluirPersonaje: false });
    expect(salida).not.toContain("## Personaje");
  });

  it("opciones.incluirMarca = false omite Marca, avatar incluido", () => {
    const identidad = baseIdentidad({ voz: "Directa" });
    const avatar = baseAvatar({ edad: "42" });
    const salida = compileIdentity(identidad, { avatar, incluirMarca: false });
    expect(salida).not.toContain("## Marca");
    expect(salida).not.toContain("Avatar del cliente ideal");
  });

  it("con 2+ Personajes, agrupa cada uno en su propio sub-bloque bajo '## Personajes' (no '## Personaje')", () => {
    const p1 = basePersonaje({ id: "p1", nombre: "Don José", personalidad: "Paciente y sabio" });
    const p2 = basePersonaje({ id: "p2", nombre: "Carolina", personalidad: "Curiosa, dueña de casa" });
    const salida = compileIdentity(baseIdentidad(), { personajes: [p1, p2] });
    expect(salida).toContain("## Personajes");
    expect(salida).not.toContain("## Personaje\n");
    expect(salida).toContain("### 1. Don José");
    expect(salida).toContain("### 2. Carolina");
    expect(salida).toContain("Personalidad: Paciente y sabio");
    expect(salida).toContain("Personalidad: Curiosa, dueña de casa");
  });

  it("con 2+ Personajes, agrega una instrucción explícita de interacción/diálogo conjunto", () => {
    const p1 = basePersonaje({ id: "p1", nombre: "Don José" });
    const p2 = basePersonaje({ id: "p2", nombre: "Carolina" });
    const salida = compileIdentity(baseIdentidad(), { personajes: [p1, p2] });
    expect(salida).toMatch(/interacción o diálogo natural/);
    expect(salida).toMatch(/no solo la voz de un narrador único/);
  });

  it("con exactamente 1 Personaje en el array, la salida es idéntica al formato singular de siempre", () => {
    const personaje = basePersonaje({ nombre: "Don José", personalidad: "Paciente" });
    const salidaArray = compileIdentity(baseIdentidad(), { personajes: [personaje] });
    expect(salidaArray).toContain("## Personaje\n");
    expect(salidaArray).not.toContain("## Personajes");
    expect(salidaArray).not.toContain("### 1.");
  });
});

describe("identityHasContent", () => {
  it("es falso para una identidad totalmente vacía sin personaje ni avatar", () => {
    expect(identityHasContent(baseIdentidad(), { tienePersonaje: false, tieneAvatar: false })).toBe(false);
  });

  it("es verdadero si al menos un campo tiene texto", () => {
    const identidad = baseIdentidad({ voz: "Directa" });
    expect(identityHasContent(identidad, { tienePersonaje: false, tieneAvatar: false })).toBe(true);
  });

  it("es verdadero si solo el objetivo tiene texto", () => {
    const identidad = baseIdentidad({ objetivo: "Vender servicios" });
    expect(identityHasContent(identidad, { tienePersonaje: false, tieneAvatar: false })).toBe(true);
  });

  it("es verdadero si el proyecto tiene al menos un avatar, aunque el resto esté vacío", () => {
    expect(identityHasContent(baseIdentidad(), { tienePersonaje: false, tieneAvatar: true })).toBe(true);
  });

  it("es verdadero si el proyecto tiene al menos un personaje, aunque el resto esté vacío", () => {
    expect(identityHasContent(baseIdentidad(), { tienePersonaje: true, tieneAvatar: false })).toBe(true);
  });

  it("es falso si solo hay datos de Contacto — Contacto no cuenta como contenido", () => {
    const identidad = baseIdentidad({ sitioWeb: "https://ejemplo.com" });
    expect(identityHasContent(identidad, { tienePersonaje: false, tieneAvatar: false })).toBe(false);
  });
});

describe("identidadTieneContacto", () => {
  it("es falso sin ningún dato de contacto", () => {
    expect(identidadTieneContacto(baseIdentidad())).toBe(false);
  });

  it("es verdadero con al menos un campo de contacto", () => {
    expect(identidadTieneContacto(baseIdentidad({ telefono: "+56911111111" }))).toBe(true);
  });
});

describe("identidadPorSeccion", () => {
  it("todas las secciones son falsas para una identidad totalmente vacía sin personaje ni avatar", () => {
    const estado = identidadPorSeccion(baseIdentidad(), { tienePersonaje: false, tieneAvatar: false });
    expect(estado).toEqual({
      marca: false,
      avatar: false,
      personaje: false,
      estilo: false,
      lineamientos: false,
      contacto: false,
    });
  });

  it("marca solo depende de voz/reglas/objetivo, no del resto de la identidad", () => {
    const identidad = baseIdentidad({ voz: "Directa y cálida" });
    const estado = identidadPorSeccion(identidad, { tienePersonaje: false, tieneAvatar: false });
    expect(estado.marca).toBe(true);
    expect(estado.avatar).toBe(false);
    expect(estado.personaje).toBe(false);
    expect(estado.estilo).toBe(false);
  });

  it("avatar refleja directamente el contexto.tieneAvatar (existe al menos uno en la lista)", () => {
    expect(identidadPorSeccion(baseIdentidad(), { tienePersonaje: false, tieneAvatar: true }).avatar).toBe(
      true,
    );
  });

  it("personaje refleja directamente el contexto.tienePersonaje (existe al menos uno en la lista)", () => {
    expect(
      identidadPorSeccion(baseIdentidad(), { tienePersonaje: true, tieneAvatar: false }).personaje,
    ).toBe(true);
  });

  it("estilo es verdadero con al menos uno de sus 6 campos", () => {
    const identidad = baseIdentidad({ camara: "Formato vertical 9:16" });
    expect(identidadPorSeccion(identidad, { tienePersonaje: false, tieneAvatar: false }).estilo).toBe(true);
  });

  it("estilo es falso con solo logoUrl — logoUrl NO cuenta como campo de estilo", () => {
    const soloLogo = baseIdentidad({ logoUrl: "/uploads/logo.png" });
    expect(identidadPorSeccion(soloLogo, { tienePersonaje: false, tieneAvatar: false }).estilo).toBe(false);
  });

  it("las 4 secciones de entrenamiento son verdaderas cuando la identidad está completa (contacto sigue aparte)", () => {
    const identidad = baseIdentidad({
      voz: "Directa",
      reglas: "Sin tecnicismos",
      objetivo: "Educar",
      paleta: "Azul marino",
    });
    const estado = identidadPorSeccion(identidad, { tienePersonaje: true, tieneAvatar: true });
    expect(estado).toEqual({
      marca: true,
      avatar: true,
      personaje: true,
      estilo: true,
      lineamientos: false,
      contacto: false,
    });
  });

  it("contacto es verdadero con al menos un dato de contacto cargado", () => {
    const identidad = baseIdentidad({ telefono: "+56911111111" });
    expect(identidadPorSeccion(identidad, { tienePersonaje: false, tieneAvatar: false }).contacto).toBe(
      true,
    );
  });
});

describe("resumenPorSeccion", () => {
  it("toma el primer campo con contenido de marca/estilo/contacto, en el mismo orden que el checklist", () => {
    const identidad = baseIdentidad({
      reglas: "Sin tecnicismos",
      camara: "Formato vertical 9:16",
      telefono: "+56911111111",
    });
    const resumen = resumenPorSeccion(identidad);
    expect(resumen.marca).toBe("Sin tecnicismos");
    expect(resumen.estilo).toBe("Formato vertical 9:16");
    expect(resumen.contacto).toBe("+56911111111");
  });

  it("devuelve cadenas vacías para las secciones sin contenido", () => {
    const resumen = resumenPorSeccion(baseIdentidad());
    expect(resumen).toEqual({ marca: "", estilo: "", lineamientos: "", contacto: "" });
  });
});
