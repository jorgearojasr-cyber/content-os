import { createPromptGuardado, deletePromptGuardado, getPromptsDeProyecto, updatePromptGuardado } from "@/lib/actions";
import { SectionTitle } from "@/components/ui";
import { PromptsLista } from "@/components/prompts-lista";

export default async function ProyectoPromptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;
  const prompts = await getPromptsDeProyecto(proyectoId);
  const boundCreate = createPromptGuardado.bind(null, proyectoId);

  return (
    <div className="space-y-4">
      <SectionTitle subtitle='Prompts de este proyecto, más los globales (chip "Global") — el mismo texto se puede reutilizar en cualquier proyecto.'>
        Prompts
      </SectionTitle>

      <PromptsLista
        prompts={prompts}
        mostrarChipGlobal
        onCreate={boundCreate}
        onUpdate={updatePromptGuardado}
        onDelete={deletePromptGuardado}
      />
    </div>
  );
}
