import {
  createProyecto,
  deleteProyecto,
  getAreas,
  getConteoContenidoPorProyecto,
  getProyectos,
} from "@/lib/actions";

// Esta pantalla lee proyectos reales de la base de datos en cada visita.
// Nunca debe quedar congelada como HTML estático del momento del build.
export const dynamic = "force-dynamic";
import { Card, Empty, SectionTitle } from "@/components/ui";
import { NuevoProyectoForm } from "./nuevo-proyecto-form";
import { ProyectosLista } from "./proyectos-lista";

export default async function ProyectosPage() {
  const [proyectos, conteoContenido, areas] = await Promise.all([
    getProyectos(),
    getConteoContenidoPorProyecto(),
    getAreas(),
  ]);

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">
          Tus proyectos
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Cada proyecto tiene su propia identidad, sin mezclarse con los demás.
        </p>
      </header>

      <Card className="mb-5">
        <SectionTitle>Nuevo proyecto</SectionTitle>
        <NuevoProyectoForm
          nombresExistentes={proyectos.map((p) => p.nombre)}
          onCreate={createProyecto}
        />
      </Card>

      {proyectos.length === 0 ? (
        <Empty title="Todavía no tienes proyectos">
          Crea el primero arriba — a partir de ahí, todo (identidad, contenido) vive
          dentro de él.
        </Empty>
      ) : (
        <ProyectosLista
          proyectos={proyectos}
          areas={areas}
          onDelete={deleteProyecto}
          conteoContenido={conteoContenido}
        />
      )}
    </main>
  );
}
