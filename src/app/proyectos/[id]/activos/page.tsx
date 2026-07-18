import {
  createActivoArchivo,
  createActivoTexto,
  deleteActivo,
  editarEtiquetasActivo,
  getActivos,
  renombrarActivo,
} from "@/lib/actions";
import { Card, Empty, SectionTitle } from "@/components/ui";
import { NuevoActivoForm } from "./nuevo-activo-form";
import { ActivosLista } from "./activos-lista";
import { FotosLugar } from "./fotos-lugar";

export default async function ActivosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;
  const listaActivos = await getActivos(proyectoId);
  const fotosLugar = listaActivos.filter((a) => a.tipo === "foto");
  const otrosActivos = listaActivos.filter((a) => a.tipo !== "foto");

  const boundCreateArchivo = createActivoArchivo.bind(null, proyectoId);
  const boundCreateTexto = createActivoTexto.bind(null, proyectoId);
  const boundDelete = deleteActivo.bind(null, proyectoId);
  const boundRenombrar = renombrarActivo.bind(null, proyectoId);
  const boundEditarEtiquetas = editarEtiquetasActivo.bind(null, proyectoId);

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle subtitle="Fotos reales de lugares o espacios de este proyecto (ej. la piscina, el quincho, el acceso) — la IA las usa como referencia visual en vez de describir el espacio desde cero cuando una escena coincide con la etiqueta.">
          Fotos de lugares
        </SectionTitle>
        <FotosLugar
          fotos={fotosLugar}
          onSubir={boundCreateArchivo}
          onRenombrar={boundRenombrar}
          onEliminar={boundDelete}
        />
      </Card>

      <Card>
        <SectionTitle subtitle="Logos, videos, música, íconos, tipografías, colores, prompts, voz y documentos reutilizables de este proyecto.">
          Otros activos
        </SectionTitle>
        <NuevoActivoForm onCreateArchivo={boundCreateArchivo} onCreateTexto={boundCreateTexto} />
      </Card>

      {otrosActivos.length === 0 ? (
        <Empty title="Todavía no hay otros activos guardados">
          Los recursos que agregues aquí quedarán disponibles para reutilizar en este proyecto.
        </Empty>
      ) : (
        <ActivosLista
          activos={otrosActivos}
          onDelete={boundDelete}
          onEditarEtiquetas={boundEditarEtiquetas}
        />
      )}
    </div>
  );
}
