import {
  createPromptGuardado,
  deletePromptGuardado,
  getPersonajes,
  getProyectos,
  getTodosLosPrompts,
  updatePromptGuardado,
} from "@/lib/actions";
import { PromptsLista } from "@/components/prompts-lista";

// Lee prompts reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string }>;
}) {
  const { proyecto: marcaIdPreseleccionada } = await searchParams;
  const [prompts, personajes, proyectos] = await Promise.all([
    getTodosLosPrompts(),
    getPersonajes(),
    getProyectos(),
  ]);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Prompts</h1>
        <p className="mt-1 text-sm text-text-muted">
          Prompts de referencia — globales, reutilizables en cualquier marca, o guardados para una
          marca específica. El alcance se elige al crear o editar cada uno.
        </p>
      </header>

      <PromptsLista
        prompts={prompts}
        marcas={proyectos.map((p) => ({ id: p.id, nombre: p.nombre }))}
        marcaIdPreseleccionada={marcaIdPreseleccionada ?? null}
        personajes={personajes.map((p) => ({ id: p.id, nombre: p.nombre }))}
        onCreate={createPromptGuardado}
        onUpdate={updatePromptGuardado}
        onDelete={deletePromptGuardado}
      />
    </main>
  );
}
