"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "crear", label: "Crear" },
  { slug: "identidad", label: "Identidad" },
  { slug: "biblioteca", label: "Biblioteca" },
  { slug: "activos", label: "Activos" },
] as const;

export function ProjectNav({ proyectoId }: { proyectoId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-[10px] border border-border bg-surface p-1">
      {TABS.map((tab) => {
        const href = `/proyectos/${proyectoId}/${tab.slug}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-[13.5px] transition-colors ${
              active
                ? "bg-surface-2 text-text border border-border"
                : "border border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
