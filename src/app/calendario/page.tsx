import { getBloquesParaCalendario, getProduccionesParaCalendario } from "@/lib/actions";
import { generarCeldasMes, mesActualChile, mesAnterior, mesSiguiente, type AnioMes } from "@/lib/calendario";
import { CalendarioMes, type PiezaCalendario } from "./calendario-mes";

// Lee las piezas con fecha planificada reales en cada visita.
export const dynamic = "force-dynamic";

function parseAnioMes(valor: string | undefined): AnioMes | null {
  const m = valor?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return { anio, mes };
}

function hrefDeMes({ anio, mes }: AnioMes): string {
  return `/calendario?mes=${anio}-${String(mes).padStart(2, "0")}`;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const actual = mesActualChile();
  const anioMes = parseAnioMes(mesParam) ?? actual;

  const [celdas, bloques, producciones] = await Promise.all([
    Promise.resolve(generarCeldasMes(anioMes)),
    getBloquesParaCalendario(),
    getProduccionesParaCalendario(),
  ]);

  // MIGRATION-4C-AUDIT confirmó que Producciones y Bloques son modelos
  // separados a propósito (Camino A) — acá solo se combinan las dos listas
  // para la vista, sin tocar ninguna tabla ni crear una relación nueva.
  const piezas: PiezaCalendario[] = [
    ...bloques.map((b) => ({ ...b, tipo: "bloque" as const })),
    ...producciones.map((p) => ({ ...p, tipo: "produccion" as const })),
  ];

  const piezasPorFecha: Record<string, PiezaCalendario[]> = {};
  for (const p of piezas) {
    (piezasPorFecha[p.fechaPlanificada] ??= []).push(p);
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Calendario</h1>
        <p className="mt-1 text-sm text-text-muted">
          Producciones y piezas de Biblioteca (de cualquier Marca) con una fecha de publicación
          planeada.
        </p>
        <p className="mt-2 text-[11.5px] text-text-muted">
          <span className="text-accent">🎬 Producción</span> — el video se produjo con el flujo
          actual (Copiloto). <span className="text-accent">Con ícono de formato</span> — Bloque de
          Biblioteca, contenido histórico guardado antes de ese flujo.
        </p>
      </header>

      <CalendarioMes
        celdas={celdas}
        piezasPorFecha={piezasPorFecha}
        anioMes={anioMes}
        hrefMesAnterior={hrefDeMes(mesAnterior(anioMes))}
        hrefMesSiguiente={hrefDeMes(mesSiguiente(anioMes))}
        hrefMesActual={hrefDeMes(actual)}
      />
    </main>
  );
}
