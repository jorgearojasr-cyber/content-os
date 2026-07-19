import { crearMotorNuevo, actualizarMotorIA, duplicarMotorIA, eliminarMotorIA, getTodosLosMotores } from "@/lib/actions";
import { MotoresLista } from "@/components/motores-lista";

// Lee motores reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function MotoresGlobalPage() {
  const motores = await getTodosLosMotores();
  const boundCreate = crearMotorNuevo.bind(null, null);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Motores IA</h1>
        <p className="mt-1 text-sm text-text-muted">
          La estrategia narrativa de una pieza (educativo, comparativo, storytelling…) — el
          Formato en Crear sigue definiendo la estructura de salida. 15 Motores de Sistema
          protegidos, más los que tú crees o dupliques.
        </p>
      </header>

      <MotoresLista
        motores={motores}
        mostrarChipGlobal={false}
        onCreate={boundCreate}
        onUpdate={actualizarMotorIA}
        onDuplicar={duplicarMotorIA}
        onDelete={eliminarMotorIA}
      />
    </main>
  );
}
