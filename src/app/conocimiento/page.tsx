import {
  createDocumento,
  deleteDocumento,
  getPersonajes,
  getProyectos,
  getTodosLosDocumentos,
  updateDocumento,
} from "@/lib/actions";
import { DocumentosLista } from "@/components/documentos-lista";

// Lee documentos reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function ConocimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string }>;
}) {
  const { proyecto: marcaIdPreseleccionada } = await searchParams;
  const [documentos, personajes, proyectos] = await Promise.all([
    getTodosLosDocumentos(),
    getPersonajes(),
    getProyectos(),
  ]);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Conocimiento</h1>
        <p className="mt-1 text-sm text-text-muted">
          Documentos de referencia — normativas, investigaciones, manuales y resúmenes, globales o
          de una marca específica. El alcance se elige al crear o editar cada uno.
        </p>
      </header>

      <DocumentosLista
        documentos={documentos}
        marcas={proyectos.map((p) => ({ id: p.id, nombre: p.nombre }))}
        marcaIdPreseleccionada={marcaIdPreseleccionada ?? null}
        personajes={personajes.map((p) => ({ id: p.id, nombre: p.nombre }))}
        onCreate={createDocumento}
        onUpdate={updateDocumento}
        onDelete={deleteDocumento}
      />
    </main>
  );
}
