import { describe, expect, it } from "vitest";
import { formatearKitMarkdown, formatearKitTexto, nombreArchivoDesdeTitulo } from "./exportar-kit";
import type { Escena } from "./types";

function escenaBase(overrides: Partial<Escena> = {}): Escena {
  return {
    numero: 1,
    duracionSegundos: 0,
    descripcion: "",
    guionHablado: "",
    textoEnPantalla: "",
    promptVideo: "",
    promptVisual: "",
    ...overrides,
  };
}

const KIT_BASE = {
  titulo: "5 errores típicos en la construcción",
  copy: "Copy de prueba",
  hashtags: "#ObraBien #Construcción",
  cta: "Guarda este video",
  miniatura: "Foto del maestro con el título superpuesto",
  narracion: "",
  escenas: [
    escenaBase({ numero: 1, duracionSegundos: 10, descripcion: "Gancho inicial", guionHablado: "Hola" }),
    escenaBase({ numero: 2, duracionSegundos: 12, promptVisual: "prompt de imagen", promptVideo: "prompt de video" }),
  ],
};

describe("formatearKitTexto", () => {
  it("incluye título, copy, escenas, hashtags, cta y miniatura", () => {
    const texto = formatearKitTexto(KIT_BASE);
    expect(texto).toContain("KIT DE PRODUCCIÓN — 5 errores típicos en la construcción");
    expect(texto).toContain("COPY");
    expect(texto).toContain("Copy de prueba");
    expect(texto).toContain("Escena 1 (10s)");
    expect(texto).toContain("Guión hablado: Hola");
    expect(texto).toContain("Prompt imagen: prompt de imagen");
    expect(texto).toContain("Prompt video: prompt de video");
    expect(texto).toContain("HASHTAGS");
    expect(texto).toContain("CTA");
    expect(texto).toContain("MINIATURA");
  });

  it("omite secciones vacías", () => {
    const texto = formatearKitTexto({ ...KIT_BASE, narracion: "", miniatura: "", hashtags: "" });
    expect(texto).not.toContain("NARRACIÓN");
    expect(texto).not.toContain("MINIATURA");
    expect(texto).not.toContain("HASHTAGS");
  });

  it("título vacío cae a 'Sin título'", () => {
    expect(formatearKitTexto({ ...KIT_BASE, titulo: "" })).toContain("Sin título");
  });
});

describe("formatearKitMarkdown", () => {
  it("usa encabezados markdown y negritas para los campos de escena", () => {
    const md = formatearKitMarkdown(KIT_BASE);
    expect(md).toContain("# 5 errores típicos en la construcción");
    expect(md).toContain("## Copy");
    expect(md).toContain("### Escena 1 (10s)");
    expect(md).toContain("**Guión hablado:** Hola");
    expect(md).toContain("**Prompt imagen:**");
    expect(md).toContain("## Hashtags");
  });
});

describe("nombreArchivoDesdeTitulo", () => {
  it("convierte el título a un nombre de archivo seguro", () => {
    expect(nombreArchivoDesdeTitulo("5 Errores Típicos en la Construcción!", "txt")).toBe(
      "5-errores-típicos-en-la-construcción.txt",
    );
  });

  it("título vacío cae a un nombre genérico", () => {
    expect(nombreArchivoDesdeTitulo("", "pdf")).toBe("kit-de-produccion.pdf");
  });
});
