import { getBloquesParaCalendario } from "@/lib/actions";
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

  const [celdas, piezas] = await Promise.all([
    Promise.resolve(generarCeldasMes(anioMes)),
    getBloquesParaCalendario(),
  ]);

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
          Piezas de Biblioteca (de cualquier proyecto) con una fecha de publicación planeada.
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
