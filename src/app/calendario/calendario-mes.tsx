"use client";

import { useState } from "react";
import { asignarFechaPlanificada } from "@/lib/actions";
import { agruparPorSemana, nombreMes, type AnioMes, type CeldaCalendario } from "@/lib/calendario";
import { PromptDialog } from "@/components/confirm-dialog";
import { iconoFormato } from "@/lib/types";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export type PiezaCalendario = {
  id: string;
  proyectoId: string;
  proyectoNombre: string;
  titulo: string;
  formato: string;
  fechaPlanificada: string;
};

/** Chip de una pieza asignada a un día — clic abre el selector de fecha
 * para reasignarla (mismo mecanismo que "Cambiar fecha planificada" en
 * Biblioteca, sin duplicar lógica: ambos llaman a `asignarFechaPlanificada`). */
function ChipPieza({ pieza }: { pieza: PiezaCalendario }) {
  const [reasignando, setReasignando] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setReasignando(true)}
        title={`${pieza.titulo} · ${pieza.proyectoNombre}`}
        className="flex w-full items-center gap-1 truncate rounded-md bg-accent-soft px-1.5 py-0.5 text-left text-[10.5px] text-accent hover:opacity-80"
      >
        <span className="shrink-0">{iconoFormato(pieza.formato)}</span>
        <span className="truncate">{pieza.titulo}</span>
      </button>
      <PromptDialog
        open={reasignando}
        onOpenChange={setReasignando}
        type="date"
        title={`Reasignar fecha — ${pieza.titulo}`}
        defaultValue={pieza.fechaPlanificada}
        onSubmit={(fecha) => {
          const fd = new FormData();
          fd.set("fecha", fecha);
          asignarFechaPlanificada(pieza.proyectoId, pieza.id, fd);
        }}
      />
    </>
  );
}

export function CalendarioMes({
  celdas,
  piezasPorFecha,
  anioMes,
  hrefMesAnterior,
  hrefMesSiguiente,
  hrefMesActual,
}: {
  celdas: CeldaCalendario[];
  piezasPorFecha: Record<string, PiezaCalendario[]>;
  anioMes: AnioMes;
  hrefMesAnterior: string;
  hrefMesSiguiente: string;
  hrefMesActual: string;
}) {
  const semanas = agruparPorSemana(celdas);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <a
          href={hrefMesAnterior}
          className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-text hover:bg-surface-2"
        >
          ← Anterior
        </a>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg">
            {nombreMes(anioMes.mes)} {anioMes.anio}
          </h2>
          <a href={hrefMesActual} className="text-[11.5px] text-accent underline">
            Hoy
          </a>
        </div>
        <a
          href={hrefMesSiguiente}
          className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-text hover:bg-surface-2"
        >
          Siguiente →
        </a>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="px-1 pb-1 text-center font-mono text-[10.5px] uppercase text-text-muted">
            {d}
          </div>
        ))}
        {semanas.map((semana) =>
          semana.map((celda) => {
            const piezas = piezasPorFecha[celda.fecha] ?? [];
            return (
              <div
                key={celda.fecha}
                className={`min-h-[76px] rounded-lg border border-border p-1 sm:min-h-[92px] sm:p-1.5 ${
                  celda.enMesActual ? "bg-surface" : "bg-surface-2/50"
                }`}
              >
                <div
                  className={`mb-1 text-[11px] ${celda.enMesActual ? "text-text" : "text-text-muted/50"}`}
                >
                  {celda.diaMes}
                </div>
                <div className="space-y-1">
                  {piezas.map((p) => (
                    <ChipPieza key={p.id} pieza={p} />
                  ))}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
