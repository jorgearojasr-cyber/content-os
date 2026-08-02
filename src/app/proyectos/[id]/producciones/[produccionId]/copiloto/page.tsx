import { notFound, redirect } from "next/navigation";
import { getProduccion, getStoryboardEscenas } from "@/lib/actions";
import { resolverFaseCopiloto } from "@/lib/estado-produccion";
import { Card, Empty, LinkButton, SectionTitle } from "@/components/ui";

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

      {/* UX-MIGRATION-5.1: el acompañamiento no debe apagarse justo al
          terminar — la misma pregunta que guió cada paso anterior
          ("¿y ahora qué hago?") sigue mereciendo respuesta acá. */}
      <div className="mt-5 rounded-xl border border-accent/30 bg-accent-soft p-4 text-center">
        <p className="text-[15px]">🎉 Video terminado.</p>
        <p className="mt-0.5 text-[13px] text-text-muted">¿Qué querés hacer ahora?</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <LinkButton href="/">Crear otro video</LinkButton>
          <LinkButton href="/" variant="secondary">
            Volver a Hoy
          </LinkButton>
        </div>
      </div>
    </Card>
  );
}
