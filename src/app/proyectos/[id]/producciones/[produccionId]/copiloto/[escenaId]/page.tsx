import { notFound } from "next/navigation";
import {
  actualizarEstadoProduccionEscena,
  getActivos,
  getPersonajes,
  getPlanos,
  getProduccion,
  getStoryboardEscenas,
  updateStoryboardEscena,
} from "@/lib/actions";
import { CopilotoGrabar } from "../copiloto-grabar";

export default async function CopilotoGrabarPage({
  params,
}: {
  params: Promise<{ id: string; produccionId: string; escenaId: string }>;
}) {
  const { id: proyectoId, produccionId, escenaId } = await params;
  const produccion = await getProduccion(produccionId);
  if (!produccion || produccion.proyectoId !== proyectoId) notFound();

  const [escenas, planos, activos, personajes] = await Promise.all([
    getStoryboardEscenas(produccionId),
    getPlanos(),
    getActivos(proyectoId),
    getPersonajes(),
  ]);
  const escena = escenas.find((e) => e.id === escenaId);
  if (!escena) notFound();
  const locaciones = activos.filter((a) => a.tipo === "foto");

  const boundSave = updateStoryboardEscena.bind(null, proyectoId, produccionId);
  const boundEstado = actualizarEstadoProduccionEscena.bind(null, proyectoId, produccionId);

  return (
    <CopilotoGrabar
      proyectoId={proyectoId}
      produccionId={produccionId}
      escena={escena}
      escenas={escenas}
      planos={planos}
      locaciones={locaciones}
      personajes={personajes}
      formato={produccion.formato}
      onSave={boundSave}
      onEstadoChange={boundEstado}
    />
  );
}
