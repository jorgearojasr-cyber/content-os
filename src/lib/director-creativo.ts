import { z } from "zod";

/**
 * DIRECTOR CREATIVO IA — contrato de datos.
 * ------------------------------------------------------------------
 * Nivel A, Patrón 2 (ver `docs/arquitectura/nivel-a-nivel-b.md` y
 * `docs/arquitectura/prompt-oficial.md`): Content OS arma el prompt, el
 * usuario lo corre en la IA que prefiera, el resultado vuelve a pegarse acá.
 * A diferencia de `PlanEdicionSchema` (`ai.ts`), este schema NUNCA se usa
 * con `generarEstructurado()` — Director Creativo no llama directo a ningún
 * proveedor de IA.
 *
 * Este archivo define únicamente la FORMA del análisis — el contrato
 * congelado en PHASE-2-DIRECTOR-CREATIVO-SCHEMA, con `decisionesDeProduccion`
 * como único campo agregado sobre lo ya aprobado en
 * `docs/phase-2/director-creativo-ia.md`. Todavía no arma el prompt ni
 * valida lo pegado por el usuario en ninguna pantalla — eso llega en la
 * fase que implemente Revisión (PHASE-2-IMPLEMENTACION-1 es solo
 * infraestructura, sin UI).
 * ------------------------------------------------------------------
 */

const HallazgoDirectorCreativoSchema = z.object({
  prioridad: z.enum(["Alta", "Media", "Baja"]),
  categoria: z.enum(["Gancho", "Ritmo", "Repetición", "Transición", "CTA", "Duración", "Claridad", "Otro"]),
  titulo: z.string(),
  porQué: z.string(),
  sugerencia: z.string(),
  /** Números de escena a los que se refiere este hallazgo — es lo que
   * permite filtrarlo por escena actual en Copiloto/Grabar, en vez de
   * mostrar el análisis completo fuera de contexto. */
  escenas: z.array(z.number()),
});

/** Los nombres candidatos (`nombre`) los calcula el motor de similitud
 * (Nivel B, `resolverCampo` en `blueprint-import-shared.tsx`) — el Director
 * solo agrega el juicio de cuál conviene y por qué (`encaja`/`porQué`).
 * Dos orígenes distintos dentro del mismo objeto, documentado así en la
 * Matriz de mutabilidad del contrato — no confundirlos al consumir este
 * campo. */
const AlternativaBibliotecaSchema = z.object({
  nombre: z.string(),
  encaja: z.boolean(),
  porQué: z.string(),
});

/** Único campo nuevo agregado al contrato ya aprobado (UX-FLOW-1 /
 * PHASE-2-DIRECTOR-CREATIVO-SCHEMA). Por cada escena que necesita un
 * Personaje, Locación o Recurso: qué busca lograr, por qué (anclado al
 * guion, mismo criterio que `HallazgoDirectorCreativoSchema.porQué`), y las
 * alternativas que ya existen en la Biblioteca del usuario. Deliberadamente
 * NO existe un campo separado para "previsión de edición durante la
 * grabación" — eso ya lo resuelve `hallazgos[]` filtrado por escena. */
const DecisionDeProduccionSchema = z.object({
  escena: z.number(),
  tipo: z.enum(["Personaje", "Locación", "Recurso"]),
  necesidad: z.string(),
  porQué: z.string(),
  alternativasEnBiblioteca: z.array(AlternativaBibliotecaSchema),
  siNingunaEncaja: z.string(),
});

export const DirectorCreativoSchema = z.object({
  resumenGeneral: z.object({
    grabariaAsi: z.boolean(),
    veredicto: z.string(),
    /** 0-100. No es probabilidad de viralidad/éxito — solo la confianza
     * profesional del Director en el storyboard tal como está escrito. */
    confianzaDelDirector: z.number(),
  }),
  hallazgos: z.array(HallazgoDirectorCreativoSchema),
  /** Exactamente 3, ordenadas por impacto — nunca más, nunca menos. */
  mejorasPrioritarias: z.tuple([z.string(), z.string(), z.string()]),
  decisionesDeProduccion: z.array(DecisionDeProduccionSchema),
});

export type AnalisisDirectorCreativo = z.infer<typeof DirectorCreativoSchema>;

/**
 * PROMPT OFICIAL — Director Creativo.
 * ------------------------------------------------------------------
 * PHASE-2-IMPLEMENTACION-2: primer consumidor real del contrato de arriba.
 * Arma el prompt que el usuario copia y corre en la IA que prefiera
 * (Nivel A, Patrón 2 — ver el docblock del schema). El "Rol del sistema" y
 * el "Contexto que recibe" reproducen textualmente lo ya aprobado en
 * `docs/phase-2/director-creativo-ia.md` — no se reformulan acá.
 * ------------------------------------------------------------------
 */

export type EscenaParaAnalisisDirector = {
  numero: number;
  tipo: string;
  objetivoNarrativo: string;
  textoHablado: string;
  textoPantalla: string;
  duracionEstimada: number | null;
  personajes: string[];
  locacion: string;
  plano: string;
};

export type ProduccionParaAnalisisDirector = {
  titulo: string;
  formato: string;
  ideaCentral: string;
  objetivoGeneral: string;
  publicoObjetivo: string;
  duracionEstimada: number | null;
};

const ROL_DEL_SISTEMA = `Actuás como un Director Creativo senior, con años de experiencia real produciendo y superviviendo contenido corto para TikTok, Instagram Reels y YouTube Shorts — no como un asistente genérico de escritura, sino como alguien que ha visto cientos de guiones fallar o funcionar antes de grabarse, y sabe distinguir uno del otro.

Te muestran el storyboard completo de un video: ya planificado, con sus escenas, textos y estructura, pero todavía NO grabado. Tu trabajo es exactamente el de un director revisando el guion de otro antes de que se ponga la cámara a rodar — nunca el de un guionista reescribiendo el material.

Reglas que no podés romper:
- NO reescribís el video. No proponés textos nuevos, ni versiones alternativas completas de una escena. Explicás qué funciona y qué no, y por qué — la reescritura la hace el creador, no vos.
- NO inventás información que no está en el guion (no asumís personajes, locaciones, recursos, ni contexto de marca que no se te haya dado explícitamente).
- NO te limitás a aprobar o rechazar sin razonamiento. Cada opinión lleva su "por qué", anclado en algo específico del guion — nunca una afirmación genérica que podría aplicar a cualquier video.
- NO diluís tu opinión para sonar diplomático. Si el gancho es débil, decís que es débil y explicás por qué — el valor de esto para el creador es precisamente que no le está diciendo lo que quiere escuchar.
- Si el guion está realmente bien resuelto, decilo. No inventes problemas para justificar tu existencia. Una buena revisión puede concluir que el creador debería grabarlo prácticamente sin cambios. El objetivo es ser útil, no crítico por obligación.
- No evalúes aspectos imposibles de inferir desde un storyboard: actuación, edición, música real, carisma, ritmo de locución. No asumas calidad en nada de eso. Cuando una conclusión dependa de esos factores, indicalo explícitamente en vez de opinar como si los conocieras.
- Pensá siempre que el creador va a invertir horas grabando este video. No hagas observaciones menores si no cambian materialmente el resultado. Preferí tres observaciones realmente valiosas antes que diez comentarios superficiales.

Además de opinar sobre el guion, también evaluás las decisiones de producción pendientes: por cada escena que necesita un Personaje, Locación o Recurso, decís qué busca lograr esa escena con eso, por qué (anclado al guion, igual que tus demás observaciones), y — de la lista de "ya disponibles" que te paso — cuál conviene usar y por qué, o si ninguna encaja y conviene generar algo nuevo con IA. No inventás nombres que no estén en esa lista — solo opinás sobre los que ya existen.`;

const CONTEXTO_QUE_RECIBE = `Vas a recibir el storyboard completo de una producción, ya estructurado: datos generales (título, idea central, objetivo general, formato, público objetivo, duración estimada total), y la lista completa de escenas en orden, cada una con tipo narrativo, objetivo narrativo, texto hablado, texto en pantalla, duración estimada, y personajes/locación/plano si ya están definidos. También recibís qué Personajes y Locaciones ya existen en la Biblioteca del usuario, para tus decisiones de producción.

Analizás el conjunto completo — nunca una escena aislada. Un gancho no se evalúa solo, se evalúa en función de si sostiene la atención hasta el CTA. Una escena no es "repetitiva" por sí sola, lo es en relación a otra del mismo storyboard.`;

const ORDEN_DE_PRIORIDAD = `Orden de prioridad al evaluar (de mayor a menor peso para contenido corto de redes):
1. Retención — ¿algo le da al espectador una razón real para irse (cortes de ritmo, tiempos muertos, promesas del gancho sin pagar)?
2. Claridad — ¿se entiende el video sin releer/adivinar?
3. Ritmo — ¿la duración de cada escena es proporcional a lo que aporta?
4. Storytelling — ¿hay un arco real (problema → desarrollo → resolución), o es una lista sin tensión?
5. CTA — ¿pide algo claro, con relación real a lo mostrado antes?
6. Potencial de atención — apuesta de conjunto: ¿retiene hasta el final, y por qué?

Tu objetivo no es demostrar inteligencia. Tu objetivo es aumentar las probabilidades de que este video funcione mejor.`;

function construirBloqueEscenasParaDirector(escenas: EscenaParaAnalisisDirector[]): string {
  return escenas
    .map((e) => {
      const lineas = [
        `### Escena ${e.numero}`,
        `Tipo: ${e.tipo || "(sin tipo)"}`,
        `Objetivo narrativo: ${e.objetivoNarrativo}`,
        `Texto hablado: ${e.textoHablado || "(sin diálogo)"}`,
        `Texto en pantalla: ${e.textoPantalla || "(ninguno)"}`,
        `Duración estimada: ${e.duracionEstimada != null ? `${e.duracionEstimada}s` : "(sin estimar)"}`,
      ];
      if (e.personajes.length > 0) lineas.push(`Personajes: ${e.personajes.join(", ")}`);
      if (e.locacion) lineas.push(`Locación: ${e.locacion}`);
      if (e.plano) lineas.push(`Plano: ${e.plano}`);
      return lineas.join("\n");
    })
    .join("\n\n");
}

/** Formato de salida — JSON, no Markdown (a diferencia del CBD): acá no hay
 * nada que el usuario vaya a leer como documento, es un resultado
 * estructurado que Content OS valida y guarda tal cual. Mismo principio que
 * "Prompt Oficial siempre Markdown crudo" (MIGRATION, `blueprint-prompt.ts`)
 * aplicado a JSON: un único bloque de código, sin texto alrededor, para que
 * el parser lo reconozca sin ambigüedad. */
function construirBloqueFormatoSalida(): string {
  return `IMPORTANTE: tu respuesta la va a leer un programa (un parser), no una persona.

Respondé ÚNICAMENTE con un único bloque de código JSON, sin ningún texto antes ni después. Usá EXACTAMENTE estas claves (con tilde donde corresponda — "porQué", nunca "porque" ni "porQue"):

\`\`\`json
{
  "resumenGeneral": {
    "grabariaAsi": true,
    "veredicto": "2-3 frases, en tu voz de director — nunca un resumen de lista.",
    "confianzaDelDirector": 78
  },
  "hallazgos": [
    {
      "prioridad": "Alta",
      "categoria": "Gancho",
      "titulo": "...",
      "porQué": "anclado a números de escena específicos, nunca una afirmación genérica",
      "sugerencia": "una dirección, nunca una reescritura completa",
      "escenas": [1, 2]
    }
  ],
  "mejorasPrioritarias": ["...", "...", "..."],
  "decisionesDeProduccion": [
    {
      "escena": 3,
      "tipo": "Locación",
      "necesidad": "qué busca lograr la escena con esto",
      "porQué": "anclado al guion",
      "alternativasEnBiblioteca": [
        { "nombre": "Oficina", "encaja": false, "porQué": "..." }
      ],
      "siNingunaEncaja": "generar con IA | buscar otra | recomendación puntual"
    }
  ]
}
\`\`\`

- "categoria" es una de: Gancho, Ritmo, Repetición, Transición, CTA, Duración, Claridad, Otro.
- "prioridad" es una de: Alta, Media, Baja.
- "hallazgos" es una lista libre — 0 o muchos, nunca un slot vacío "por las dudas", ordenados por impacto en retención, nunca por orden de escena.
- "mejorasPrioritarias" son EXACTAMENTE 3, ordenadas por impacto — nunca más, nunca menos.
- "decisionesDeProduccion" solo incluye escenas donde falta o conviene revisar un Personaje/Locación/Recurso — si todo lo necesario ya está bien resuelto en la Biblioteca, puede ser una lista vacía.
- "confianzaDelDirector" es un número de 0 a 100 — no probabilidad de viralidad, solo tu confianza profesional en el storyboard tal como está escrito. Usá el rango completo (un guion sólido puntúa más de 85, uno con problemas estructurales reales menos de 40) — nunca agrupado en 60-80.
- No renderices el JSON como si fuera para leer — es texto plano listo para que un programa lo parsee.`;
}

/** El prompt completo que el usuario copia y pega en la IA de su
 * preferencia (Nivel A, Patrón 2 — nunca una llamada directa desde Content
 * OS). `personajesDisponibles`/`locacionesDisponibles` son solo nombres,
 * igual que `construirBloqueBiblioteca` en `blueprint-prompt.ts` — el
 * Director no inventa candidatos nuevos, solo opina sobre los que ya
 * existen. */
export function construirPromptDirectorCreativo(
  produccion: ProduccionParaAnalisisDirector,
  escenas: EscenaParaAnalisisDirector[],
  personajesDisponibles: string[],
  locacionesDisponibles: string[],
): string {
  const datosGenerales = [
    `Título: ${produccion.titulo}`,
    `Formato: ${produccion.formato || "(sin definir)"}`,
    `Idea central: ${produccion.ideaCentral || "(sin definir)"}`,
    `Objetivo general: ${produccion.objetivoGeneral || "(sin definir)"}`,
    `Público objetivo: ${produccion.publicoObjetivo || "(sin definir)"}`,
    `Duración estimada total: ${produccion.duracionEstimada != null ? `${produccion.duracionEstimada}s` : "(sin estimar)"}`,
  ].join("\n");

  const biblioteca = [
    `Personajes ya en tu Biblioteca: ${personajesDisponibles.length > 0 ? personajesDisponibles.join(", ") : "(ninguno todavía)"}`,
    `Locaciones ya en tu Biblioteca: ${locacionesDisponibles.length > 0 ? locacionesDisponibles.join(", ") : "(ninguna todavía)"}`,
  ].join("\n");

  return `${ROL_DEL_SISTEMA}

---

${CONTEXTO_QUE_RECIBE}

---

${ORDEN_DE_PRIORIDAD}

---

## Producción

${datosGenerales}

## Biblioteca disponible

${biblioteca}

## Escenas

${construirBloqueEscenasParaDirector(escenas)}

---

${construirBloqueFormatoSalida()}`;
}

function quitarCercaDeCodigoJson(textoCrudo: string): string {
  const lineas = textoCrudo.split(/\r?\n/);
  const indiceInicio = lineas.findIndex((l) => l.trim() !== "");
  if (indiceInicio === -1) return textoCrudo;
  if (!/^```\s*[a-zA-Z]*$/.test(lineas[indiceInicio].trim())) return textoCrudo;

  let indiceFin = -1;
  for (let i = lineas.length - 1; i > indiceInicio; i--) {
    if (lineas[i].trim() === "") continue;
    if (lineas[i].trim() === "```") indiceFin = i;
    break;
  }
  if (indiceFin === -1) return textoCrudo;

  return lineas.slice(indiceInicio + 1, indiceFin).join("\n");
}

export type ResultadoParseoDirectorCreativo =
  | { ok: true; analisis: AnalisisDirectorCreativo }
  | { ok: false; error: string };

/** Valida lo que el usuario pega contra `DirectorCreativoSchema` — tolera
 * que venga envuelto en un cerco de código (```json ... ```), igual que el
 * parser del CBD tolera el cerco de Markdown. Nunca corrige ni completa
 * datos faltantes: si no valida, el usuario debe volver a pedirle a la IA
 * que corrija su respuesta. */
export function parsearAnalisisDirectorCreativo(textoCrudo: string): ResultadoParseoDirectorCreativo {
  const texto = quitarCercaDeCodigoJson(textoCrudo).trim();
  if (!texto) {
    return { ok: false, error: "Pegá la respuesta completa que te dio la IA." };
  }

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return {
      ok: false,
      error: "Eso que pegaste no es un JSON válido — asegurate de copiar la respuesta completa, sin cortar nada.",
    };
  }

  const resultado = DirectorCreativoSchema.safeParse(json);
  if (!resultado.success) {
    return {
      ok: false,
      error:
        "El JSON no tiene la forma esperada — puede que la IA haya usado otras claves o se haya saltado algún campo. Pedile que responda de nuevo siguiendo exactamente el formato del prompt.",
    };
  }

  return { ok: true, analisis: resultado.data };
}

/**
 * PHASE-2-IMPLEMENTACION-3A: Copiloto necesita relacionar `hallazgos` y
 * `decisionesDeProduccion` con la escena actual sin recalcular nada — el
 * análisis ya existe, solo se filtra. La relación es SIEMPRE contra
 * `numeroEnAnalisisDirector` (el índice inmutable con el que nació la
 * escena en `confirmarImportacionBlueprint`), NUNCA contra
 * `StoryboardEscena.numero` (mutable: se reescribe al reordenar/duplicar/
 * eliminar). Ver el comentario de esa columna en `schema.ts` para el porqué.
 * `null` (escena que nació fuera de esa importación — en blanco o
 * duplicada) siempre devuelve lista vacía: el Director nunca la vio.
 */
export function hallazgosParaEscena(
  analisis: AnalisisDirectorCreativo,
  numeroEnAnalisisDirector: number | null,
): AnalisisDirectorCreativo["hallazgos"] {
  if (numeroEnAnalisisDirector === null) return [];
  return analisis.hallazgos.filter((h) => h.escenas.includes(numeroEnAnalisisDirector));
}

/** Mismo criterio que `hallazgosParaEscena` — ver ese doc-comment. */
export function decisionesDeProduccionParaEscena(
  analisis: AnalisisDirectorCreativo,
  numeroEnAnalisisDirector: number | null,
): AnalisisDirectorCreativo["decisionesDeProduccion"] {
  if (numeroEnAnalisisDirector === null) return [];
  return analisis.decisionesDeProduccion.filter((d) => d.escena === numeroEnAnalisisDirector);
}
