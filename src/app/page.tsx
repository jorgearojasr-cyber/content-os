import Image from "next/image";
import Link from "next/link";
import { getDashboardData } from "@/lib/actions";
import { Card, Chip, Empty, LinkButton, SectionTitle } from "@/components/ui";
import { formatearFechaChile, saludoChile } from "@/lib/fecha";
import { urlImagenVisible } from "@/lib/imagen-url";

// El dashboard lee proyectos y contenido reales en cada visita.
export const dynamic = "force-dynamic";

// Solo elige un ícono según palabras ya presentes en `formato` (dato que ya
// existe) — puramente visual, no agrega ni infiere datos nuevos.
const ICONOS_FORMATO: { patron: RegExp; icono: string }[] = [
  { patron: /video|reel|tiktok|shorts/i, icono: "🎥" },
  { patron: /carrusel/i, icono: "📚" },
  { patron: /imagen/i, icono: "🖼" },
  { patron: /historia/i, icono: "📖" },
];

function iconoParaFormato(formato: string): string {
  return ICONOS_FORMATO.find((f) => f.patron.test(formato))?.icono ?? "📄";
}

export default async function RootPage() {
  const { proyectoReciente, proyectosRecientes, bloquesRecientes, notasSinVincular } =
    await getDashboardData();

  const saludo = saludoChile();

  const subtitulo = proyectoReciente
    ? `Puedes continuar con ${proyectoReciente.nombre}.`
    : proyectosRecientes.length > 0
      ? "Sigue creando contenido para tus proyectos."
      : "Crea tu primer proyecto para empezar.";

  const crearHref = proyectoReciente ? `/proyectos/${proyectoReciente.id}/crear` : "/proyectos";

  return (
    <main className="mx-auto max-w-[1040px] px-4 py-10 sm:py-16">
      <header className="animate-fade-in relative mb-10 overflow-hidden sm:mb-14">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="max-w-[520px] flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[2px] text-accent">
              Estudio Creativo JR
            </p>
            <h1 className="mt-2 font-display text-3xl font-normal tracking-wide sm:text-4xl">
              {saludo}.
            </h1>
            <p className="mx-auto mt-3 max-w-[440px] text-[15px] text-text-muted sm:mx-0">
              {subtitulo}
            </p>
            <p className="mt-1 text-[15px] text-text-muted">¿Qué quieres crear hoy?</p>
          </div>
          <Image
            src="/brand/hero.png"
            alt=""
            width={1536}
            height={1024}
            priority
            className="hero-fade w-52 shrink-0 sm:w-[340px]"
          />
        </div>

        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Link
            href={crearHref}
            className="hover-lift block rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <span
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-xl"
              aria-hidden
            >
              ✨
            </span>
            <p className="font-display text-[16px] text-text">Crear contenido</p>
            <p className="mt-1 text-[13px] text-text-muted">
              Genera tu próxima pieza con ayuda de IA, lista en minutos.
            </p>
          </Link>
          <Link
            href="/proyectos"
            className="hover-lift block rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <span
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-xl"
              aria-hidden
            >
              📁
            </span>
            <p className="font-display text-[16px] text-text">Nuevo proyecto</p>
            <p className="mt-1 text-[13px] text-text-muted">
              Crea una nueva marca o negocio y entrena su identidad.
            </p>
          </Link>
        </div>
      </header>

      <div className="space-y-6">
        <Card className="hover-lift animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl"
                aria-hidden
              >
                🧠
              </span>
              <SectionTitle
                subtitle={
                  notasSinVincular > 0
                    ? `${notasSinVincular} nota${notasSinVincular === 1 ? "" : "s"} todavía sin vincular a un proyecto.`
                    : "Apunta ideas sueltas, sin fricción — vincúlalas a un proyecto cuando quieras."
                }
              >
                Segundo Cerebro
              </SectionTitle>
            </div>
            <LinkButton href="/segundo-cerebro">Abrir</LinkButton>
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
            <section className="animate-fade-in">
              <SectionTitle subtitle="Tus proyectos más activos.">Proyectos recientes</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {proyectosRecientes.map((p) => (
                  <Link
                    key={p.id}
                    href={`/proyectos/${p.id}/identidad`}
                    className="hover-lift block rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start gap-3">
                      {p.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={urlImagenVisible(p.logoUrl)}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-[16px] text-accent">
                          {p.nombre.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-medium text-text">{p.nombre}</p>
                        {p.descripcion ? (
                          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-text-muted">
                            {p.descripcion}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[11.5px] text-text-muted">
                          {formatearFechaChile(p.ultimaActividad)} · {p.totalContenidos}{" "}
                          contenido{p.totalContenidos === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-3">
                <Link href="/proyectos" className="text-[13px] text-accent underline">
                  Ver todos los proyectos
                </Link>
              </div>
            </section>

            <section className="animate-fade-in">
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
                      className="hover-lift flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-card)]"
                    >
                      <span className="text-xl" aria-hidden>
                        {iconoParaFormato(b.formato)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Chip>{b.formato}</Chip>
                        <p className="mt-1 truncate text-[14px] text-text">{b.titulo}</p>
                        <p className="text-[12px] text-text-muted">
                          {b.proyectoNombre} · {formatearFechaChile(b.createdAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
