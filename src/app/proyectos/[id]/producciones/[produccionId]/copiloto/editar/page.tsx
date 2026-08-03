import { notFound } from "next/navigation";
import {
  generarPlanEdicionProduccionAction,
  getProduccion,
  getStoryboardEscenas,
  marcarProduccionComoEditada,
} from "@/lib/actions";
import { hallazgosParaEditar } from "@/lib/director-creativo";
import { parseAnalisisDirectorCreativo, parsePlanEdicion, type StoryboardEscenaConPersonajes } from "@/lib/types";
import { Button, Card, SectionTitle } from "@/components/ui";
import { PlanEdicionPanel } from "@/components/plan-edicion-panel";

/** Traduce las referencias de un hallazgo (`numeroEnAnalisisDirector`,
 * inmutables) a los `numero` actuales de esas escenas — el mismo criterio
 * de PHASE-2-IMPLEMENTACION-3A, nunca al revés. Si una escena referenciada
 * ya no existe (se eliminó), se omite con gracia en vez de romper. */
function etiquetaEscenas(referencias: number[], escenas: StoryboardEscenaConPersonajes[]): string {
  const numeros = referencias
    .map((n) => escenas.find((e) => e.numeroEnAnalisisDirector === n)?.numero)
    .filter((n): n is number => n !== undefined);
  if (numeros.length === 0) return "Escenas ya no disponibles en el storyboard";
  return `Escena${numeros.length > 1 ? "s" : ""} ${numeros.join(" · ")}`;
}

/**
 * Fase "editar" del Copiloto (UX Migration 3) — aparece sola cuando ya no
 * queda ninguna escena en Borrador, nunca como pestaña independiente.
 * Analiza el storyboard COMPLETO de la Producción (nunca una escena
 * aislada, nunca un Bloque) con el mismo Director de Edición que ya existe
 * para piezas de Biblioteca — decisión tomada junto con el usuario para no
 * construir una versión recortada que después haya que reemplazar.
 */
export default async function CopilotoEditarPage({
  params,
}: {
  params: Promise<{ id: string; produccionId: string }>;
}) {
  const { id: proyectoId, produccionId } = await params;
  const produccion = await getProduccion(produccionId);
  if (!produccion || produccion.proyectoId !== proyectoId) notFound();

  const escenas = await getStoryboardEscenas(produccionId);
  const boundGenerar = generarPlanEdicionProduccionAction.bind(null, proyectoId, produccionId);
  const boundMarcarEditada = marcarProduccionComoEditada.bind(null, proyectoId, produccionId);

  // PHASE-2-IMPLEMENTACION-3B (diseño congelado en PHASE-2-COPILOTO-UX-
  // DESIGN): solo lectura del mismo análisis ya generado en Revisión —
  // únicamente Repetición/Transición, que comparan escenas entre sí y por
  // eso solo tienen sentido acá, con el storyboard completo armado. Nunca
  // un segundo pase de análisis, nunca toca al Director de Edición.
  const analisisDirector = parseAnalisisDirectorCreativo(produccion.analisisDirectorCreativoJson);
  const hallazgosEditar = analisisDirector ? hallazgosParaEditar(analisisDirector.hallazgos) : [];

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle subtitle="Ya grabaste todas las escenas de esta producción. Ahora vamos a editar el video completo.">
          Terminaste de grabar
        </SectionTitle>
      </Card>

      {hallazgosEditar.length > 0 ? (
        <div className="rounded-xl border-y border-r border-border border-l-4 border-l-info bg-surface p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Antes de armar el corte</p>
          <div className="mt-2 space-y-3">
            {hallazgosEditar.map((h, i) => (
              <div key={i}>
                <p className="text-[13.5px] font-medium text-text">{h.titulo}</p>
                <p className="mt-0.5 text-[12.5px] text-text-muted">{h.porQué}</p>
                <p className="mt-1 text-[12.5px] text-text">💡 {h.sugerencia}</p>
                <p className="mt-1 font-mono text-[10.5px] text-info">{etiquetaEscenas(h.escenas, escenas)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <PlanEdicionPanel
        tituloBloque={produccion.titulo}
        planInicial={parsePlanEdicion(produccion.planEdicionJson)}
        puedeGenerar={escenas.length > 0}
        esConversion={false}
        onGenerar={boundGenerar}
      />

      <Card>
        <SectionTitle subtitle="Cuando termines de montar el video en tu editor (CapCut, Premiere, DaVinci), marcá la producción como editada para pasar al cierre.">
          ¿Ya terminaste de editar?
        </SectionTitle>
        <form action={boundMarcarEditada}>
          <Button type="submit">Marcar video como editado</Button>
        </form>
      </Card>
    </div>
  );
}
