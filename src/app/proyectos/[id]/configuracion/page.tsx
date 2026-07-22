import { notFound } from "next/navigation";
import { asignarAreaProyecto, getAreas, getProyecto, updateProyecto } from "@/lib/actions";
import { Card, SectionTitle } from "@/components/ui";
import { ConfiguracionForm } from "./configuracion-form";

export default async function ConfiguracionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await params;
  const [proyecto, areas] = await Promise.all([getProyecto(proyectoId), getAreas()]);
  if (!proyecto) notFound();

  const boundUpdate = updateProyecto.bind(null, proyectoId);
  const boundAsignarArea = asignarAreaProyecto.bind(null, proyectoId);

  return (
    <div className="space-y-4">
      <SectionTitle subtitle="Nombre, descripción y el Área de Conocimiento de este proyecto.">
        Configuración
      </SectionTitle>
      <Card>
        <ConfiguracionForm
          proyecto={proyecto}
          areas={areas}
          onUpdateProyecto={boundUpdate}
          onAsignarArea={boundAsignarArea}
        />
      </Card>
    </div>
  );
}
