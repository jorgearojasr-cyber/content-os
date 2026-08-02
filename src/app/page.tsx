import {
  analizarBlueprint,
  analizarBlueprintSinProyecto,
  confirmarImportacionBlueprint,
  crearLocacionDesdeImportador,
  crearPersonajeDesdeImportador,
  crearProyectoDesdeImportador,
  generarContextoParaChatGPT,
  getBibliotecaParaPrompt,
  getProduccionesEnCurso,
  getProyectos,
} from "@/lib/actions";
import { HoyScreen } from "@/components/hoy-screen";

// "Hoy" lee Marcas y Producciones reales en cada visita — nunca debe
// quedar congelada como HTML estático del momento del build (UX Migration
// 1: reemplaza al Dashboard, que tenía el mismo criterio).
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const [proyectos, produccionesEnCurso] = await Promise.all([getProyectos(), getProduccionesEnCurso()]);

  return (
    <HoyScreen
      proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.nombre }))}
      produccionesEnCurso={produccionesEnCurso}
      onAnalizarProyecto={analizarBlueprintSinProyecto}
      onCrearProyecto={crearProyectoDesdeImportador}
      onAnalizarBiblioteca={analizarBlueprint}
      onConfirmar={confirmarImportacionBlueprint}
      onCrearPersonaje={crearPersonajeDesdeImportador}
      onCrearLocacion={crearLocacionDesdeImportador}
      onGenerarContexto={generarContextoParaChatGPT}
      onGenerarBiblioteca={getBibliotecaParaPrompt}
    />
  );
}
