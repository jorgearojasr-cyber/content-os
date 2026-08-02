import { describe, expect, it } from "vitest";
import { construirPrompt } from "./blueprint-prompt";
import { IDENTIDAD_SIN_CONTENIDO } from "./identity-compiler";

/**
 * Nota histórica: entre UX-MIGRATION-2.4 y UX-MIGRATION-4A, este archivo
 * mantuvo una copia literal de `construirPrompt` tal como existía en el
 * commit 8ea1be5 (justo antes de la reorganización en cuatro partes) y
 * probaba byte-identidad total contra ella — porque durante ese período
 * cada migración prometía explícitamente no cambiar el contenido del
 * prompt, solo cómo se armaba internamente.
 *
 * Fix 2 (post UX-MIGRATION-4) es la primera migración que cambia el
 * contenido de `FORMATO_CBD` a propósito — reincorpora "Recursos
 * necesarios", "Música" y "Transición" como campos opcionales, según el
 * Principio acordado ("ayuda a escribir mejor guion / grabar mejor la
 * escena / producir mejor el video"). Esa garantía de byte-identidad total
 * ya no aplica y se retira acá — las pruebas de abajo verifican
 * puntualmente que el contenido nuevo está presente y bien ubicado, en
 * vez de mantener una copia paralela del prompt entero que hay que
 * actualizar a mano cada vez que el contenido cambia legítimamente.
 */
describe("construirPrompt — Fix 2: campos opcionales (Recursos necesarios / Música / Transición)", () => {
  const idea = "Un video mostrando cómo armamos el importador de Blueprint";
  const contexto = "Marca: OBRABIEN.\nTono: cercano, directo.\nPúblico: dueños de PyMEs de construcción.";

  it("incluye las tres líneas opcionales nuevas, con su instrucción de cuándo usarlas", () => {
    const prompt = construirPrompt(idea, contexto);
    expect(prompt).toContain("Recursos necesarios: [opcional — solo si hay algo concreto que preparar antes de grabar]");
    expect(prompt).toContain("Música: [opcional — solo si tenés una sugerencia real de estilo o canción]");
    expect(prompt).toContain(
      "Transición: [opcional — solo si conviene una transición específica hacia la siguiente escena]",
    );
  });

  it("las tres líneas van después de 'Texto en pantalla' y antes de '### Escena 2', dentro de la Escena 1", () => {
    const prompt = construirPrompt(idea, contexto);
    const posTextoPantalla = prompt.indexOf("Texto en pantalla: ...");
    const posRecursos = prompt.indexOf("Recursos necesarios: [opcional");
    const posMusica = prompt.indexOf("Música: [opcional");
    const posTransicion = prompt.indexOf("Transición: [opcional");
    const posEscena2 = prompt.indexOf("### Escena 2");

    expect(posTextoPantalla).toBeGreaterThan(-1);
    expect(posRecursos).toBeGreaterThan(posTextoPantalla);
    expect(posMusica).toBeGreaterThan(posRecursos);
    expect(posTransicion).toBeGreaterThan(posMusica);
    expect(posEscena2).toBeGreaterThan(posTransicion);
  });

  it("incluye la instrucción de omitir la línea entera en vez de dejarla vacía o inventar contenido", () => {
    const prompt = construirPrompt(idea, contexto);
    expect(prompt).toContain(
      '"Recursos necesarios", "Música" y "Transición" son opcionales: agregalas solo cuando tengas una sugerencia concreta que ayude a preparar, grabar o producir mejor la escena — si no aportan nada real, omití la línea entera, nunca la dejes vacía ni inventes algo genérico.',
    );
  });

  it("el resultado es estable para el mismo input (sin aleatoriedad ni dependencia de fecha/hora)", () => {
    expect(construirPrompt(idea, contexto)).toBe(construirPrompt(idea, contexto));
  });
});

describe("construirPrompt — UX-MIGRATION-2.5 Biblioteca disponible", () => {
  const idea = "Un video mostrando cómo armamos el importador de Blueprint";
  const contexto = "Marca: OBRABIEN.\nTono: cercano, directo.\nPúblico: dueños de PyMEs de construcción.";

  const IMPORTANTE_BIBLIOTECA =
    "IMPORTANTE:\n" +
    "Los Personajes disponibles ya aparecen más arriba dentro del Contexto de Marca.\n" +
    "Para los campos Personajes, Locación y Plano utilizá preferentemente los nombres existentes en la Biblioteca del proyecto.\n" +
    "No inventes nuevos nombres cuando alguno existente sirva para la escena.\n" +
    'Si realmente ninguno aplica, escribí "Sin asignar".';

  it("con locaciones=[] y planos=[] explícitos es idéntico al prompt sin argumentos (default)", () => {
    expect(construirPrompt(idea, contexto, [], [])).toBe(construirPrompt(idea, contexto));
  });

  it("con Locaciones pero sin Planos, agrega solo la lista de Locaciones", () => {
    const prompt = construirPrompt(idea, contexto, ["Oficina", "Taller"], []);
    expect(prompt).toContain("### Biblioteca disponible");
    expect(prompt).toContain("Locaciones disponibles:\n- Oficina\n- Taller");
    expect(prompt).not.toContain("Planos disponibles:");
    expect(prompt).toContain(IMPORTANTE_BIBLIOTECA);
  });

  it("con Planos pero sin Locaciones, agrega solo la lista de Planos", () => {
    const prompt = construirPrompt(idea, contexto, [], ["Primer plano", "Plano medio"]);
    expect(prompt).toContain("### Biblioteca disponible");
    expect(prompt).toContain("Planos disponibles:\n- Primer plano\n- Plano medio");
    expect(prompt).not.toContain("Locaciones disponibles:");
    expect(prompt).toContain(IMPORTANTE_BIBLIOTECA);
  });

  it("con Locaciones y Planos, agrega ambas listas y la instrucción IMPORTANTE, sin duplicar Personajes", () => {
    const locaciones = ["Oficina", "Taller", "Sala de reuniones"];
    const planos = ["Primer plano", "Plano medio", "Plano americano"];
    const prompt = construirPrompt(idea, contexto, locaciones, planos);

    expect(prompt).toContain(
      "### Biblioteca disponible\n\n" +
        "Locaciones disponibles:\n- Oficina\n- Taller\n- Sala de reuniones\n\n" +
        "Planos disponibles:\n- Primer plano\n- Plano medio\n- Plano americano\n\n" +
        IMPORTANTE_BIBLIOTECA,
    );
    // Personajes no se repiten en la Biblioteca — solo pueden venir del Contexto de Marca ya compilado.
    expect(prompt.match(/### Biblioteca disponible/g)?.length).toBe(1);
    expect(prompt).not.toMatch(/Personajes disponibles:/);
  });

  it("la sección Biblioteca disponible aparece antes de la plantilla CBD (Núcleo)", () => {
    const prompt = construirPrompt(idea, contexto, ["Oficina"], ["Primer plano"]);
    const posBiblioteca = prompt.indexOf("### Biblioteca disponible");
    const posNucleo = prompt.indexOf("IMPORTANTE: tu respuesta la va a leer un programa");
    expect(posBiblioteca).toBeGreaterThan(-1);
    expect(posNucleo).toBeGreaterThan(-1);
    expect(posBiblioteca).toBeLessThan(posNucleo);
  });

  it("sin Locaciones ni Planos, no agrega la sección Biblioteca disponible", () => {
    const prompt = construirPrompt(idea, contexto, [], []);
    expect(prompt).not.toContain("Biblioteca disponible");
  });
});

describe("construirPrompt — IDENTIDAD_SIN_CONTENIDO sigue funcionando (sin marca cargada)", () => {
  it("usa el texto de reemplazo cuando no hay Identidad, y no incluye Biblioteca disponible sin datos", () => {
    const prompt = construirPrompt("Idea sin marca todavía", IDENTIDAD_SIN_CONTENIDO);
    expect(prompt).toContain(
      "Todavía no tenemos información cargada sobre esta marca — generá el guion apoyándote solamente en la idea de arriba, con un tono neutro y profesional.",
    );
    expect(prompt).not.toContain("Biblioteca disponible");
    expect(prompt).toContain("Recursos necesarios: [opcional");
  });
});
