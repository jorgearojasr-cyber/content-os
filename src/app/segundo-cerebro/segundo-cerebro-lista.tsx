"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Chip, Empty } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatearFechaChile } from "@/lib/fecha";
import type { Nota, Proyecto } from "@/lib/types";

type Filtro = "todas" | "sin-vincular" | string;

export function SegundoCerebroLista({
  notas,
  proyectos,
  onVincular,
  onDelete,
}: {
  notas: Nota[];
  proyectos: Proyecto[];
  onVincular: (notaId: string, proyectoId: string | null) => Promise<void>;
  onDelete: (notaId: string) => Promise<void>;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const nombrePorProyecto = new Map(proyectos.map((p) => [p.id, p.nombre]));

  const notasFiltradas = notas.filter((n) => {
    if (filtro === "todas") return true;
    if (filtro === "sin-vincular") return n.proyectoId === null;
    return n.proyectoId === filtro;
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <FiltroBoton activo={filtro === "todas"} onClick={() => setFiltro("todas")}>
          Todas
        </FiltroBoton>
        <FiltroBoton activo={filtro === "sin-vincular"} onClick={() => setFiltro("sin-vincular")}>
          Sin vincular
        </FiltroBoton>
        {proyectos.map((p) => (
          <FiltroBoton key={p.id} activo={filtro === p.id} onClick={() => setFiltro(p.id)}>
            {p.nombre}
          </FiltroBoton>
        ))}
      </div>

      {notasFiltradas.length === 0 ? (
        <Empty title="No hay notas para este filtro">
          {notas.length === 0 ? "Escribe tu primera idea arriba." : "Prueba con otro filtro."}
        </Empty>
      ) : (
        <div className="space-y-3">
          {notasFiltradas.map((nota) => (
            <NotaCard
              key={nota.id}
              nota={nota}
              proyectos={proyectos}
              nombreProyecto={nota.proyectoId ? nombrePorProyecto.get(nota.proyectoId) ?? "" : ""}
              onVincular={onVincular}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FiltroBoton({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${
        activo
          ? "bg-accent font-semibold text-white"
          : "border border-border bg-surface-2 text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function NotaCard({
  nota,
  proyectos,
  nombreProyecto,
  onVincular,
  onDelete,
}: {
  nota: Nota;
  proyectos: Proyecto[];
  nombreProyecto: string;
  onVincular: (notaId: string, proyectoId: string | null) => Promise<void>;
  onDelete: (notaId: string) => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>{nombreProyecto || "Sin vincular"}</Chip>
          {nota.estado === "trabajada" ? (
            nota.bloqueId && nota.proyectoId ? (
              <Link href={`/proyectos/${nota.proyectoId}/biblioteca/${nota.bloqueId}/editar`}>
                <Chip>✅ Trabajada</Chip>
              </Link>
            ) : (
              <Chip>✅ Trabajada</Chip>
            )
          ) : (
            <Chip>⏳ Pendiente</Chip>
          )}
        </div>
        <Button
          variant="danger"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => setConfirmOpen(true)}
        >
          Eliminar
        </Button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[14px] text-text">{nota.texto}</p>
      <p className="mt-2 text-[12px] text-text-muted">{formatearFechaChile(nota.createdAt)}</p>

      <select
        value={nota.proyectoId ?? ""}
        onChange={(e) => onVincular(nota.id, e.target.value || null)}
        className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] text-text"
      >
        <option value="">Sin vincular</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar esta nota?"
        description="No hay papelera para notas — se borra de inmediato."
        confirmLabel="Eliminar"
        onConfirm={() => onDelete(nota.id)}
      />
    </Card>
  );
}
