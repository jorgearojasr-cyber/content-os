"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

/** Las 5 pantallas globales — cualquier otra ruta (ej. dentro de un
 * proyecto) se sirve tal cual, sin sidebar, sin tocar su layout actual. */
const RUTAS_CON_SIDEBAR = new Set([
  "/",
  "/proyectos",
  "/segundo-cerebro",
  "/personajes",
  "/biblioteca",
]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (!RUTAS_CON_SIDEBAR.has(pathname ?? "")) {
    return <>{children}</>;
  }

  return (
    <div className="lg:flex lg:min-h-full">
      <Sidebar className="hidden lg:flex" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
