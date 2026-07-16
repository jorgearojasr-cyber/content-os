import { createActivoArchivo, createActivoTexto, deleteActivo, getActivos } from "@/lib/actions";
import { Card, Empty, SectionTitle } from "@/components/ui";
import { NuevoActivoForm } from "./nuevo-activo-form";
import { ActivosLista } from "./activos-lista";

export default async function ActivosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;
  const listaActivos = await getActivos(proyectoId);

  const boundCreateArchivo = createActivoArchivo.bind(null, proyectoId);
  const boundCreateTexto = createActivoTexto.bind(null, proyectoId);
  const boundDelete = deleteActivo.bind(null, proyectoId);

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle subtitle="Logos, fotos, videos, música, íconos, tipografías, colores, prompts, voz y documentos reutilizables de este proyecto.">
          Nuevo activo
        </SectionTitle>
        <NuevoActivoForm onCreateArchivo={boundCreateArchivo} onCreateTexto={boundCreateTexto} />
      </Card>

      {listaActivos.length === 0 ? (
        <Empty title="Todavía no hay activos guardados">
          Los recursos que agregues aquí quedarán disponibles para reutilizar en este proyecto.
        </Empty>
      ) : (
        <ActivosLista activos={listaActivos} onDelete={boundDelete} />
      )}
    </div>
  );
}
