import Link from "next/link";
import { crearProduccion, getProducciones } from "@/lib/actions";
import { Card, Empty, SectionTitle } from "@/components/ui";
import { CrearProduccionForm } from "./crear-produccion-form";

function formatoDuracion(segundosTotales: number) {
  const m = Math.floor(segundosTotales / 60);
  const s = segundosTotales % 60;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

export default async function ProduccionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await params;
  const producciones = await getProducciones(proyectoId);
  const boundCrear = crearProduccion.bind(null, proyectoId);

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle subtitle="Cada Producción es un video independiente, con su propio storyboard — un Proyecto puede tener varias a lo largo del tiempo. Para crear un video a partir de un guion, hacelo desde Hoy.">
          Producciones
        </SectionTitle>
        <div className="flex flex-wrap items-start gap-3">
          <CrearProduccionForm onCrear={boundCrear} />
        </div>
      </Card>

      {producciones.length === 0 ? (
        <Empty title="Todavía no hay producciones planificadas">
          Creá la primera para empezar a armar su storyboard.
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {producciones.map((p) => (
            <Link key={p.id} href={`/proyectos/${proyectoId}/producciones/${p.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-surface-2/50">
                <p className="text-[14.5px] font-medium text-text">{p.titulo}</p>
                <p className="mt-1.5 text-[12px] text-text-muted">
                  {p.totalEscenas} escena{p.totalEscenas === 1 ? "" : "s"} · {formatoDuracion(p.duracionCalculadaSegundos)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
