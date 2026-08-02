"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** MIGRATION-4A: navegación objetivo de 4 destinos (Hoy / Mis videos /
 * Mi marca / Ideas) — ver MIGRATION-4-DESIGN. Ninguna ruta cambió, solo se
 * reagrupó dónde se llega a cada una. Íconos reutilizan el mismo
 * vocabulario visual que `project-nav.tsx` (🎬 Producción, 🪪 Identidad)
 * para que un mismo concepto se vea igual en los dos niveles de nav. */
type Leaf = { href: string; label: string; icono: string };

const HOY: Leaf = { href: "/", label: "Hoy", icono: "🏠" };

const MIS_VIDEOS = {
  label: "Mis videos",
  icono: "🎬",
  href: "/biblioteca",
  hijos: [
    { href: "/biblioteca", label: "Biblioteca", icono: "📖" },
    { href: "/calendario", label: "Calendario", icono: "📅" },
  ] as Leaf[],
};

const MI_MARCA = {
  label: "Mi marca",
  icono: "🪪",
  href: "/proyectos",
  hijos: [
    { href: "/proyectos", label: "Marcas", icono: "📁" },
    { href: "/personajes", label: "Personajes", icono: "👤" },
  ] as Leaf[],
  grupoConocimiento: {
    label: "Conocimiento del estudio",
    icono: "📚",
    hijos: [
      { href: "/prompts", label: "Prompts", icono: "📝" },
      { href: "/conocimiento", label: "Documentos", icono: "📚" },
    ] as Leaf[],
  },
};

const IDEAS: Leaf = { href: "/segundo-cerebro", label: "Ideas", icono: "🧠" };

function ItemLink({ item, activo, indent = false }: { item: Leaf; activo: boolean; indent?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] transition-colors ${
        indent ? "ml-3" : ""
      } ${
        activo
          ? "bg-accent-soft font-semibold text-accent"
          : "text-text-muted hover:bg-surface-2 hover:text-text"
      }`}
    >
      <span className="w-[18px] text-center text-[15px]" aria-hidden>
        {item.icono}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const esActivo = (href: string) => pathname === href;
  const dentroDe = (prefijos: string[]) => prefijos.some((p) => pathname?.startsWith(p));

  return (
    <aside className={`w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 ${className}`}>
      <Link href="/" className="mb-8 block">
        {/* El logo ya trae el nombre "Estudio Creativo JR" dibujado dentro
         * del PNG — no se repite como texto aparte para no duplicarlo. */}
        <Image
          src="/brand/logo.png"
          alt="Estudio Creativo JR"
          width={1536}
          height={1024}
          priority
          className="h-auto w-full max-w-[180px]"
        />
      </Link>
      <nav className="space-y-4">
        <div className="space-y-1">
          <ItemLink item={HOY} activo={esActivo(HOY.href)} />
        </div>

        <div className="space-y-1">
          <ItemLink
            item={MIS_VIDEOS}
            activo={dentroDe(MIS_VIDEOS.hijos.map((h) => h.href))}
          />
          {MIS_VIDEOS.hijos.map((hijo) => (
            <ItemLink key={hijo.href} item={hijo} activo={esActivo(hijo.href)} indent />
          ))}
        </div>

        <div className="space-y-1">
          <ItemLink
            item={MI_MARCA}
            activo={dentroDe([
              "/proyectos",
              "/personajes",
              "/prompts",
              "/conocimiento",
            ])}
          />
          {MI_MARCA.hijos.map((hijo) => (
            <ItemLink key={hijo.href} item={hijo} activo={esActivo(hijo.href)} indent />
          ))}
          <p className="ml-3 mt-2 px-3 font-mono text-[10px] uppercase tracking-[1px] text-text-muted/70">
            {MI_MARCA.grupoConocimiento.icono} {MI_MARCA.grupoConocimiento.label}
          </p>
          {MI_MARCA.grupoConocimiento.hijos.map((hijo) => (
            <ItemLink key={hijo.href} item={hijo} activo={esActivo(hijo.href)} indent />
          ))}
        </div>

        <div className="space-y-1">
          <ItemLink item={IDEAS} activo={esActivo(IDEAS.href)} />
        </div>
      </nav>
    </aside>
  );
}
