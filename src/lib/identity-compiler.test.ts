import { describe, expect, it } from "vitest";
import {
  compileIdentity,
  identidadPorSeccion,
  identidadTieneContacto,
  identityHasContent,
  resumenPorSeccion,
} from "./identity-compiler";
import type { AvatarCliente, Identidad } from "./types";

function baseIdentidad(overrides: Partial<Identidad> = {}): Identidad {
  return {
    id: "id-1",
    proyectoId: "proy-1",
    voz: "",
    reglas: "",
    objetivo: "",
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

function avatarJsonCon(overrides: Partial<AvatarCliente>): Partial<AvatarCliente> {
  return overrides;
}

describe("compileIdentity", () => {
  it("es determinístico: la misma entrada produce siempre la misma salida", () => {
    const identidad = baseIdentidad({ voz: "Directa y cálida", fisica: "Cabello corto" });
    const a = compileIdentity(identidad);
    const b = compileIdentity(identidad);
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
    const identidad = baseIdentidad({ fisica: descripcionExacta });
    const salida = compileIdentity(identidad);
    expect(salida).toContain(descripcionExacta);
  });

  it("avisa explícitamente cuando la identidad está vacía", () => {
    const salida = compileIdentity(baseIdentidad());
    expect(salida).toMatch(/todavía no tiene ningún campo cargado/);
  });

  it("incluye el objetivo del proyecto cuando está definido", () => {
    const identidad = baseIdentidad({ objetivo: "Educar" });
    const salida = compileIdentity(identidad);
    expect(salida).toContain("Objetivo del proyecto: Educar");
  });

  it("incluye la personalidad del personaje cuando está definida", () => {
    const identidad = baseIdentidad({
      personajeNombre: "Don José Luis",
      personajePersonalidad: "Cercano, paciente, con humor sencillo",
    });
    const salida = compileIdentity(identidad);
    expect(salida).toContain("## Personaje");
    expect(salida).toContain("Personalidad: Cercano, paciente, con humor sencillo");
  });

  it("renderiza el avatar campo por campo, sin resumir", () => {
    const identidad = baseIdentidad({
      avatarJson: avatarJsonCon({
        nombreFicticio: "Marta",
        edad: "42",
        miedos: "Que el proyecto fracase por falta de tiempo",
      }),
    });
    const salida = compileIdentity(identidad);
    expect(salida).toContain("Avatar del cliente ideal:");
    expect(salida).toContain("Nombre ficticio: Marta");
    expect(salida).toContain("Edad: 42");
    expect(salida).toContain("Qué teme: Que el proyecto fracase por falta de tiempo");
    // Campos no cargados del avatar no aparecen como etiquetas vacías
    expect(salida).not.toContain("Profesión:");
  });

  it("un avatarJson vacío ({}) no agrega el bloque de avatar", () => {
    const identidad = baseIdentidad({ voz: "Directa" });
    const salida = compileIdentity(identidad);
    expect(salida).not.toContain("Avatar del cliente ideal");
  });

  it("renderiza las fotos de referencia del Personaje numeradas", () => {
    const identidad = baseIdentidad({
      personajeNombre: "Don José Luis",
      fotosUrlsJson: ["https://blob/foto1.jpg", "https://blob/foto2.jpg"],
    });
    const salida = compileIdentity(identidad);
    expect(salida).toContain("Fotos de referencia:");
    expect(salida).toContain("1. https://blob/foto1.jpg");
    expect(salida).toContain("2. https://blob/foto2.jpg");
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

  it("opciones.incluirPersonaje = false omite toda la sección Personaje", () => {
    const identidad = baseIdentidad({ personajeNombre: "Don José Luis" });
    const salida = compileIdentity(identidad, { incluirPersonaje: false });
    expect(salida).not.toContain("## Personaje");
  });

  it("opciones.incluirMarca = false omite Marca, avatar incluido", () => {
    const identidad = baseIdentidad({
      voz: "Directa",
      avatarJson: avatarJsonCon({ edad: "42" }),
    });
    const salida = compileIdentity(identidad, { incluirMarca: false });
    expect(salida).not.toContain("## Marca");
    expect(salida).not.toContain("Avatar del cliente ideal");
  });
});

describe("identityHasContent", () => {
  it("es falso para una identidad totalmente vacía", () => {
    expect(identityHasContent(baseIdentidad())).toBe(false);
  });

  it("es verdadero si al menos un campo tiene texto", () => {
    expect(identityHasContent(baseIdentidad({ voz: "Directa" }))).toBe(true);
  });

  it("es verdadero si solo el objetivo tiene texto", () => {
    expect(identityHasContent(baseIdentidad({ objetivo: "Vender servicios" }))).toBe(true);
  });

  it("es verdadero si solo el avatar (avatarJson con al menos un campo) tiene datos", () => {
    const identidad = baseIdentidad({ avatarJson: avatarJsonCon({ edad: "30" }) });
    expect(identityHasContent(identidad)).toBe(true);
  });

  it("es verdadero si solo hay una foto de referencia del Personaje", () => {
    const identidad = baseIdentidad({ fotosUrlsJson: ["https://blob/foto1.jpg"] });
    expect(identityHasContent(identidad)).toBe(true);
  });

  it("es falso si solo hay datos de Contacto — Contacto no cuenta como contenido", () => {
    const identidad = baseIdentidad({ sitioWeb: "https://ejemplo.com" });
    expect(identityHasContent(identidad)).toBe(false);
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
  it("las 5 secciones son falsas para una identidad totalmente vacía", () => {
    const estado = identidadPorSeccion(baseIdentidad());
    expect(estado).toEqual({
      marca: false,
      avatar: false,
      personaje: false,
      estilo: false,
      contacto: false,
    });
  });

  it("marca solo depende de voz/reglas/objetivo, no del resto de la identidad", () => {
    const identidad = baseIdentidad({ voz: "Directa y cálida" });
    const estado = identidadPorSeccion(identidad);
    expect(estado.marca).toBe(true);
    expect(estado.avatar).toBe(false);
    expect(estado.personaje).toBe(false);
    expect(estado.estilo).toBe(false);
  });

  it("avatar es verdadero con un solo campo del avatar cargado", () => {
    const identidad = baseIdentidad({ avatarJson: avatarJsonCon({ edad: "42" }) });
    expect(identidadPorSeccion(identidad).avatar).toBe(true);
  });

  it("personaje es verdadero con al menos uno de sus 7 campos, pero fotosUrlsJson NO cuenta como campo de personaje", () => {
    const soloFoto = baseIdentidad({ fotosUrlsJson: ["/uploads/foto.jpg"] });
    expect(identidadPorSeccion(soloFoto).personaje).toBe(false);

    const conNombre = baseIdentidad({ personajeNombre: "Don José Luis" });
    expect(identidadPorSeccion(conNombre).personaje).toBe(true);
  });

  it("estilo es verdadero con al menos uno de sus 6 campos", () => {
    const identidad = baseIdentidad({ camara: "Formato vertical 9:16" });
    expect(identidadPorSeccion(identidad).estilo).toBe(true);
  });

  it("estilo es falso con solo logoUrl — logoUrl NO cuenta como campo de estilo", () => {
    const soloLogo = baseIdentidad({ logoUrl: "/uploads/logo.png" });
    expect(identidadPorSeccion(soloLogo).estilo).toBe(false);
  });

  it("las 4 secciones de entrenamiento son verdaderas cuando la identidad está completa (contacto sigue aparte)", () => {
    const identidad = baseIdentidad({
      voz: "Directa",
      reglas: "Sin tecnicismos",
      objetivo: "Educar",
      avatarJson: avatarJsonCon({ edad: "42" }),
      personajeNombre: "Don José Luis",
      paleta: "Azul marino",
    });
    const estado = identidadPorSeccion(identidad);
    expect(estado).toEqual({
      marca: true,
      avatar: true,
      personaje: true,
      estilo: true,
      contacto: false,
    });
  });

  it("contacto es verdadero con al menos un dato de contacto cargado", () => {
    const identidad = baseIdentidad({ telefono: "+56911111111" });
    expect(identidadPorSeccion(identidad).contacto).toBe(true);
  });
});

describe("resumenPorSeccion", () => {
  it("toma el primer campo con contenido de cada sección, en el mismo orden que el checklist", () => {
    const identidad = baseIdentidad({
      reglas: "Sin tecnicismos",
      avatarJson: avatarJsonCon({ profesion: "Arquitecta" }),
      personajePersonalidad: "Cercano y paciente",
      camara: "Formato vertical 9:16",
      telefono: "+56911111111",
    });
    const resumen = resumenPorSeccion(identidad);
    expect(resumen.marca).toBe("Sin tecnicismos");
    expect(resumen.avatar).toBe("Arquitecta");
    expect(resumen.personaje).toBe("Cercano y paciente");
    expect(resumen.estilo).toBe("Formato vertical 9:16");
    expect(resumen.contacto).toBe("+56911111111");
  });

  it("devuelve cadenas vacías para las secciones sin contenido", () => {
    const resumen = resumenPorSeccion(baseIdentidad());
    expect(resumen).toEqual({ marca: "", avatar: "", personaje: "", estilo: "", contacto: "" });
  });
});
