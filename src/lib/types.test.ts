import { describe, expect, it } from "vitest";
import { formatearEscenas, reemplazarSeccionEscenas, type Escena } from "./types";

function escena(overrides: Partial<Escena> = {}): Escena {
  return {
    numero: 1,
    duracionSegundos: 0,
    descripcion: "",
    guionHablado: "",
    promptImagen: "",
    promptVideo: "",
    textoEnPantalla: "",
    ...overrides,
  };
}

describe("formatearEscenas", () => {
  it("incluye la duración solo si es mayor que cero", () => {
    const salida = formatearEscenas([escena({ duracionSegundos: 18 })]);
    expect(salida).toContain("Escena 1 (18s)");
  });

  it("omite el paréntesis de duración cuando es cero", () => {
    const salida = formatearEscenas([escena({ duracionSegundos: 0 })]);
    expect(salida).toContain("Escena 1");
    expect(salida).not.toContain("(0s)");
  });

  it("devuelve cadena vacía si no hay escenas", () => {
    expect(formatearEscenas([])).toBe("");
  });
});

describe("reemplazarSeccionEscenas", () => {
  it("reemplaza la sección ## Escenas y preserva las demás secciones intactas", () => {
    const textoActual =
      "## Copy\nTexto de copy original.\n\n" +
      "## Escenas\nEscena 1\nDescripción vieja.\n\n" +
      "## Hashtags\n#tag1 #tag2";

    const salida = reemplazarSeccionEscenas(textoActual, [
      escena({ descripcion: "Descripción nueva editada a mano." }),
    ]);

    expect(salida).toContain("## Copy\nTexto de copy original.");
    expect(salida).toContain("## Hashtags\n#tag1 #tag2");
    expect(salida).toContain("Descripción nueva editada a mano.");
    expect(salida).not.toContain("Descripción vieja.");
  });

  it("normaliza saltos de línea CRLF (\\r\\n) antes de dividir en secciones — regresión del bug encontrado al guardar desde un <textarea> vía Server Action", () => {
    const textoActual =
      "## Copy\r\nTexto de copy original.\r\n\r\n" +
      "## Escenas\r\nEscena 1\r\nDescripción vieja.\r\n\r\n" +
      "## Hashtags\r\n#tag1 #tag2";

    const salida = reemplazarSeccionEscenas(textoActual, [
      escena({ descripcion: "Descripción nueva editada a mano." }),
    ]);

    // Sin la normalización, el split por "\n\n(?=## )" no encuentra ningún
    // límite de sección dentro de un texto con CRLF (queda todo como un
    // único bloque), y la sección "## Escenas" nunca se reemplaza ni
    // "## Copy"/"## Hashtags" se preservan por separado.
    expect(salida).toContain("## Copy");
    expect(salida).toContain("Texto de copy original.");
    expect(salida).toContain("## Hashtags");
    expect(salida).toContain("#tag1 #tag2");
    expect(salida).toContain("Descripción nueva editada a mano.");
    expect(salida).not.toContain("Descripción vieja.");
  });

  it("agrega la sección ## Escenas al final si el texto todavía no tenía una", () => {
    const textoActual = "## Copy\nSolo copy, sin escenas todavía.";
    const salida = reemplazarSeccionEscenas(textoActual, [escena({ descripcion: "Nueva escena" })]);
    expect(salida).toContain("## Copy\nSolo copy, sin escenas todavía.");
    expect(salida).toContain("## Escenas\nEscena 1\nNueva escena");
  });

  it("quita la sección ## Escenas si el arreglo editado queda vacío (sin escenas)", () => {
    const textoActual = "## Copy\nAlgo de copy.\n\n## Escenas\nEscena 1\nDescripción.";
    const salida = reemplazarSeccionEscenas(textoActual, []);
    expect(salida).not.toContain("## Escenas");
    expect(salida).toContain("## Copy\nAlgo de copy.");
  });
});
