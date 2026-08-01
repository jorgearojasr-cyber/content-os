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
  updateStoryboardEscena,
} from "@/lib/actions";
import { Card } from "@/components/ui";
import { ESTADOS_PRODUCCION_ESCENA } from "@/lib/types";
import { ESTADO_PRODUCCION_INFO } from "@/lib/estado-produccion";
import { ProduccionEscenas } from "./produccion-escenas";

function estadoGeneral(totalEscenas: number, desglose: Record<string, number>) {
  if (totalEscenas === 0) return "Sin escenas planificadas";
  if (desglose.PUBLICADA === totalEscenas) return "Publicado";
  if (desglose.BORRADOR === totalEscenas) return "En planificación";
  return "En producción";
}

function formatoDuracion(segundosTotales: number) {
  const m = Math.floor(segundosTotales / 60);
  const s = segundosTotales % 60;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

export default async function ProduccionDetallePage({
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
    getPersonajes(proyectoId),
  ]);
  const locaciones = activos.filter((a) => a.tipo === "foto");

  const desglose: Record<string, number> = Object.fromEntries(
    ESTADOS_PRODUCCION_ESCENA.map((e) => [e, escenas.filter((esc) => esc.estadoProduccion === e).length]),
  );
  const duracionTotal = escenas.reduce((acc, e) => acc + e.duracionSegundos, 0);

  const boundCrear = crearEscenaEnBlanco.bind(null, proyectoId, produccionId);
  const boundSave = updateStoryboardEscena.bind(null, proyectoId, produccionId);
  const boundEstado = actualizarEstadoProduccionEscena.bind(null, proyectoId, produccionId);
  const boundMover = moverEscenaStoryboard.bind(null, proyectoId, produccionId);
  const boundReordenar = reordenarEscenasStoryboard.bind(null, proyectoId, produccionId);
  const boundDuplicar = duplicarEscenaStoryboard.bind(null, proyectoId, produccionId);
  const boundEliminar = eliminarEscenaStoryboard.bind(null, proyectoId, produccionId);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-text-muted">{estadoGeneral(escenas.length, desglose)}</p>
          <div className="text-right text-[13px] text-text-muted">
            <p>
              {escenas.length} escena{escenas.length === 1 ? "" : "s"} · {formatoDuracion(duracionTotal)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
          {ESTADOS_PRODUCCION_ESCENA.map((estado) => (
            <span key={estado} className={`text-[12px] ${ESTADO_PRODUCCION_INFO[estado].clase}`}>
              {ESTADO_PRODUCCION_INFO[estado].icono} {ESTADO_PRODUCCION_INFO[estado].etiqueta}: {desglose[estado]}
            </span>
          ))}
        </div>
      </Card>

      <ProduccionEscenas
        escenasIniciales={escenas}
        planos={planos}
        locaciones={locaciones}
        personajes={personajes}
        onCrear={boundCrear}
        onSave={boundSave}
        onEstadoChange={boundEstado}
        onMover={boundMover}
        onReordenar={boundReordenar}
        onDuplicar={boundDuplicar}
        onEliminar={boundEliminar}
      />
    </div>
  );
}
