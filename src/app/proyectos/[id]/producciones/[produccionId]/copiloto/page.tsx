import { notFound, redirect } from "next/navigation";
import { getProduccion, getStoryboardEscenas } from "@/lib/actions";
import { resolverFaseCopiloto } from "@/lib/estado-produccion";
import { Card, Empty, SectionTitle } from "@/components/ui";

/**
 * Entrada del Copiloto (UX Migration 3) — nunca decide nada por sí misma:
 * calcula la fase real desde el estado de las escenas (misma lógica que
 * validó la auditoría 3A/3B) y redirige a una URL concreta. La escena
 * activa vive siempre en la URL, nunca en estado de cliente ni en haber
 * pasado antes por la grilla de Escenas.
 */
export default async function CopilotoPage({
  params,
}: {
  params: Promise<{ id: string; produccionId: string }>;
}) {
  const { id: proyectoId, produccionId } = await params;
  const produccion = await getProduccion(produccionId);
  if (!produccion || produccion.proyectoId !== proyectoId) notFound();

  const escenas = await getStoryboardEscenas(produccionId);
  const resultado = resolverFaseCopiloto(escenas);
  const base = `/proyectos/${proyectoId}/producciones/${produccionId}`;

  if (resultado.fase === "grabar") redirect(`${base}/copiloto/${resultado.escenaId}`);
  if (resultado.fase === "editar") redirect(`${base}/copiloto/editar`);
  if (resultado.fase === "cierre") redirect(`${base}/copiloto/cierre`);

  if (resultado.fase === "vacio") {
    return (
      <Card>
        <SectionTitle subtitle="El Copiloto necesita al menos una escena para saber por dónde empezar.">
          Copiloto
        </SectionTitle>
        <Empty title="Todavía no hay nada que producir">
          Agregá la primera escena desde Escenas para que el Copiloto pueda guiarte paso a paso.
        </Empty>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle subtitle="Grabación, edición y publicación — las tres etapas de esta producción ya están completas.">
        Copiloto
      </SectionTitle>
      <Empty title="Producción completa ✓">Este video ya recorrió todo el proceso.</Empty>
    </Card>
  );
}
