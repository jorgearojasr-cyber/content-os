import {
  analizarBlueprint,
  analizarBlueprintSinProyecto,
  analizarCreatorOSPackage,
  confirmarImportacionBlueprint,
  confirmarImportacionCPP,
  confirmarReemplazoCPP,
  crearLocacionDesdeImportador,
  crearPersonajeDesdeImportador,
  crearProyectoDesdeImportador,
  generarContextoParaChatGPT,
  getAgendaHoy,
  getBibliotecaParaPrompt,
  getProyectos,
} from "@/lib/actions";
import { HoyScreen } from "@/components/hoy-screen";

// "Hoy" lee Marcas y Producciones reales en cada visita — nunca debe
// quedar congelada como HTML estático del momento del build (UX Migration
// 1: reemplaza al Dashboard, que tenía el mismo criterio).
export const dynamic = "force-dynamic";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ idea?: string; marca?: string }>;
}) {
  const [{ idea, marca }, proyectos, agendaHoy] = await Promise.all([
    searchParams,
    getProyectos(),
    getAgendaHoy(),
  ]);

  return (
    <HoyScreen
      proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.nombre }))}
      agendaHoy={agendaHoy}
      ideaInicial={idea ?? ""}
      marcaInicialId={marca ?? null}
      onAnalizarProyecto={analizarBlueprintSinProyecto}
      onCrearProyecto={crearProyectoDesdeImportador}
      onAnalizarBiblioteca={analizarBlueprint}
      onConfirmar={confirmarImportacionBlueprint}
      onCrearPersonaje={crearPersonajeDesdeImportador}
      onCrearLocacion={crearLocacionDesdeImportador}
      onGenerarContexto={generarContextoParaChatGPT}
      onGenerarBiblioteca={getBibliotecaParaPrompt}
      onAnalizarCPP={analizarCreatorOSPackage}
      onConfirmarCPP={confirmarImportacionCPP}
      onReemplazarCPP={confirmarReemplazoCPP}
    />
  );
}
