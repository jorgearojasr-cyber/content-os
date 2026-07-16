import { describe, expect, it } from "vitest";
import { compileIdentity, identidadPorSeccion, identityHasContent } from "./identity-compiler";
import type { AvatarCliente, Identidad } from "./types";

function baseIdentidad(overrides: Partial<Identidad> = {}): Identidad {
  return {
    id: "id-1",
    proyectoId: "proy-1",
    voz: "",
    reglas: "",
    objetivo: "",
    avatarJson: "{}",
    personajeNombre: "",
    personajePersonalidad: "",
    fisica: "",
    vestuario: "",
    vozDescrita: "",
    gestos: "",
    muletillas: "",
    fotoUrl: "",
    paleta: "",
    tipografia: "",
    look: "",
    camara: "",
    ritmo: "",
    estructuraCta: "",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function avatarJsonCon(overrides: Partial<AvatarCliente>): string {
  return JSON.stringify(overrides);
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

  it("un avatarJson vacío ('{}') no agrega el bloque de avatar", () => {
    const identidad = baseIdentidad({ voz: "Directa" });
    const salida = compileIdentity(identidad);
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

  it("es verdadero si solo el avatar (avatarJson distinto de '{}') tiene datos", () => {
    const identidad = baseIdentidad({ avatarJson: avatarJsonCon({ edad: "30" }) });
    expect(identityHasContent(identidad)).toBe(true);
  });
});

describe("identidadPorSeccion", () => {
  it("las 4 secciones son falsas para una identidad totalmente vacía", () => {
    const estado = identidadPorSeccion(baseIdentidad());
    expect(estado).toEqual({ marca: false, avatar: false, personaje: false, estilo: false });
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

  it("personaje es verdadero con al menos uno de sus 7 campos, pero fotoUrl NO cuenta como campo de personaje", () => {
    const soloFoto = baseIdentidad({ fotoUrl: "/uploads/foto.jpg" });
    expect(identidadPorSeccion(soloFoto).personaje).toBe(false);

    const conNombre = baseIdentidad({ personajeNombre: "Don José Luis" });
    expect(identidadPorSeccion(conNombre).personaje).toBe(true);
  });

  it("estilo es verdadero con al menos uno de sus 6 campos", () => {
    const identidad = baseIdentidad({ camara: "Formato vertical 9:16" });
    expect(identidadPorSeccion(identidad).estilo).toBe(true);
  });

  it("las 4 secciones son verdaderas cuando la identidad está completa", () => {
    const identidad = baseIdentidad({
      voz: "Directa",
      reglas: "Sin tecnicismos",
      objetivo: "Educar",
      avatarJson: avatarJsonCon({ edad: "42" }),
      personajeNombre: "Don José Luis",
      paleta: "Azul marino",
    });
    const estado = identidadPorSeccion(identidad);
    expect(estado).toEqual({ marca: true, avatar: true, personaje: true, estilo: true });
  });
});
