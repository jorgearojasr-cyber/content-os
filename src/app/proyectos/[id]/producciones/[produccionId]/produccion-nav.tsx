"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "", label: "Escenas" },
  { slug: "grabacion", label: "Grabación" },
  { slug: "edicion", label: "Edición" },
  { slug: "publicacion", label: "Publicación" },
] as const;

export function ProduccionNav({ proyectoId, produccionId }: { proyectoId: string; produccionId: string }) {
  const pathname = usePathname();
  const base = `/proyectos/${proyectoId}/producciones/${produccionId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-[10px] border border-border bg-surface p-1">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug ? pathname?.startsWith(href) : pathname === base;
        return (
          <Link
            key={tab.slug || "escenas"}
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
