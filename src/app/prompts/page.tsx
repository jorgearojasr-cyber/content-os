import { createPromptGuardado, deletePromptGuardado, getPromptsGlobales, updatePromptGuardado } from "@/lib/actions";
import { PromptsLista } from "@/components/prompts-lista";

// Lee prompts reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function PromptsGlobalPage() {
  const prompts = await getPromptsGlobales();
  const boundCreate = createPromptGuardado.bind(null, null);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Prompts</h1>
        <p className="mt-1 text-sm text-text-muted">
          Prompts de referencia globales — visibles y reutilizables en cualquier proyecto.
        </p>
      </header>

      <PromptsLista
        prompts={prompts}
        mostrarChipGlobal={false}
        onCreate={boundCreate}
        onUpdate={updatePromptGuardado}
        onDelete={deletePromptGuardado}
      />
    </main>
  );
}
