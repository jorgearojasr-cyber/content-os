import Link from "next/link";
import { createProyecto, deleteProyecto, getAreas, getConteoContenidoPorProyecto, getProyectos } from "@/lib/actions";

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
              Estudio Creativo JR
            </div>
            <h1 className="font-display text-2xl font-normal tracking-wide">
              Tus marcas
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Cada marca tiene su propia identidad, sin mezclarse con las demás.
            </p>
          </div>
          {/* MIGRATION-4A: Áreas deja de tener destino propio en el sidebar
           * (MIGRATION-4-DESIGN: "vive dentro de Mi marca, como una función
           * de la pantalla Proyectos") — este es el único acceso que le
           * queda; la ruta /areas no cambió. */}
          <Link
            href="/areas"
            className="shrink-0 whitespace-nowrap rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] text-text-muted hover:bg-surface-2 hover:text-text"
          >
            🏛 Áreas
          </Link>
        </div>
      </header>

      <Card className="mb-5">
        <SectionTitle>Nueva marca</SectionTitle>
        <NuevoProyectoForm
          nombresExistentes={proyectos.map((p) => p.nombre)}
          areas={areas}
          onCreate={createProyecto}
        />
      </Card>

      {proyectos.length === 0 ? (
        <Empty title="Todavía no tienes marcas">
          Crea la primera arriba — a partir de ahí, todo (identidad, contenido) vive
          dentro de ella.
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
