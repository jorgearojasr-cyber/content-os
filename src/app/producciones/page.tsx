import { crearProduccion, getProyectos, getTodasLasProducciones } from "@/lib/actions";
import { ProduccionesLista } from "./producciones-lista";

// Lee producciones reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function ProduccionesGlobalPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string }>;
}) {
  const { proyecto: marcaIdPreseleccionada } = await searchParams;
  const [producciones, proyectos] = await Promise.all([getTodasLasProducciones(), getProyectos()]);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Producciones</h1>
        <p className="mt-1 text-sm text-text-muted">
          Cada Producción es un video independiente, con su propio storyboard, de cualquiera de tus
          marcas. Para crear un video a partir de un guion, hacelo desde Hoy.
        </p>
      </header>

      <ProduccionesLista
        producciones={producciones}
        marcas={proyectos.map((p) => ({ id: p.id, nombre: p.nombre }))}
        marcaIdPreseleccionada={marcaIdPreseleccionada ?? null}
        onCrear={crearProduccion}
      />
    </main>
  );
}
