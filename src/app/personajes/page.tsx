import {
  createPersonaje,
  deletePersonaje,
  editarEtiquetaFotoContexto,
  eliminarArchivoTemporal,
  eliminarFotoContextoPersonaje,
  eliminarFotoPersonaje,
  generarPersonajeAction,
  getPersonajes,
  subirArchivoTemporal,
  subirFotoContextoPersonaje,
  subirFotoPersonaje,
  updatePersonaje,
} from "@/lib/actions";
import { PersonajesGlobalLista } from "./personajes-global-lista";

// Lee personajes reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function PersonajesPage() {
  const personajes = await getPersonajes();

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Personajes</h1>
        <p className="mt-1 text-sm text-text-muted">Reutilizables en cualquier proyecto.</p>
      </header>

      <PersonajesGlobalLista
        personajes={personajes}
        onCreate={createPersonaje}
        onUpdate={updatePersonaje}
        onDelete={deletePersonaje}
        onSubirFoto={subirFotoPersonaje}
        onEliminarFoto={eliminarFotoPersonaje}
        onSubirTemporal={subirArchivoTemporal}
        onEliminarTemporal={eliminarArchivoTemporal}
        onGenerarPersonaje={generarPersonajeAction}
        onSubirFotoContexto={subirFotoContextoPersonaje}
        onEditarEtiquetaFotoContexto={editarEtiquetaFotoContexto}
        onEliminarFotoContexto={eliminarFotoContextoPersonaje}
      />
    </main>
  );
}
