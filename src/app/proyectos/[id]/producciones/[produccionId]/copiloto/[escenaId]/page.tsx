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
import {
  agruparHallazgosPorPrioridad,
  decisionesDeProduccionParaEscena,
  decisionParaTipo,
  hallazgosParaEscena,
  hallazgosParaGrabar,
} from "@/lib/director-creativo";
import { parseAnalisisDirectorCreativo } from "@/lib/types";
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

  // PHASE-2-IMPLEMENTACION-3A/3B: solo lectura del análisis ya generado en
  // Revisión, filtrado por `numeroEnAnalisisDirector` (nunca `numero`) y
  // clasificado únicamente con las funciones puras de `director-creativo.ts`
  // (regla congelada en PHASE-2-COPILOTO-UX-DESIGN) — Copiloto no genera ni
  // recalcula nada, y no vuelve a implementar la clasificación acá.
  const analisisDirector = parseAnalisisDirectorCreativo(produccion.analisisDirectorCreativoJson);
  const hallazgosEscena = analisisDirector
    ? hallazgosParaGrabar(hallazgosParaEscena(analisisDirector, escena.numeroEnAnalisisDirector))
    : [];
  const hallazgosAgrupados = agruparHallazgosPorPrioridad(hallazgosEscena);
  const decisionesEscena = analisisDirector
    ? decisionesDeProduccionParaEscena(analisisDirector, escena.numeroEnAnalisisDirector)
    : [];
  const decisionPersonaje = decisionParaTipo(decisionesEscena, "Personaje");
  const decisionLocacion = decisionParaTipo(decisionesEscena, "Locación");
  const decisionRecurso = decisionParaTipo(decisionesEscena, "Recurso");

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
      hallazgosAgrupados={hallazgosAgrupados}
      decisionPersonaje={decisionPersonaje}
      decisionLocacion={decisionLocacion}
      decisionRecurso={decisionRecurso}
      onSave={boundSave}
      onEstadoChange={boundEstado}
    />
  );
}
