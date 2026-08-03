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
