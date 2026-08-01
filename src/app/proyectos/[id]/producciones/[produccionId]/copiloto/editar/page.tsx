import { notFound } from "next/navigation";
import {
  generarPlanEdicionProduccionAction,
  getProduccion,
  getStoryboardEscenas,
  marcarProduccionComoEditada,
} from "@/lib/actions";
import { parsePlanEdicion } from "@/lib/types";
import { Button, Card, SectionTitle } from "@/components/ui";
import { PlanEdicionPanel } from "@/components/plan-edicion-panel";

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

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle subtitle="Ya grabaste todas las escenas de esta producción. Ahora vamos a editar el video completo.">
          Terminaste de grabar
        </SectionTitle>
      </Card>

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
