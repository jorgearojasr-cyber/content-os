import { describe, expect, it } from "vitest";
import { parsearBlueprint, tieneEstructuraDeBlueprint } from "./blueprint-parser";
import type { BibliotecaConocida } from "./blueprint-parser";

const BIBLIOTECA: BibliotecaConocida = {
  proyectos: ["OBRABIEN"],
  personajes: ["Don José", "Ana"],
  locaciones: ["Obra", "Bodega de herramientas"],
  planos: ["Primer plano", "Plano detalle", "Plano cenital", "Plano caminando", "Plano lateral"],
};

// CBD 1 — "caso feliz", versión final (segunda ronda de stress test): todos
// los campos con las reglas vigentes (texto libre en una línea, listas con
// guiones para Personajes / Objetivo del espectador).
const CBD_1_FELIZ = `# Creative Blueprint v1

Autor: ChatGPT
Fecha: 2026-07-31

## Contexto

Plataforma: TikTok
Tono: Cercano, directo
Evitar: Sonar como venta
Priorizar: Enseñar, no vender
Restricciones de grabación: Grabar en oficina, mostrar pantalla

## Producción

Título: Cómo nivelar un piso
Proyecto: OBRABIEN
Formato: Reel
Idea central: La IA puede ayudar a cualquier persona a resolver problemas cotidianos.
Objetivo general: Presentar la aplicación.
Objetivo del espectador:
- Descargue la aplicación
- Entienda el problema
- Cambie su forma de trabajar
Duración estimada: 90

## Recursos globales

Música principal: Instrumental suave, sin letra
Intro: Logo animado, 2 segundos

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Captar atención mostrando el problema en 3 segundos.
Duración estimada: 15
Emoción: Sorpresa
Personajes:
- Don José
Locación: Obra
Plano: Primer plano
Texto hablado: ¿Sabías que un piso mal nivelado te puede costar caro?
Transición: Corte seco

### Escena 2

Tipo: Problema
Objetivo narrativo: Mostrar las consecuencias reales de un piso mal nivelado.
Duración estimada: 20
Personajes:
- Don José
Locación: Obra
Plano: Plano detalle
Texto hablado: Grietas, muebles que se mueven solos, puertas que no cierran bien.
Notas: Buscar tomas reales de grietas en Activos. Si no hay, usar una recreación simple.

### Escena 3

Tipo: Solución
Objetivo narrativo: Explicar cómo la app ayuda a resolverlo.
Duración estimada: 35
Personajes:
- Don José
Plano: Plano cenital
Texto hablado: Con la app medís el desnivel en segundos, sin herramientas caras.
Prompt IA (video): Toma cenital de un nivel láser proyectando una línea recta.

### Escena 4

Tipo: CTA
Objetivo narrativo: Cerrar con el llamado a la acción.
Duración estimada: 20
Texto hablado: Descargala gratis, el link está en la bio.
Transición: Fade a logo
`;

// CBD 2 — "esqueleto parcial": solo Tipo + Objetivo narrativo por escena,
// sin Contexto ni Recursos globales, con un typo deliberado
// ("Ubicación:" en vez de "Locación:") para confirmar que se ignora en
// silencio en vez de romper el parseo.
const CBD_2_ESQUELETO = `# Creative Blueprint v1

Autor: ChatGPT
Fecha: 2026-07-31

## Producción

Título: 5 errores al comprar cerámica
Proyecto: OBRABIEN

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Enganchar con "el error #1 que casi todos cometen".

### Escena 2

Tipo: Problema
Objetivo narrativo: Nombrar los 5 errores rápido, uno por uno.
Ubicación: Local de cerámicas

### Escena 3

Tipo: Solución
Objetivo narrativo: Dar el criterio correcto para elegir bien.

### Escena 4

Tipo: CTA
Objetivo narrativo: Invitar a seguir la cuenta para más tips.
`;

// CBD 3, primera ronda — el documento ORIGINAL que rompía Notas con saltos
// de línea, generado antes de existir la regla de una sola línea. Se
// mantiene tal cual para documentar qué le pasa al parser real si alguna
// vez recibe texto con este formato viejo — no es el formato que se le
// pide a ChatGPT hoy (ver prompt-plantilla, sección 4 del documento
// técnico), así que la pérdida de datos que produce es esperada, no un
// bug a corregir acá.
const CBD_3_RONDA_1_FORMATO_VIEJO = `# Creative Blueprint v1

Autor: ChatGPT
Fecha: 2026-07-31

## Producción

Título: Herramientas que toda dueña de casa necesita
Proyecto: OBRABIEN
Objetivo del espectador:
- Sienta que puede resolver cosas sola
- Guarde el video para volver a verlo

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Mostrar el kit completo de una vez.
Personajes: Don José, Ana
Locación: Bodega de herramientas
Texto hablado: Te voy a mostrar 7 herramientas: las vas a necesitar todas.
Notas: Grabar con buena luz natural, preferible en la mañana.
Recursos necesarios: en este caso ninguno especial, ya los tenemos todos.

### Escena 2

Tipo: Descubrimiento
Objetivo narrativo: Explicar la primera herramienta.
Texto hablado: Empezamos con el nivel.

Sirve para saber si algo está realmente derecho.

Notas: Esta escena puede filmarse junto con la 3 para ahorrar tiempo de
grabación.

Revisar con Ana si prefiere grabar ambas el mismo día.
`;

// CBD 3, segunda ronda — mismo escenario adversarial, ya con Notas en una
// sola línea, más una línea en blanco deliberada en medio de la lista
// "Objetivo del espectador" para confirmar que el hallazgo 2 de esa ronda
// (ítems huérfanos tras una línea en blanco) quedó resuelto.
const CBD_3_RONDA_2_LISTA_CON_BLANCO = `# Creative Blueprint v1

Autor: ChatGPT
Fecha: 2026-07-31

## Producción

Título: Herramientas que toda dueña de casa necesita
Proyecto: OBRABIEN
Objetivo del espectador:
- Sienta que puede resolver cosas sola
- Guarde el video para volver a verlo

- Comparta el video con una amiga

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Mostrar el kit completo de una vez.
Personajes:
- Don José
- Ana
Locación: Bodega de herramientas
Texto hablado: Te voy a mostrar 7 herramientas que vas a necesitar todas, sin excepción.
Notas: Grabar con buena luz natural, preferible en la mañana. Ya tenemos todas las herramientas, no hace falta comprar nada.

### Escena 2

Tipo: Descubrimiento
Objetivo narrativo: Explicar la primera herramienta.
Texto hablado: Empezamos con el nivel, sirve para saber si algo está realmente derecho.
Notas: Esta escena puede filmarse junto con la 3 para ahorrar tiempo. Confirmar con Ana si prefiere grabar ambas el mismo día.
`;

describe("parsearBlueprint — CBD 1, caso feliz", () => {
  it("parsea sin errores ni advertencias de estructura", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.advertencias).toEqual([]);
  });

  it("reconoce las 4 escenas en orden de aparición", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ, BIBLIOTECA);
    expect(resultado.escenas).toHaveLength(4);
    expect(resultado.escenas.map((e) => e.tipo)).toEqual(["GANCHO", "PROBLEMA", "SOLUCION", "CTA"]);
  });

  it("captura Contexto como texto crudo completo, sin parsear campos", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ, BIBLIOTECA);
    expect(resultado.contexto).toContain("Plataforma: TikTok");
    expect(resultado.contexto).toContain("Restricciones de grabación: Grabar en oficina, mostrar pantalla");
  });

  it("parsea Producción y Recursos globales completos", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ, BIBLIOTECA);
    expect(resultado.produccion).toMatchObject({
      titulo: "Cómo nivelar un piso",
      proyecto: "OBRABIEN",
      formato: "Reel",
      objetivoEspectador: ["Descargue la aplicación", "Entienda el problema", "Cambie su forma de trabajar"],
      duracionEstimada: 90,
    });
    expect(resultado.recursosGlobales).toMatchObject({
      musicaPrincipal: "Instrumental suave, sin letra",
      intro: "Logo animado, 2 segundos",
      outro: "",
    });
  });

  it("cada escena trae Personajes, Locación, Plano y Texto hablado correctos", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ, BIBLIOTECA);
    expect(resultado.escenas[0]).toMatchObject({
      personajes: ["Don José"],
      locacion: "Obra",
      plano: "Primer plano",
      textoHablado: "¿Sabías que un piso mal nivelado te puede costar caro?",
      duracionEstimada: 15,
    });
  });
});

describe("parsearBlueprint — CBD 2, esqueleto parcial", () => {
  it("es válido con solo Tipo + Objetivo narrativo por escena", () => {
    const resultado = parsearBlueprint(CBD_2_ESQUELETO, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.escenas).toHaveLength(4);
  });

  it("no tiene Contexto ni Recursos globales — secciones omitidas por completo", () => {
    const resultado = parsearBlueprint(CBD_2_ESQUELETO, BIBLIOTECA);
    expect(resultado.contexto).toBeNull();
    expect(resultado.recursosGlobales).toBeNull();
  });

  it('ignora en silencio el typo "Ubicación:" — la Locación queda vacía, sin error', () => {
    const resultado = parsearBlueprint(CBD_2_ESQUELETO, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.escenas[1].locacion).toBe("");
  });
});

describe("parsearBlueprint — CBD 3, primera ronda (formato viejo, documentado, no corregido)", () => {
  it("sigue siendo válido — la pérdida de datos es de campos opcionales, no bloqueante", () => {
    const resultado = parsearBlueprint(CBD_3_RONDA_1_FORMATO_VIEJO, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
  });

  it("Personajes escrito inline con comas (formato pre-lista) se pierde, no se recupera como texto", () => {
    const resultado = parsearBlueprint(CBD_3_RONDA_1_FORMATO_VIEJO, BIBLIOTECA);
    expect(resultado.escenas[0].personajes).toEqual([]);
  });

  it("Texto hablado y Notas multilínea quedan truncados en la Escena 2, tal como predijo el trace original", () => {
    const resultado = parsearBlueprint(CBD_3_RONDA_1_FORMATO_VIEJO, BIBLIOTECA);
    const escena2 = resultado.escenas[1];
    // La oración completa era "Empezamos con el nivel. Sirve para saber si
    // algo está realmente derecho." — el parser de una-sola-línea corta en
    // el primer salto de línea físico y descarta el resto.
    expect(escena2.textoHablado).toBe("Empezamos con el nivel.");
    // La nota completa era "...para ahorrar tiempo de grabación. Revisar
    // con Ana si prefiere grabar ambas el mismo día." — queda cortada a
    // mitad de oración.
    expect(escena2.notas).toBe("Esta escena puede filmarse junto con la 3 para ahorrar tiempo de");
  });
});

describe("parsearBlueprint — CBD 3, segunda ronda (línea en blanco en lista)", () => {
  it("el tercer ítem de Objetivo del espectador ya NO se pierde tras la línea en blanco", () => {
    const resultado = parsearBlueprint(CBD_3_RONDA_2_LISTA_CON_BLANCO, BIBLIOTECA);
    expect(resultado.produccion?.objetivoEspectador).toEqual([
      "Sienta que puede resolver cosas sola",
      "Guarde el video para volver a verlo",
      "Comparta el video con una amiga",
    ]);
  });

  it("Personajes en formato de lista (ya no comas) se resuelven ambos correctamente", () => {
    const resultado = parsearBlueprint(CBD_3_RONDA_2_LISTA_CON_BLANCO, BIBLIOTECA);
    expect(resultado.escenas[0].personajes).toEqual(["Don José", "Ana"]);
  });

  it("Notas de una sola línea con dos ideas separadas por punto se capturan completas", () => {
    const resultado = parsearBlueprint(CBD_3_RONDA_2_LISTA_CON_BLANCO, BIBLIOTECA);
    expect(resultado.escenas[0].notas).toBe(
      "Grabar con buena luz natural, preferible en la mañana. Ya tenemos todas las herramientas, no hace falta comprar nada.",
    );
  });

  it("sin errores ni advertencias de nombres — todos los Personajes/Locación coinciden con la Biblioteca", () => {
    const resultado = parsearBlueprint(CBD_3_RONDA_2_LISTA_CON_BLANCO, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.advertencias).toEqual([]);
  });
});

// Simula exactamente lo que produce copiar un guion ya renderizado desde
// ChatGPT al portapapeles: los "#"/"##"/"###" de Markdown desaparecen
// porque el navegador copia el texto visible, no el Markdown fuente.
function quitarHashes(texto: string): string {
  return texto
    .split("\n")
    .map((l) => l.replace(/^#{1,6}\s*/, ""))
    .join("\n");
}

const CBD_1_FELIZ_SIN_HASH = quitarHashes(CBD_1_FELIZ);

describe("parsearBlueprint — CBD sin '#' (Bug 1: ChatGPT renderizado pegado sin Markdown)", () => {
  it("parsea las mismas 4 escenas, sin errores ni advertencias, igual que con '#'", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ_SIN_HASH, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.advertencias).toEqual([]);
    expect(resultado.escenas).toHaveLength(4);
    expect(resultado.escenas.map((e) => e.tipo)).toEqual(["GANCHO", "PROBLEMA", "SOLUCION", "CTA"]);
  });

  it("Producción, Contexto y Recursos globales se parsean igual sin '#'", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ_SIN_HASH, BIBLIOTECA);
    expect(resultado.produccion).toMatchObject({ titulo: "Cómo nivelar un piso", proyecto: "OBRABIEN" });
    expect(resultado.contexto).toContain("Plataforma: TikTok");
    expect(resultado.recursosGlobales).toMatchObject({ musicaPrincipal: "Instrumental suave, sin letra" });
  });

  it("cada escena trae Personajes, Locación, Plano y Texto hablado correctos sin '#'", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ_SIN_HASH, BIBLIOTECA);
    expect(resultado.escenas[0]).toMatchObject({
      personajes: ["Don José"],
      locacion: "Obra",
      plano: "Primer plano",
      textoHablado: "¿Sabías que un piso mal nivelado te puede costar caro?",
    });
  });

  it("la forma CON '#' sigue funcionando exactamente igual (no regresiona)", () => {
    const resultado = parsearBlueprint(CBD_1_FELIZ, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.escenas).toHaveLength(4);
  });
});

describe("parsearBlueprint — palabras de encabezado dentro de contenido (Bug 1: sin falsos positivos)", () => {
  const CBD_FALSOS_POSITIVOS = quitarHashes(`# Creative Blueprint v1

Autor: ChatGPT
Fecha: 2026-07-31

## Producción

Título: Prueba de falsos positivos
Proyecto: OBRABIEN
Objetivo del espectador:
- Entienda el Contexto del proyecto
- Producción

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Probar que las palabras dentro de texto no se confunden con encabezados.
Texto hablado: Primero quiero hablar del Contexto en el que vivimos, y después de la Producción completa de este video sobre una escena real.
`);

  it('"Contexto" y "Producción" dentro de un texto hablado o de un ítem de lista no se interpretan como encabezados', () => {
    const resultado = parsearBlueprint(CBD_FALSOS_POSITIVOS, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.produccion?.titulo).toBe("Prueba de falsos positivos");
    expect(resultado.produccion?.objetivoEspectador).toEqual(["Entienda el Contexto del proyecto", "Producción"]);
    expect(resultado.escenas).toHaveLength(1);
    expect(resultado.escenas[0].textoHablado).toContain("Contexto en el que vivimos");
    expect(resultado.escenas[0].textoHablado).toContain("Producción completa");
  });
});

describe("parsearBlueprint — PREPARACION-FIX-1, FIX 1: etiquetas sin tilde", () => {
  const CBD_SIN_TILDES = `# Creative Blueprint v1

Autor: ChatGPT
Fecha: 2026-07-31

## Produccion

Titulo: Video sin tildes en las etiquetas
Proyecto: OBRABIEN
Duracion estimada: 20

## Escenas

### Escena 1

Tipo: Solucion
Objetivo narrativo: Confirmar que las etiquetas sin tilde se reconocen igual que con tilde.
Locacion: Obra
Duracion estimada: 20
`;

  it('"Produccion"/"Titulo"/"Duracion estimada" sin tilde se reconocen igual que "Producción"/"Título"/"Duración estimada"', () => {
    const resultado = parsearBlueprint(CBD_SIN_TILDES, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.produccion?.titulo).toBe("Video sin tildes en las etiquetas");
    expect(resultado.produccion?.duracionEstimada).toBe(20);
  });

  it('"Solucion" (valor de Tipo) y "Locacion" (etiqueta de escena) sin tilde se reconocen igual', () => {
    const resultado = parsearBlueprint(CBD_SIN_TILDES, BIBLIOTECA);
    expect(resultado.escenas[0]).toMatchObject({ tipo: "SOLUCION", locacion: "Obra", duracionEstimada: 20 });
  });

  it("nunca modifica el valor libre que sigue a la etiqueta, solo la reconoce sin tilde", () => {
    const texto = `# Creative Blueprint v1

## Produccion

Titulo: Título con tílde adentro, sin tocar

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Probar.
`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.produccion?.titulo).toBe("Título con tílde adentro, sin tocar");
  });
});

describe("parsearBlueprint — PREPARACION-FIX-1, FIX 2: 'Sin asignar' se comporta como campo vacío", () => {
  const CBD_SIN_ASIGNAR = `# Creative Blueprint v1

## Producción

Título: Video con Sin asignar

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Confirmar que "Sin asignar" no genera advertencias ni candidatos a resolver.
Personajes:
- Sin asignar
Locación: sin asignar
Plano: SIN ASIGNAR
`;

  it('"Sin asignar" (cualquier mayúscula) en Personajes/Locación/Plano no queda como valor ni genera advertencias', () => {
    const resultado = parsearBlueprint(CBD_SIN_ASIGNAR, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.advertencias).toEqual([]);
    expect(resultado.escenas[0].personajes).toEqual([]);
    expect(resultado.escenas[0].locacion).toBe("");
    expect(resultado.escenas[0].plano).toBe("");
  });

  it('un Personaje real junto a "Sin asignar" en la misma lista conserva el real y descarta solo "Sin asignar"', () => {
    const texto = `# Creative Blueprint v1

## Producción

Título: Prueba

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Probar.
Personajes:
- Don José
- Sin asignar
`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.escenas[0].personajes).toEqual(["Don José"]);
  });
});

describe("parsearBlueprint — casos de error explícitos", () => {
  it("rechaza un CBD sin encabezado de versión, sin lanzar excepción", () => {
    const texto = `## Producción\n\nTítulo: Algo\n\n## Escenas\n\n### Escena 1\n\nTipo: Gancho\nObjetivo narrativo: Probar.\n`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0]).toContain("encabezado de versión");
    expect(resultado.version).toBeNull();
    expect(resultado.escenas).toEqual([]);
  });

  it("rechaza un Blueprint de una versión mayor no soportada", () => {
    const texto = `# Creative Blueprint v2\n\n## Producción\n\nTítulo: Algo\n`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0]).toContain("v2");
    expect(resultado.version).toBe(2);
  });

  it("rechaza un CBD sin ninguna escena", () => {
    const texto = `# Creative Blueprint v1\n\n## Producción\n\nTítulo: Video sin escenas\n`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.errores).toContain("El Blueprint no tiene ninguna escena.");
  });

  it("rechaza una escena sin Tipo, señalando cuál escena y qué campo falta", () => {
    const texto = `# Creative Blueprint v1

## Producción

Título: Video de prueba

## Escenas

### Escena 1

Objetivo narrativo: Esta escena no tiene Tipo.
`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.errores.some((e) => e.includes("posición 1") && e.includes("Tipo"))).toBe(true);
  });

  it("rechaza una escena sin Objetivo narrativo", () => {
    const texto = `# Creative Blueprint v1

## Producción

Título: Video de prueba

## Escenas

### Escena 1

Tipo: Gancho
`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.errores.some((e) => e.includes("Objetivo narrativo"))).toBe(true);
  });

  it("rechaza un CBD sin Título de Producción", () => {
    const texto = `# Creative Blueprint v1

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Probar.
`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.errores).toContain("Falta el Título de la Producción.");
  });

  it("advierte (sin bloquear) cuando un Personaje/Locación/Plano/Proyecto no coincide con la Biblioteca", () => {
    const texto = `# Creative Blueprint v1

## Producción

Título: Video de prueba
Proyecto: MARCA_INEXISTENTE

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Probar.
Personajes:
- Alguien Desconocido
Locación: Lugar inexistente
Plano: Plano inventado
`;
    const resultado = parsearBlueprint(texto, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.advertencias.length).toBeGreaterThanOrEqual(4);
    expect(resultado.advertencias.some((a) => a.includes("MARCA_INEXISTENTE"))).toBe(true);
    expect(resultado.advertencias.some((a) => a.includes("Alguien Desconocido"))).toBe(true);
  });
});

// MIGRATION — Prompt Oficial siempre Markdown crudo: el Prompt Oficial
// ahora le pide SIEMPRE a ChatGPT que responda dentro de un único bloque
// de código Markdown — así que lo normal es que el usuario pegue la
// respuesta completa, cerca de código incluida.
describe("parsearBlueprint / tieneEstructuraDeBlueprint — cerca de código Markdown (```markdown ... ```)", () => {
  const CBD_MINIMO = `# Creative Blueprint v1

## Producción

Título: Video de prueba

## Escenas

### Escena 1

Tipo: Gancho
Objetivo narrativo: Probar.
`;

  it("parsearBlueprint entiende el CBD envuelto en \`\`\`markdown ... \`\`\`, igual que sin envolver", () => {
    const envuelto = `\`\`\`markdown\n${CBD_MINIMO}\`\`\``;
    const sinEnvolver = parsearBlueprint(CBD_MINIMO, BIBLIOTECA);
    const resultado = parsearBlueprint(envuelto, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.produccion?.titulo).toBe(sinEnvolver.produccion?.titulo);
    expect(resultado.escenas.length).toBe(sinEnvolver.escenas.length);
  });

  it("también entiende una cerca de código sin la etiqueta 'markdown' (``` a secas)", () => {
    const envuelto = `\`\`\`\n${CBD_MINIMO}\`\`\``;
    const resultado = parsearBlueprint(envuelto, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.produccion?.titulo).toBe("Video de prueba");
  });

  it("tolera líneas en blanco antes de la cerca de apertura y después de la de cierre", () => {
    const envuelto = `\n\n\`\`\`markdown\n${CBD_MINIMO}\`\`\`\n\n`;
    const resultado = parsearBlueprint(envuelto, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.produccion?.titulo).toBe("Video de prueba");
  });

  it("tieneEstructuraDeBlueprint también reconoce el texto envuelto en la cerca", () => {
    const envuelto = `\`\`\`markdown\n${CBD_MINIMO}\`\`\``;
    expect(tieneEstructuraDeBlueprint(envuelto)).toBe(true);
    expect(tieneEstructuraDeBlueprint(CBD_MINIMO)).toBe(true);
  });

  it("un texto sin cerca de código (caso normal) sigue funcionando exactamente igual", () => {
    const resultado = parsearBlueprint(CBD_MINIMO, BIBLIOTECA);
    expect(resultado.errores).toEqual([]);
    expect(resultado.produccion?.titulo).toBe("Video de prueba");
  });

  it("una cerca de código abierta pero nunca cerrada no se toca (no hay cerca de cierre que quitar)", () => {
    const sinCierre = `\`\`\`markdown\n${CBD_MINIMO}`;
    // Sin cierre, la primera línea sigue siendo la cerca de apertura, no el
    // encabezado de versión — se comporta como cualquier texto sin la
    // estructura esperada, en vez de fallar de forma confusa.
    expect(tieneEstructuraDeBlueprint(sinCierre)).toBe(false);
  });
});
