import Link from "next/link";
import { notFound } from "next/navigation";
import { getProyecto } from "@/lib/actions";
import { ProjectNav } from "./project-nav";

export default async function ProyectoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proyecto = await getProyecto(id);
  if (!proyecto) notFound();

  return (
    <div className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
      <header className="mb-5 border-b border-border pb-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent hover:text-accent/80"
          >
            Content OS
          </Link>
          <Link
            href="/proyectos"
            className="font-mono text-[10px] uppercase tracking-[1.5px] text-text-muted hover:text-accent"
          >
            ← Todos los proyectos
          </Link>
        </div>
        <h1 className="mt-1 font-display text-2xl font-normal tracking-wide">
          {proyecto.nombre}
        </h1>
        {proyecto.descripcion ? (
          <p className="mt-1 text-sm text-text-muted">{proyecto.descripcion}</p>
        ) : null}
      </header>

      <ProjectNav proyectoId={proyecto.id} />

      <main className="mt-5">{children}</main>
    </div>
  );
}
