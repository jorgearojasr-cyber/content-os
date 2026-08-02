"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** MIGRATION-4B: Prompts y Conocimiento ya no tienen pestaña propia acá —
 * ahora son pantallas únicas (/prompts, /conocimiento) con selector de
 * Alcance, así que la Marca deja de ser la única forma de llegar a su
 * contenido con alcance específico. Ver el excepción #2 de MIGRATION-4A que
 * este pase resuelve. */
const TABS = [
  { slug: "crear", label: "Crear", icono: "✍️" },
  { slug: "identidad", label: "Identidad", icono: "🪪" },
  { slug: "produccion", label: "Producción", icono: "🎬" },
  { slug: "biblioteca", label: "Biblioteca", icono: "📖" },
  { slug: "activos", label: "Activos", icono: "🖼️" },
  { slug: "configuracion", label: "Configuración", icono: "⚙️" },
] as const;

/** true dentro de una Producción concreta (Escenas, Copiloto, Editar,
 * Cierre) — nunca en el listado de Producciones ni en el resto del
 * proyecto. Es el único tramo donde este nav compite de verdad con el
 * trabajo de grabar/editar una escena (UX-MIGRATION-5, UX-AUDIT-5 #3). */
function calcularEnProduccionActiva(pathname: string | null): boolean {
  return /^\/proyectos\/[^/]+\/producciones\/[^/]+/.test(pathname ?? "");
}

export function ProjectNav({ proyectoId }: { proyectoId: string }) {
  const pathname = usePathname();
  const enProduccionActiva = calcularEnProduccionActiva(pathname);

  // Colapsa sola a solo íconos al entrar a una Producción activa, y se
  // olvida del override manual al salir — así la próxima Producción
  // vuelve a arrancar colapsada en vez de heredar el último estado.
  const [expandidoManual, setExpandidoManual] = useState<boolean | null>(null);
  useEffect(() => {
    queueMicrotask(() => setExpandidoManual(null));
  }, [enProduccionActiva]);

  const expandido = expandidoManual ?? !enProduccionActiva;

  return (
    <div className="flex items-center gap-1.5">
      <nav
        className={`flex gap-1 overflow-x-auto rounded-[10px] border border-border bg-surface p-1 ${
          expandido ? "flex-1" : ""
        }`}
      >
        {TABS.map((tab) => {
          const href = `/proyectos/${proyectoId}/${tab.slug}`;
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={tab.slug}
              href={href}
              title={expandido ? undefined : tab.label}
              className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13.5px] transition-colors ${
                expandido ? "flex-1 px-3 py-2 text-center" : "px-2.5 py-2"
              } ${
                active
                  ? "bg-surface-2 text-text border border-border"
                  : "border border-transparent text-text-muted hover:text-text"
              }`}
            >
              <span aria-hidden>{tab.icono}</span>
              {expandido ? <span>{tab.label}</span> : null}
            </Link>
          );
        })}
      </nav>
      {enProduccionActiva ? (
        <button
          type="button"
          onClick={() => setExpandidoManual(!expandido)}
          aria-label={expandido ? "Colapsar navegación" : "Expandir navegación"}
          title={expandido ? "Colapsar navegación" : "Expandir navegación"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-muted hover:text-text"
        >
          {expandido ? "«" : "»"}
        </button>
      ) : null}
    </div>
  );
}
