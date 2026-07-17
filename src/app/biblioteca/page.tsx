import { getProyectos, getTodosLosBloquesActivos } from "@/lib/actions";
import { BibliotecaGlobalLista } from "./biblioteca-global-lista";

// Lee bloques reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function BibliotecaGlobalPage() {
  const [bloques, proyectos] = await Promise.all([getTodosLosBloquesActivos(), getProyectos()]);

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Biblioteca</h1>
        <p className="mt-1 text-sm text-text-muted">
          Todo lo que has guardado en todos tus proyectos, en un solo lugar.
        </p>
      </header>

      <BibliotecaGlobalLista bloques={bloques} proyectos={proyectos} />
    </main>
  );
}
