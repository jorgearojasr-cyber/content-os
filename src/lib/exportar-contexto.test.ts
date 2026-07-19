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
    expect(texto).toContain("Número de láminas del carrusel: exactamente 5.");
    expect(texto).toContain("## Formato de salida requerido");
    expect(texto).toContain("## Láminas");
  });

  it("empieza SIEMPRE con las instrucciones de destino (IA de texto, no generador de imágenes)", () => {
    for (const tipoContenido of ["Video Corto", "Carrusel", "Imagen", "Historia", "Video Largo"]) {
      const texto = construirPlantillaExportacion({
        identidadCompilada: "## Marca\nVoz: Directa",
        tipoContenido,
        tipoProduccion: "IA decide automáticamente",
        tema: "Una idea",
      });
      expect(texto.startsWith("## Instrucciones de uso")).toBe(true);
      expect(texto).toContain("IA de TEXTO");
      expect(texto).toContain("NO lo pegues en un generador de imágenes");
    }
  });

  it("Imagen: pide UN prompt de imagen con copy — sin escenas, sin miniatura, con aspect ratio", () => {
    const texto = construirPlantillaExportacion({
      identidadCompilada: "## Marca\nVoz: Directa",
      tipoContenido: "Imagen",
      tipoProduccion: "Solo imágenes",
      tema: "Aislación de techos",
      aspectRatio: "4:5",
    });
    expect(texto).toContain("## Prompt imagen");
    expect(texto).toContain("UN solo prompt");
    expect(texto).toContain("en formato 4:5");
    expect(texto).not.toContain("Escena 1");
    expect(texto).not.toContain("Lámina 1");
    expect(texto).not.toContain("## Miniatura");
  });

  it("Video Corto: declara explícitamente el número de escenas y la duración solicitados", () => {
    const texto = construirPlantillaExportacion({
      identidadCompilada: "## Marca\nVoz: Directa",
      tipoContenido: "Video Corto",
      tipoProduccion: "Video con IA",
      tema: "Recorrido por la obra",
      duracion: "30 segundos",
      numeroEscenas: "6",
    });
    expect(texto).toContain("Duración objetivo: 30 segundos.");
    expect(texto).toContain("Número de escenas: exactamente 6.");
    expect(texto).toContain("Escena 1");
    expect(texto).toContain("Prompt video");
  });

  it("Carrusel: estructura de láminas SIN prompt video, con el aspect ratio elegido", () => {
    const texto = construirPlantillaExportacion({
      identidadCompilada: "## Marca\nVoz: Directa",
      tipoContenido: "Carrusel",
      tipoProduccion: "Solo imágenes",
      tema: "5 errores comunes",
      aspectRatio: "4:5",
    });
    expect(texto).toContain("## Láminas");
    expect(texto).toContain("Lámina 1");
    expect(texto).toContain("en formato 4:5");
    expect(texto).not.toContain("Prompt video");
    expect(texto).not.toContain("Escena 1");
  });

  it("Historia: vertical 9:16, máximo 3 escenas, sin miniatura", () => {
    const texto = construirPlantillaExportacion({
      identidadCompilada: "## Marca\nVoz: Directa",
      tipoContenido: "Historia",
      tipoProduccion: "IA decide automáticamente",
      tema: "Avance del día",
    });
    expect(texto).toContain("9:16");
    expect(texto).toContain("MÁXIMO 3 escenas");
    expect(texto).not.toContain("## Miniatura");
  });

  it("incluye la sección de Conocimiento relevante solo cuando llega contenido", () => {
    const base = {
      identidadCompilada: "## Marca\nVoz: Directa",
      tipoContenido: "Imagen",
      tipoProduccion: "Solo imágenes",
      tema: "Aislación de techos",
    };
    const con = construirPlantillaExportacion({
      ...base,
      conocimientoRelevante: "### Normativa térmica\nResumen de la exigencia de aislación",
    });
    expect(con).toContain("## Conocimiento relevante");
    expect(con).toContain("### Normativa térmica");
    // El conocimiento va DESPUÉS de la identidad y ANTES de la tarea.
    expect(con.indexOf("## Marca")).toBeLessThan(con.indexOf("## Conocimiento relevante"));
    expect(con.indexOf("## Conocimiento relevante")).toBeLessThan(con.indexOf("## Tarea"));

    const sin = construirPlantillaExportacion(base);
    expect(sin).not.toContain("## Conocimiento relevante");
  });

  it("produce una plantilla cuyo formato de salida el propio parser reconoce como válido si se completa", () => {
    const plantilla = construirPlantillaExportacion({
      identidadCompilada: "",
      tipoContenido: "Video Corto",
      tipoProduccion: "Video con IA",
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

describe("parsearRespuestaIA — respuestas por formato", () => {
  it("Carrusel: reconoce láminas con sus campos y sin prompt video", () => {
    const respuesta = `## Copy
Copy del carrusel.

## Láminas
Lámina 1
Descripción: Portada con el título del carrusel.
Texto en pantalla: 5 errores comunes
Prompt imagen: Diseño gráfico limpio con tipografía grande, formato 4:5.

Lámina 2
Descripción: Primer error explicado.
Texto en pantalla: Error 1: no impermeabilizar
Prompt imagen: Fotografía de un muro con humedad, formato 4:5.

## Hashtags
#construccion

## CTA
Guarda este carrusel.

## Miniatura
La Lámina 1 sirve de portada.`;

    const { contenido, reconocido } = parsearRespuestaIA(respuesta);
    expect(reconocido).toBe(true);
    expect(contenido.copy).toBe("Copy del carrusel.");
    expect(contenido.escenas).toHaveLength(2);
    expect(contenido.escenas[0]).toMatchObject({
      numero: 1,
      duracionSegundos: 0,
      descripcion: "Portada con el título del carrusel.",
      textoEnPantalla: "5 errores comunes",
      promptVisual: "Diseño gráfico limpio con tipografía grande, formato 4:5.",
      promptVideo: "",
    });
    expect(contenido.escenas[1].numero).toBe(2);
    expect(contenido.escenas[1].promptVideo).toBe("");
  });

  it("Imagen: convierte el Prompt imagen único en una sola escena", () => {
    const respuesta = `## Copy
Copy de la publicación de imagen.

## Prompt imagen
Fotografía documental de una casa recién terminada al atardecer, formato 4:5,
luz cálida, sin texto sobreimpreso.

## Hashtags
#casa #construccion

## CTA
Escríbenos para cotizar.`;

    const { contenido, reconocido } = parsearRespuestaIA(respuesta);
    expect(reconocido).toBe(true);
    expect(contenido.copy).toBe("Copy de la publicación de imagen.");
    expect(contenido.escenas).toHaveLength(1);
    expect(contenido.escenas[0].promptVisual).toContain("Fotografía documental de una casa");
    expect(contenido.escenas[0].promptVideo).toBe("");
    expect(contenido.escenas[0].duracionSegundos).toBe(0);
    expect(contenido.miniatura).toBe("");
  });

  it("Historia: estructura corta de 2 escenas 9:16 sin miniatura", () => {
    const respuesta = `## Copy
Texto breve de la historia.

## Escenas
Escena 1
Duración (s): 5
Descripción: Selfie en la obra saludando.
Guión hablado: ¡Hoy les muestro el avance!
Texto en pantalla: Avance de hoy
Prompt imagen: Selfie vertical 9:16 en obra, luz natural.
Prompt video: Movimiento leve de cámara en mano, vertical 9:16.

Escena 2
Duración (s): 7
Descripción: Paneo del muro terminado.
Guión hablado:
Texto en pantalla: ¡Muro listo!
Prompt imagen: Muro de ladrillo terminado, vertical 9:16.
Prompt video: Paneo lento de izquierda a derecha, vertical 9:16.

## Hashtags


## CTA
Desliza hacia arriba.`;

    const { contenido, reconocido } = parsearRespuestaIA(respuesta);
    expect(reconocido).toBe(true);
    expect(contenido.escenas).toHaveLength(2);
    expect(contenido.escenas[0].duracionSegundos).toBe(5);
    expect(contenido.escenas[1].textoEnPantalla).toBe("¡Muro listo!");
    expect(contenido.miniatura).toBe("");
  });

  it("Video: la respuesta clásica de escenas sigue parseando igual (regresión)", () => {
    const { contenido, reconocido } = parsearRespuestaIA(RESPUESTA_VALIDA);
    expect(reconocido).toBe(true);
    expect(contenido.escenas).toHaveLength(2);
    expect(contenido.escenas[0].promptVideo).toBe("Plano fijo con leve movimiento de cámara hacia adelante.");
    expect(contenido.miniatura).toBe("Fotografía de portada mostrando la obra terminada.");
  });
});
