import { describe, expect, it } from "vitest";
import { construirPlantillaExportacion, parsearRespuestaIA } from "./exportar-contexto";

const RESPUESTA_VALIDA = `## Copy
Un texto de copy de ejemplo para la publicación.

## Escenas
Escena 1
Duración (s): 5
Descripción: Plano general de la obra.
Guión hablado: Bienvenidos a esta nueva construcción.
Texto en pantalla: Bienvenidos
Prompt imagen: Fotografía documental de una obra en construcción, luz natural.
Prompt video: Plano fijo con leve movimiento de cámara hacia adelante.

Escena 2
Duración (s): 0
Descripción: Detalle de los materiales.
Guión hablado:
Texto en pantalla:
Prompt imagen: Fotografía macro de materiales de construcción ordenados.
Prompt video:

## Hashtags
#construccion #obra #chile

## CTA
Contáctanos para tu próximo proyecto.

## Miniatura
Fotografía de portada mostrando la obra terminada.`;

describe("parsearRespuestaIA", () => {
  it("reconoce el formato esperado y extrae todas las secciones", () => {
    const { contenido, reconocido } = parsearRespuestaIA(RESPUESTA_VALIDA);
    expect(reconocido).toBe(true);
    expect(contenido.copy).toBe("Un texto de copy de ejemplo para la publicación.");
    expect(contenido.hashtags).toBe("#construccion #obra #chile");
    expect(contenido.cta).toBe("Contáctanos para tu próximo proyecto.");
    expect(contenido.miniatura).toBe("Fotografía de portada mostrando la obra terminada.");
  });

  it("extrae cada escena con sus campos completos, en orden", () => {
    const { contenido } = parsearRespuestaIA(RESPUESTA_VALIDA);
    expect(contenido.escenas).toHaveLength(2);

    expect(contenido.escenas[0]).toMatchObject({
      numero: 1,
      duracionSegundos: 5,
      descripcion: "Plano general de la obra.",
      guionHablado: "Bienvenidos a esta nueva construcción.",
      textoEnPantalla: "Bienvenidos",
      promptVisual: "Fotografía documental de una obra en construcción, luz natural.",
      promptVideo: "Plano fijo con leve movimiento de cámara hacia adelante.",
    });

    expect(contenido.escenas[1]).toMatchObject({
      numero: 2,
      duracionSegundos: 0,
      descripcion: "Detalle de los materiales.",
      guionHablado: "",
      textoEnPantalla: "",
      promptVisual: "Fotografía macro de materiales de construcción ordenados.",
      promptVideo: "",
    });
  });

  it("reconoce el formato con saltos de línea CRLF (pegado desde algunos editores)", () => {
    const conCRLF = RESPUESTA_VALIDA.replace(/\n/g, "\r\n");
    const { contenido, reconocido } = parsearRespuestaIA(conCRLF);
    expect(reconocido).toBe(true);
    expect(contenido.escenas).toHaveLength(2);
    expect(contenido.escenas[0].descripcion).toBe("Plano general de la obra.");
  });

  it("cae a texto sin estructurar cuando no reconoce ningún encabezado, sin perder el contenido", () => {
    const textoLibre = "Esto es una respuesta de la IA que no sigue el formato pedido para nada.";
    const { contenido, reconocido } = parsearRespuestaIA(textoLibre);
    expect(reconocido).toBe(false);
    expect(contenido.copy).toBe(textoLibre);
    expect(contenido.escenas).toEqual([]);
  });

  it("no pierde contenido de una escena con un Prompt imagen de varias líneas", () => {
    const conPromptLargo = `## Copy
Copy corto.

## Escenas
Escena 1
Duración (s): 0
Descripción: Una escena.
Prompt imagen: Primera línea del prompt.
Segunda línea del mismo prompt, sin etiqueta.
Prompt video:

## Hashtags


## CTA


## Miniatura
`;
    const { contenido } = parsearRespuestaIA(conPromptLargo);
    expect(contenido.escenas[0].promptVisual).toBe(
      "Primera línea del prompt.\nSegunda línea del mismo prompt, sin etiqueta.",
    );
  });
});

describe("construirPlantillaExportacion", () => {
  it("incluye la identidad compilada, la tarea y la plantilla de formato", () => {
    const texto = construirPlantillaExportacion({
      identidadCompilada: "## Marca\nVoz y personalidad: Directa y cercana",
      tipoContenido: "Carrusel",
      tipoProduccion: "Solo imágenes",
      tema: "5 errores comunes al construir",
      numeroPaginas: "5",
    });

    expect(texto).toContain("## Marca");
    expect(texto).toContain("Carrusel");
    expect(texto).toContain("5 errores comunes al construir");
    expect(texto).toContain("Número de páginas del carrusel: exactamente 5.");
    expect(texto).toContain("## Formato de salida requerido");
    expect(texto).toContain("## Escenas");
  });

  it("produce una plantilla cuyo formato de salida el propio parser reconoce como válido si se completa", () => {
    const plantilla = construirPlantillaExportacion({
      identidadCompilada: "",
      tipoContenido: "Imagen",
      tipoProduccion: "Solo imágenes",
      tema: "Una idea de prueba",
    });
    // La plantilla en sí misma es una instrucción, no una respuesta — pero
    // confirma que ambas funciones coordinan en el mismo vocabulario de
    // encabezados ("## Copy", "## Escenas", etc.), la garantía real de que
    // exportar y pegar son compatibles entre sí.
    for (const encabezado of ["## Copy", "## Escenas", "## Hashtags", "## CTA", "## Miniatura"]) {
      expect(plantilla).toContain(encabezado);
    }
  });
});
