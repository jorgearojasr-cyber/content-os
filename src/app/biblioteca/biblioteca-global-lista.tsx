"use client";

import { useState } from "react";
import Link from "next/link";
import { Empty } from "@/components/ui";
import { BloqueCard, type BloqueConDias } from "@/app/proyectos/[id]/biblioteca/biblioteca-lista";
import type { PersonajeResumen, Proyecto } from "@/lib/types";

export type Vista = "activos" | "archivados" | "papelera";

type BloqueGlobal = BloqueConDias & { proyectoNombre: string };

const TABS: { value: Vista; label: string }[] = [
  { value: "activos", label: "Biblioteca" },
  { value: "archivados", label: "Archivados" },
  { value: "papelera", label: "Papelera" },
];

const MENSAJE_VACIO: Record<Vista, { titulo: string; texto: string }> = {
  activos: {
    titulo: "Todavía no hay nada guardado",
    texto: "Ve a la pestaña Crear de una marca y guarda tu primera pieza — aparecerá aquí.",
  },
  archivados: {
    titulo: "No hay bloques archivados",
    texto: "Los bloques que archives desde la Biblioteca aparecerán aquí.",
  },
  papelera: {
    titulo: "La papelera está vacía",
    texto: "El contenido que elimines se guarda aquí durante 7 días antes de borrarse para siempre.",
  },
};

/**
 * Lista global de Biblioteca: mismas tarjetas (`BloqueCard`) y mismas 3
 * vistas (Biblioteca/Archivados/Papelera) que la Biblioteca por Marca,
 * MIGRATION-4B — más la etiqueta de Marca y un filtro por Marca arriba, ya
 * que acá se mezclan piezas de todo el estudio. El filtro de Marca es
 * puramente en el cliente — ya se trajeron todos los bloques de la vista
 * activa del servidor de una vez.
 */
export function BibliotecaGlobalLista({
  vista,
  bloques,
  proyectos,
  personajePorId,
}: {
  vista: Vista;
  bloques: BloqueGlobal[];
  proyectos: Proyecto[];
  personajePorId: Record<string, PersonajeResumen>;
}) {
  const [filtro, setFiltro] = useState<string>("");

  const bloquesFiltrados = filtro ? bloques.filter((b) => b.proyectoId === filtro) : bloques;

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-[10px] border border-border bg-surface p-1">
        {TABS.map((tab) => {
          const href = tab.value === "activos" ? "/biblioteca" : `/biblioteca?vista=${tab.value}`;
          const active = vista === tab.value;
          return (
            <Link
              key={tab.value}
              href={href}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-[13px] transition-colors ${
                active
                  ? "bg-surface-2 text-text border border-border"
                  : "border border-transparent text-text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <select
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="mb-4 w-full max-w-[280px] rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
      >
        <option value="">Todas las marcas</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>

      {bloquesFiltrados.length === 0 ? (
        <Empty title={MENSAJE_VACIO[vista].titulo}>
          {bloques.length === 0 ? MENSAJE_VACIO[vista].texto : "Prueba con otra marca."}
        </Empty>
      ) : (
        <div className="space-y-3">
          {bloquesFiltrados.map((bloque) => (
            <BloqueCard
              key={bloque.id}
              proyectoId={bloque.proyectoId}
              vista={vista}
              bloque={bloque}
              otrosProyectos={proyectos
                .filter((p) => p.id !== bloque.proyectoId)
                .map((p) => ({ id: p.id, nombre: p.nombre }))}
              nombreProyecto={bloque.proyectoNombre}
              personaje={bloque.personajeId ? personajePorId[bloque.personajeId] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
