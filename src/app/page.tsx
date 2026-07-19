import Image from "next/image";
import Link from "next/link";
import { getDashboardData } from "@/lib/actions";
import { Chip, Empty } from "@/components/ui";
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
  const { proyectoReciente, proyectosRecientes, totalProyectos, bloquesRecientes, notasSinVincular } =
    await getDashboardData();

  const saludo = saludoChile();

  const subtitulo = proyectoReciente
    ? `Puedes continuar con ${proyectoReciente.nombre}.`
    : proyectosRecientes.length > 0
      ? "Sigue creando contenido para tus proyectos."
      : "Crea tu primer proyecto para empezar.";

  // Con exactamente 1 proyecto no hay ambigüedad posible — directo a Crear.
  // Con 0 o 2+, al listado: sin proyectos para elegir uno, o con varios
  // para que el usuario elija a cuál entrar (ya no se asume "el más
  // reciente").
  const crearHref =
    totalProyectos === 1 && proyectoReciente ? `/proyectos/${proyectoReciente.id}/crear` : "/proyectos";

  const cerebroDescripcion =
    notasSinVincular > 0
      ? `${notasSinVincular} nota${notasSinVincular === 1 ? "" : "s"} todavía sin vincular a un proyecto.`
      : "Captura ideas sueltas, pensamientos e inspiraciones sin fricción.";

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-12 sm:py-14">
      <header className="animate-fade-in relative -mt-4 mb-10 min-h-[190px] sm:mb-14">
        <div className="hero-fade absolute -top-4 left-0 right-0 h-[190px] overflow-hidden rounded-[18px]">
          <Image
            src="/brand/hero.png"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 1052px"
            className="object-cover"
            style={{ objectPosition: "40% center" }}
          />
        </div>

        <div className="relative z-[1] max-w-[420px]">
          <p className="font-mono text-[11px] uppercase tracking-[2px] text-accent">
            Estudio Creativo JR
          </p>
          <h1 className="mt-2 font-display text-[28px] font-normal tracking-wide sm:text-[34px]">
            {saludo}, Jorge 👋
          </h1>
          <p className="mt-3 text-[15px] text-text-muted">{subtitulo}</p>
        </div>

        <div className="relative z-[1] mt-8 grid gap-3.5 sm:mt-[130px] sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={crearHref}
            className="hover-lift block rounded-[18px] bg-surface p-5 shadow-[var(--shadow-card)]"
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
            className="hover-lift block rounded-[18px] bg-surface p-5 shadow-[var(--shadow-card)]"
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
          <Link
            href="/segundo-cerebro"
            className="hover-lift block rounded-[18px] bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <span
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-xl"
              aria-hidden
            >
              🧠
            </span>
            <p className="font-display text-[16px] text-text">Segundo Cerebro</p>
            <p className="mt-1 text-[13px] text-text-muted">{cerebroDescripcion}</p>
          </Link>
          <Link
            href="/motores"
            className="hover-lift block rounded-[18px] bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <span
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-xl"
              aria-hidden
            >
              ⚙️
            </span>
            <p className="font-display text-[16px] text-text">Motores IA</p>
            <p className="mt-1 text-[13px] text-text-muted">
              Estrategias narrativas reutilizables para tu contenido.
            </p>
          </Link>
        </div>
      </header>

      {!proyectoReciente ? (
        <Empty title="Todavía no tienes proyectos">
          <Link href="/proyectos" className="text-accent underline">
            Crea tu primer proyecto
          </Link>{" "}
          para empezar.
        </Empty>
      ) : (
        <div className="space-y-7">
          <section className="animate-fade-in">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-normal tracking-wide sm:text-xl">
                  Proyectos recientes
                </h2>
                <p className="mt-1 text-sm text-text-muted">Tus proyectos más activos.</p>
              </div>
              <Link href="/proyectos" className="shrink-0 text-[13px] text-accent underline">
                Ver todos
              </Link>
            </div>
            <div
              className="grid gap-3.5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
            >
              {proyectosRecientes.map((p) => (
                <Link
                  key={p.id}
                  href={`/proyectos/${p.id}/identidad`}
                  className="hover-lift block rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]"
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
          </section>

          <section className="animate-fade-in">
            <h2 className="font-display text-lg font-normal tracking-wide sm:text-xl">
              Contenidos recientes
            </h2>
            <p className="mb-4 mt-1 text-sm text-text-muted">
              Lo último que guardaste, en cualquier proyecto.
            </p>
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
                    <span className="shrink-0 text-xl" aria-hidden>
                      {iconoParaFormato(b.formato)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Chip>{b.formato}</Chip>
                      <p className="mt-1 truncate text-[14px] text-text">{b.titulo}</p>
                      <p className="text-[12px] text-text-muted">
                        {b.proyectoNombre}
                        {b.personajeNombre ? ` · ${b.personajeNombre}` : ""} ·{" "}
                        {formatearFechaChile(b.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
