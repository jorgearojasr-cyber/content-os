import {
  getPersonajes,
  getProyectos,
  getTodaLaPapelera,
  getTodosLosBloquesActivos,
  getTodosLosBloquesArchivados,
} from "@/lib/actions";
import { personajesPorId } from "@/lib/types";
import { BibliotecaGlobalLista, type Vista } from "./biblioteca-global-lista";

// Lee bloques reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function BibliotecaGlobalPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const { vista: vistaParam } = await searchParams;
  const vista: Vista = vistaParam === "archivados" || vistaParam === "papelera" ? vistaParam : "activos";

  const [bloques, proyectos, todosPersonajes] = await Promise.all([
    vista === "activos"
      ? getTodosLosBloquesActivos()
      : vista === "archivados"
        ? getTodosLosBloquesArchivados()
        : getTodaLaPapelera(),
    getProyectos(),
    getPersonajes(),
  ]);
  const personajePorId = personajesPorId(todosPersonajes);

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Biblioteca</h1>
        <p className="mt-1 text-sm text-text-muted">
          Todo lo que has guardado en todas tus marcas, en un solo lugar.
        </p>
        {/* MIGRATION-4C-AUDIT confirmó que hoy no existe ningún flujo que
         * cree un Bloque nuevo — Biblioteca quedó como archivo de contenido
         * histórico. Los videos nuevos se producen y publican con
         * Producciones/Copiloto (ver "Producción" dentro de cada Marca). */}
        <p className="mt-1.5 text-[11.5px] text-text-muted">
          Contenido histórico — los videos nuevos se producen y publican desde Producciones.
        </p>
      </header>

      <BibliotecaGlobalLista
        vista={vista}
        bloques={bloques}
        proyectos={proyectos}
        personajePorId={personajePorId}
      />
    </main>
  );
}
