import { describe, expect, it } from "vitest";
import { construirPrompt } from "./blueprint-prompt";
import { IDENTIDAD_SIN_CONTENIDO } from "./identity-compiler";

/**
 * Copia literal de `construirPrompt` tal como existía en el commit
 * 8ea1be5 (UX Migration 2.3, justo antes de la reorganización en cuatro
 * partes de UX-MIGRATION-2.4 y de la extracción a este archivo) — pegada
 * directamente desde
 * `git show 8ea1be5:src/components/contexto-para-chatgpt.tsx`, no
 * retipeada de memoria. Sirve como referencia dorada: la migración 2.4 es
 * puramente una reorganización de CÓMO se arma el prompt, así que su
 * salida tiene que ser byte-a-byte idéntica a esta función para cualquier
 * input, para siempre (no solo hoy).
 */
const FORMATO_CBD_ANTIGUO = `# Creative Blueprint v1

## Contexto
[Un párrafo breve: por qué esta idea encaja con la marca, para quién es.]

## Producción
Título: ...
Objetivo general: ...

## Escenas

### Escena 1
Tipo: [Gancho | Problema | Descubrimiento | Solución | CTA | B-roll | Transición | Otra]
Objetivo narrativo: ...
Emoción: [opcional]
Personajes:
- ...
Locación: ...
Plano: ...
Texto hablado: ...
Texto en pantalla: ...

### Escena 2
[repetir la misma estructura por cada escena que necesite el video]`;

function construirPromptAntiguo(idea: string, contexto: string): string {
  const hayContexto = contexto.trim().length > 0 && contexto !== IDENTIDAD_SIN_CONTENIDO;
  const bloqueMarca = hayContexto
    ? contexto
    : "Todavía no tenemos información cargada sobre esta marca — generá el guion apoyándote solamente en la idea de arriba, con un tono neutro y profesional.";

  return `Tu idea:
"${idea}"

Usando esta idea y el siguiente contexto de marca, generá SOLO la parte narrativa de un Creative Blueprint Document para un video corto: contexto breve, título, objetivo general, y el guion escena por escena.

Para Personajes, Locaciones y Planos utilizá nombres narrativos naturales (ej.: Presentador, Cliente, Oficina, Taller, Primer plano). No intentes adivinar los nombres exactos de mi Biblioteca — Content OS los va a resolver durante la importación.

${bloqueMarca}

---

IMPORTANTE: tu respuesta la va a leer un programa (un parser), no una persona — por eso el formato de abajo es obligatorio al pie de la letra, no una sugerencia de estilo:

- Completá ÚNICAMENTE la plantilla de abajo. No la resumas, no la reescribas como si fuera un documento o un posteo, no agregues introducción ni comentarios fuera de ella.
- Los encabezados Markdown (##, ###) tienen que quedar EXACTAMENTE iguales — mismo texto, mismos símbolos "#", mismo orden. Nunca los conviertas en texto plano ni en negrita.
- Cada etiqueta (ej. "Tipo:", "Texto hablado:") va seguida del valor en la MISMA línea, después de los dos puntos — nunca dejes la etiqueta sola y el contenido en la línea siguiente, aunque el texto sea largo.
- Las listas (como "Personajes:") llevan un guion y un espacio ("- ") antes de cada ítem, uno por línea — nunca el nombre suelto en su propia línea.
- Agregá tantos bloques "### Escena N" como necesite el video, siguiendo exactamente la misma estructura de la Escena 1.

Plantilla a completar:

${FORMATO_CBD_ANTIGUO}`;
}

describe("construirPrompt — UX-MIGRATION-2.4 byte-identidad", () => {
  const casos: { nombre: string; idea: string; contexto: string }[] = [
    {
      nombre: "con contexto de marca real",
      idea: "Un video mostrando cómo armamos el importador de Blueprint",
      contexto: "Marca: OBRABIEN.\nTono: cercano, directo.\nPúblico: dueños de PyMEs de construcción.",
    },
    {
      nombre: "sin contexto de marca (IDENTIDAD_SIN_CONTENIDO)",
      idea: "Idea sin marca todavía",
      contexto: IDENTIDAD_SIN_CONTENIDO,
    },
    {
      nombre: "con contexto en blanco (solo espacios)",
      idea: "Otra idea",
      contexto: "   ",
    },
    {
      nombre: "con caracteres especiales en la idea (comillas, saltos de línea, backticks)",
      idea: 'Idea con "comillas", backticks `raros`, y\nun salto de línea',
      contexto: "Contexto con ${interpolación} falsa y backticks `también`.",
    },
    {
      nombre: "con idea vacía",
      idea: "",
      contexto: "Contexto normal",
    },
  ];

  for (const { nombre, idea, contexto } of casos) {
    it(`es idéntico al prompt pre-2.4, carácter por carácter — ${nombre}`, () => {
      expect(construirPrompt(idea, contexto)).toBe(construirPromptAntiguo(idea, contexto));
    });
  }
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

  it("con locaciones=[] y planos=[] explícitos es idéntico al prompt pre-2.5 (sin argumentos)", () => {
    expect(construirPrompt(idea, contexto, [], [])).toBe(construirPrompt(idea, contexto));
    expect(construirPrompt(idea, contexto, [], [])).toBe(construirPromptAntiguo(idea, contexto));
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
