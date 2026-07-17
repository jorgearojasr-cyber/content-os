"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Exactamente 5 ítems — no hay Recursos, Campañas ni Configuración en
 * esta app, así que no se agregan aquí tampoco. Íconos igual que el
 * rediseño de Claude Design (Dashboard.dc.html). */
const ITEMS = [
  { href: "/", label: "Inicio", icono: "🏠" },
  { href: "/proyectos", label: "Proyectos", icono: "📁" },
  { href: "/segundo-cerebro", label: "Segundo Cerebro", icono: "🧠" },
  { href: "/personajes", label: "Personajes", icono: "👤" },
  { href: "/biblioteca", label: "Biblioteca", icono: "📖" },
] as const;

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();

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
      <nav className="space-y-1">
        {ITEMS.map((item) => {
          const activo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] transition-colors ${
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
        })}
      </nav>
    </aside>
  );
}
