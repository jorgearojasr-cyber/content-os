import Link from "next/link";
import { getDashboardData } from "@/lib/actions";
import { Card, Chip, Empty, LinkButton, SectionTitle } from "@/components/ui";

// El dashboard lee proyectos y contenido reales en cada visita.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const { proyectoReciente, proyectosRecientes, bloquesRecientes, notasSinVincular } =
    await getDashboardData();

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Content OS
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Tu estudio creativo</h1>
        <p className="mt-1 text-sm text-text-muted">
          Todo lo que necesitas para seguir creando, en un solo lugar.
        </p>
      </header>

      <div className="space-y-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle
              subtitle={
                notasSinVincular > 0
                  ? `${notasSinVincular} nota${notasSinVincular === 1 ? "" : "s"} todavía sin vincular a un proyecto.`
                  : "Apunta ideas sueltas, sin fricción — vincúlalas a un proyecto cuando quieras."
              }
            >
              Segundo Cerebro
            </SectionTitle>
            <LinkButton href="/segundo-cerebro" variant="secondary">
              Abrir
            </LinkButton>
          </div>
        </Card>

        {!proyectoReciente ? (
          <Empty title="Todavía no tienes proyectos">
            <Link href="/proyectos" className="text-accent underline">
              Crea tu primer proyecto
            </Link>{" "}
            para empezar.
          </Empty>
        ) : (
          <>
            <Card className="border-accent/30 bg-accent-soft/40">
              <SectionTitle subtitle={`Sigue justo donde lo dejaste en "${proyectoReciente.nombre}".`}>
                Continuar donde quedé
              </SectionTitle>
              <div className="flex flex-wrap gap-2">
                <LinkButton href={`/proyectos/${proyectoReciente.id}/identidad`}>
                  Abrir {proyectoReciente.nombre}
                </LinkButton>
                <LinkButton href={`/proyectos/${proyectoReciente.id}/crear`} variant="secondary">
                  Crear contenido nuevo
                </LinkButton>
              </div>
            </Card>

            <Card>
              <SectionTitle subtitle="Tus proyectos más activos.">Proyectos recientes</SectionTitle>
              <div className="space-y-2">
                {proyectosRecientes.map((p) => (
                  <Link
                    key={p.id}
                    href={`/proyectos/${p.id}/identidad`}
                    className="block rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14px] text-text transition-colors hover:border-accent/50"
                  >
                    {p.nombre}
                    {p.descripcion ? (
                      <span className="block text-[12px] text-text-muted">{p.descripcion}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
              <div className="mt-3">
                <Link href="/proyectos" className="text-[13px] text-accent underline">
                  Ver todos los proyectos
                </Link>
              </div>
            </Card>

            <Card>
              <SectionTitle subtitle="Lo último que guardaste, en cualquier proyecto.">
                Contenidos recientes
              </SectionTitle>
              {bloquesRecientes.length === 0 ? (
                <Empty title="Todavía no hay contenido guardado">
                  Crea tu primera pieza desde cualquier proyecto.
                </Empty>
              ) : (
                <div className="space-y-2">
                  {bloquesRecientes.map((b) => (
                    <Link
                      key={b.id}
                      href={`/proyectos/${b.proyectoId}/biblioteca/${b.id}/editar`}
                      className="block rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14px] text-text transition-colors hover:border-accent/50"
                    >
                      <Chip>{b.formato}</Chip>
                      <span className="ml-2">{b.titulo}</span>
                      <span className="block text-[12px] text-text-muted">{b.proyectoNombre}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
