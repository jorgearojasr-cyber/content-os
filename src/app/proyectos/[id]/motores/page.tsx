import { actualizarMotorIA, crearMotorNuevo, duplicarMotorIA, eliminarMotorIA, getMotoresDeProyecto } from "@/lib/actions";
import { SectionTitle } from "@/components/ui";
import { MotoresLista } from "@/components/motores-lista";

export default async function ProyectoMotoresPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;
  const motores = await getMotoresDeProyecto(proyectoId);
  const boundCreate = crearMotorNuevo.bind(null, proyectoId);

  return (
    <div className="space-y-4">
      <SectionTitle subtitle='Motores de este proyecto, más los globales (chip "Global") — la estrategia narrativa que se sugiere y se usa en Crear.'>
        Motores IA
      </SectionTitle>

      <MotoresLista
        motores={motores}
        mostrarChipGlobal
        onCreate={boundCreate}
        onUpdate={actualizarMotorIA}
        onDuplicar={duplicarMotorIA}
        onDelete={eliminarMotorIA}
      />
    </div>
  );
}
