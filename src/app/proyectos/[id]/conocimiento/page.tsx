import {
  createDocumento,
  deleteDocumento,
  getArea,
  getDocumentosDeProyecto,
  getPersonajes,
  getPersonajesDelEstudio,
  getProyecto,
  updateDocumento,
} from "@/lib/actions";
import { SectionTitle } from "@/components/ui";
import { DocumentosLista } from "@/components/documentos-lista";

export default async function ProyectoConocimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;
  const [documentos, personajes, personajesEstudio, proyecto] = await Promise.all([
    getDocumentosDeProyecto(proyectoId),
    getPersonajes(proyectoId),
    getPersonajesDelEstudio(),
    getProyecto(proyectoId),
  ]);
  const areaDelProyecto = proyecto?.areaId ? await getArea(proyecto.areaId) : null;
  const boundCreate = createDocumento.bind(null, proyectoId);

  return (
    <div className="space-y-4">
      <SectionTitle
        subtitle={
          areaDelProyecto
            ? `Documentos de este proyecto, más los del Área "${areaDelProyecto.nombre}" (chip 🏛) y los globales (chip "Global") — normativas, investigaciones, manuales y resúmenes.`
            : 'Documentos de referencia de este proyecto, más los globales (chip "Global") — normativas, investigaciones, manuales y resúmenes.'
        }
      >
        Conocimiento
      </SectionTitle>

      <DocumentosLista
        documentos={documentos}
        mostrarChipGlobal
        nombreArea={areaDelProyecto?.nombre}
        personajes={[...personajes, ...personajesEstudio].map((p) => ({ id: p.id, nombre: p.nombre }))}
        onCreate={boundCreate}
        onUpdate={updateDocumento}
        onDelete={deleteDocumento}
      />
    </div>
  );
}
