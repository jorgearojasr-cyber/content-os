import { IDENTIDAD_SIN_CONTENIDO } from "./identity-compiler";

/** Solo lo que ChatGPT no puede saber por su cuenta: la narrativa. Proyecto,
 * Autor, Fecha, Público objetivo y la Duración total ya los completa
 * Content OS (ver `confirmarImportacionBlueprint`), y Formato se elige con
 * un selector en la revisión — pedírselos de vuelta a ChatGPT era ruido
 * (UX Migration 1.2). Personajes/Locación/Plano se mantienen como campos
 * del CBD, pero ya no representan referencias exactas de la Biblioteca —
 * ver la instrucción en `construirBloqueIdea`. La plantilla completa (con
 * `## Contexto`) volvió a incluirse literalmente en UX Migration 2.3 —
 * ver ese commit para el diagnóstico exacto de por qué ChatGPT dejaba de
 * respetarla. */
const FORMATO_CBD = `# Creative Blueprint v1

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

/** Parte 1 de 4 — Idea del usuario, tal cual la escribió (para que sienta
 * que la plataforma lo escuchó). Sin cambios de contenido desde antes de
 * UX Migration 2.4 — solo se extrajo a su propia función. */
function construirBloqueIdea(idea: string): string {
  return `Tu idea:
"${idea}"

Usando esta idea y el siguiente contexto de marca, generá SOLO la parte narrativa de un Creative Blueprint Document para un video corto: contexto breve, título, objetivo general, y el guion escena por escena.

Para Personajes, Locaciones y Planos utilizá nombres narrativos naturales (ej.: Presentador, Cliente, Oficina, Taller, Primer plano). No intentes adivinar los nombres exactos de mi Biblioteca — Content OS los va a resolver durante la importación.`;
}

/** Parte 2 de 4 — Contexto de Marca, ya compilado por `compileIdentity()`
 * (sin tocar esa función), o el texto de reemplazo cuando la Marca activa
 * todavía no tiene Identidad cargada. Sin cambios de contenido. */
function construirBloqueContextoDeMarca(contexto: string): string {
  const hayContexto = contexto.trim().length > 0 && contexto !== IDENTIDAD_SIN_CONTENIDO;
  return hayContexto
    ? contexto
    : "Todavía no tenemos información cargada sobre esta marca — generá el guion apoyándote solamente en la idea de arriba, con un tono neutro y profesional.";
}

/**
 * Parte 4 de 4 — Bloque estratégico (UX-MIGRATION-2.4): el punto de
 * extensión para cuando exista una clasificación de intención (ej. el
 * video es un tutorial, un storytime, una vidriera de producto) y se
 * quiera insertar una estrategia narrativa específica antes de las reglas
 * del parser. Hoy siempre vacío — sin clasificación, sin categorías, sin
 * cambio de comportamiento; ver UX-MIGRATION-2.4. Cuando exista esa etapa,
 * lo natural es que viva ANTES de esta función (en `HoyScreen` o en un
 * server action nuevo, con acceso a IA) y le pase acá la clasificación ya
 * resuelta — esta función no debería calcularla. Datos ya disponibles en
 * ese punto para decidir: el texto de `idea` y el `contexto` de la Marca
 * activa (ambos ya llegan acá); el historial de Producciones de la Marca
 * NO está disponible hoy en quien llama a `construirPrompt` — si en algún
 * momento se vuelve relevante para la clasificación, hay que empezar a
 * pasarlo desde `HoyScreen` hacia abajo. */
function construirBloqueEstrategico(_idea: string, _contexto: string): string {
  return "";
}

/**
 * Parte 3 de 4 — Núcleo CBD: la plantilla del Creative Blueprint Document
 * y las reglas explícitas de compatibilidad con `parsearBlueprint()`,
 * restauradas en UX Migration 2.3 (ver ese commit para el diagnóstico de
 * por qué ChatGPT dejaba de respetarlas). No depende de la idea ni de la
 * Marca — el mismo bloque para cualquier prompt. */
function construirNucleoCBD(): string {
  return `IMPORTANTE: tu respuesta la va a leer un programa (un parser), no una persona — por eso el formato de abajo es obligatorio al pie de la letra, no una sugerencia de estilo:

- Completá ÚNICAMENTE la plantilla de abajo. No la resumas, no la reescribas como si fuera un documento o un posteo, no agregues introducción ni comentarios fuera de ella.
- Los encabezados Markdown (##, ###) tienen que quedar EXACTAMENTE iguales — mismo texto, mismos símbolos "#", mismo orden. Nunca los conviertas en texto plano ni en negrita.
- Cada etiqueta (ej. "Tipo:", "Texto hablado:") va seguida del valor en la MISMA línea, después de los dos puntos — nunca dejes la etiqueta sola y el contenido en la línea siguiente, aunque el texto sea largo.
- Las listas (como "Personajes:") llevan un guion y un espacio ("- ") antes de cada ítem, uno por línea — nunca el nombre suelto en su propia línea.
- Agregá tantos bloques "### Escena N" como necesite el video, siguiendo exactamente la misma estructura de la Escena 1.

Plantilla a completar:

${FORMATO_CBD}`;
}

/**
 * El prompt completo que el usuario copia y pega en ChatGPT (usado por
 * `ContextoParaChatGPT`) — compuesto en cuatro partes explícitas y
 * componibles (UX-MIGRATION-2.4): Idea del usuario, Contexto de Marca,
 * Bloque estratégico (vacío hoy) y Núcleo CBD. Reorganización puramente
 * interna de CÓMO se arma el prompt — el texto que ve el usuario es
 * byte-a-byte idéntico al de antes de esta migración (verificado con un
 * test dedicado, ver `blueprint-prompt.test.ts`). Cuando
 * `construirBloqueEstrategico` empiece a devolver contenido real, aparece
 * automáticamente acá, antes del separador "---" y de las reglas del
 * parser. */
export function construirPrompt(idea: string, contexto: string): string {
  const bloqueIdea = construirBloqueIdea(idea);
  const bloqueContextoDeMarca = construirBloqueContextoDeMarca(contexto);
  const bloqueEstrategico = construirBloqueEstrategico(idea, contexto);
  const nucleoCBD = construirNucleoCBD();

  return `${bloqueIdea}

${bloqueContextoDeMarca}

${bloqueEstrategico}---

${nucleoCBD}`;
}
