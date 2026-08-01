import {
  actualizarEstadoProduccionEscena,
  crearEscenaEnBlanco,
  getActivos,
  getPersonajes,
  getPlanos,
  getProyecto,
  getStoryboardEscenas,
  updateStoryboardEscena,
} from "@/lib/actions";
import { notFound } from "next/navigation";
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

export default async function ProduccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await params;
  const proyecto = await getProyecto(proyectoId);
  if (!proyecto) notFound();

  const [escenas, planos, activos, personajes] = await Promise.all([
    getStoryboardEscenas(proyectoId),
    getPlanos(),
    getActivos(proyectoId),
    getPersonajes(proyectoId),
  ]);
  const locaciones = activos.filter((a) => a.tipo === "foto");

  const desglose: Record<string, number> = Object.fromEntries(
    ESTADOS_PRODUCCION_ESCENA.map((e) => [e, escenas.filter((esc) => esc.estadoProduccion === e).length]),
  );
  const duracionTotal = escenas.reduce((acc, e) => acc + e.duracionSegundos, 0);

  const boundCrear = crearEscenaEnBlanco.bind(null, proyectoId);
  const boundSave = updateStoryboardEscena.bind(null, proyectoId);
  const boundEstado = actualizarEstadoProduccionEscena.bind(null, proyectoId);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-normal tracking-wide">{proyecto.nombre}</p>
            <p className="mt-0.5 text-[13px] text-text-muted">{estadoGeneral(escenas.length, desglose)}</p>
          </div>
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
      />
    </div>
  );
}
