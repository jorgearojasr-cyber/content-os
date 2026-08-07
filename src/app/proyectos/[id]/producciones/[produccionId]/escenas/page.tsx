import { notFound } from "next/navigation";
import {
  actualizarEstadoProduccionEscena,
  crearEscenaEnBlanco,
  duplicarEscenaStoryboard,
  eliminarEscenaStoryboard,
  getActivos,
  getPersonajes,
  getPlanos,
  getProduccion,
  getStoryboardEscenas,
  moverEscenaStoryboard,
  reordenarEscenasStoryboard,
} from "@/lib/actions";
import { ProduccionEscenas } from "../produccion-escenas";

/** Grilla editable del storyboard (Fase 3.1-3.4) — desde Sprint 4 vive en
 * su propia pestaña, separada del Dashboard: acá se edita escena por
 * escena, en el Dashboard solo se lee el estado general. */
export default async function ProduccionEscenasPage({
  params,
}: {
  params: Promise<{ id: string; produccionId: string }>;
}) {
  const { id: proyectoId, produccionId } = await params;
  const produccion = await getProduccion(produccionId);
  if (!produccion || produccion.proyectoId !== proyectoId) notFound();

  const [escenas, planos, activos, personajes] = await Promise.all([
    getStoryboardEscenas(produccionId),
    getPlanos(),
    getActivos(proyectoId),
    getPersonajes(),
  ]);
  const locaciones = activos.filter((a) => a.tipo === "foto");

  const boundCrear = crearEscenaEnBlanco.bind(null, proyectoId, produccionId);
  const boundEstado = actualizarEstadoProduccionEscena.bind(null, proyectoId, produccionId);
  const boundMover = moverEscenaStoryboard.bind(null, proyectoId, produccionId);
  const boundReordenar = reordenarEscenasStoryboard.bind(null, proyectoId, produccionId);
  const boundDuplicar = duplicarEscenaStoryboard.bind(null, proyectoId, produccionId);
  const boundEliminar = eliminarEscenaStoryboard.bind(null, proyectoId, produccionId);

  return (
    <ProduccionEscenas
      escenasIniciales={escenas}
      planos={planos}
      locaciones={locaciones}
      personajes={personajes}
      onCrear={boundCrear}
      onEstadoChange={boundEstado}
      onMover={boundMover}
      onReordenar={boundReordenar}
      onDuplicar={boundDuplicar}
      onEliminar={boundEliminar}
    />
  );
}
