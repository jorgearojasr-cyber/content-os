import Link from "next/link";
import { createArea, getAreas, getProyectos } from "@/lib/actions";
import { Card, Chip, Empty, SectionTitle } from "@/components/ui";
import type { Proyecto } from "@/lib/types";
import { NuevaAreaForm } from "./nueva-area-form";

// Lee Áreas y proyectos reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const [areas, proyectos] = await Promise.all([getAreas(), getProyectos()]);

  const proyectosPorArea = new Map<string, Proyecto[]>();
  const sinArea: Proyecto[] = [];
  for (const p of proyectos) {
    if (p.areaId) {
      const lista = proyectosPorArea.get(p.areaId) ?? [];
      lista.push(p);
      proyectosPorArea.set(p.areaId, lista);
    } else {
      sinArea.push(p);
    }
  }

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Áreas de Conocimiento</h1>
        <p className="mt-1 text-sm text-text-muted">
          Nivel intermedio entre tu Centro Personal y cada Proyecto — agrupan proyectos que
          comparten conocimiento de fondo. Un proyecto puede quedar sin Área.
        </p>
      </header>

      <Card className="mb-5">
        <SectionTitle>Nueva Área</SectionTitle>
        <NuevaAreaForm onCreate={createArea} />
      </Card>

      {areas.length === 0 ? (
        <Empty title="Todavía no tienes Áreas">Crea la primera arriba.</Empty>
      ) : (
        <div className="mb-6 space-y-3">
          {areas.map((a) => {
            const proyectosDeArea = proyectosPorArea.get(a.id) ?? [];
            return (
              <Card key={a.id} className="transition-colors hover:border-accent/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/areas/${a.id}`} className="font-display text-[17px] hover:text-accent">
                      {a.nombre}
                    </Link>
                    {a.descripcion ? (
                      <p className="mt-1 text-[13px] text-text-muted">{a.descripcion}</p>
                    ) : null}
                  </div>
                  <Chip>
                    {proyectosDeArea.length} proyecto{proyectosDeArea.length === 1 ? "" : "s"}
                  </Chip>
                </div>

                {proyectosDeArea.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {proyectosDeArea.map((p) => (
                      <Link
                        key={p.id}
                        href={`/proyectos/${p.id}/crear`}
                        className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[12.5px] text-text hover:border-accent/50"
                      >
                        {p.nombre}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <Link
                  href={`/areas/${a.id}`}
                  className="mt-3 inline-block text-[12.5px] text-accent underline"
                >
                  Ver Conocimiento del Área →
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <SectionTitle subtitle="Proyectos que todavía no tienen un Área asignada — para asignarles una, entra al proyecto y ve a Configuración.">
        Sin Área
      </SectionTitle>
      {sinArea.length === 0 ? (
        <p className="text-[13px] text-text-muted">Todos tus proyectos tienen un Área asignada.</p>
      ) : (
        <div className="space-y-2">
          {sinArea.map((p) => (
            <Card key={p.id} className="flex items-center justify-between gap-3">
              <Link href={`/proyectos/${p.id}/crear`} className="font-display text-[15px] hover:text-accent">
                {p.nombre}
              </Link>
              <Link
                href={`/proyectos/${p.id}/configuracion`}
                className="shrink-0 text-[12.5px] text-accent underline"
              >
                Asignar Área →
              </Link>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
