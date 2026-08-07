import { notFound } from "next/navigation";
import { cerrarYPublicarProduccion, getProduccion } from "@/lib/actions";
import { Button, Card, Input, Label, SectionTitle } from "@/components/ui";

/**
 * Fase "cierre" del Copiloto (UX Migration 3) — último paso, aparece solo
 * cuando ya no queda ninguna escena en Grabada (todas Editadas). Guarda la
 * fecha de publicación planeada de la Producción completa y marca el
 * storyboard como publicado.
 */
export default async function CopilotoCierrePage({
  params,
}: {
  params: Promise<{ id: string; produccionId: string }>;
}) {
  const { id: proyectoId, produccionId } = await params;
  const produccion = await getProduccion(produccionId);
  if (!produccion || produccion.proyectoId !== proyectoId) notFound();

  const boundCerrar = cerrarYPublicarProduccion.bind(null, proyectoId, produccionId);

  return (
    <div className="space-y-4">
      <SectionTitle subtitle="El video ya está grabado y editado.">Qué falta para publicar</SectionTitle>
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Estado</p>
        <p className="mt-1 text-[15px] text-text">🟢 Listo para publicar</p>
      </Card>

      <Card>
        <SectionTitle subtitle="Decile a Content OS cuándo lo publicás — es solo para tu propio registro, no publica nada por vos.">
          ¿Ya está terminado?
        </SectionTitle>
        <form action={boundCerrar} className="space-y-3">
          <Label htmlFor="fechaPlanificada">Fecha de publicación (opcional)</Label>
          <Input
            id="fechaPlanificada"
            name="fechaPlanificada"
            type="date"
            defaultValue={produccion.fechaPlanificada ?? ""}
            className="max-w-[220px]"
          />
          <div>
            <Button type="submit">Marcar como publicado</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
