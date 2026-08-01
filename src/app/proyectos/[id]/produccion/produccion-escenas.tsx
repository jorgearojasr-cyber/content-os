"use client";

import { useState, useTransition } from "react";
import { Button, Card, Chip, Empty } from "@/components/ui";
import { EstadoProduccionSelect } from "@/components/estado-produccion-badge";
import { ActionMenu, ActionMenuItem } from "@/components/action-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { explicarError } from "@/lib/errores";
import { EscenaPanel } from "./escena-panel";
import type { Activo, Personaje, Plano, StoryboardEscenaConPersonajes } from "@/lib/types";

const ETIQUETAS_TIPO_ESCENA: Record<string, string> = {
  GANCHO: "Gancho",
  PROBLEMA: "Problema",
  DESCUBRIMIENTO: "Descubrimiento",
  SOLUCION: "Solución",
  CTA: "CTA",
  BROLL: "B-roll",
  TRANSICION: "Transición",
  OTRA: "Otra",
};

function formatoTiempo(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Calcula, para cada escena en orden, el rango de tiempo que ocupa —
 * nunca persistido, siempre derivado de `orden` + `duracionSegundos`. */
function calcularTiempos(escenas: StoryboardEscenaConPersonajes[]) {
  let acumulado = 0;
  return escenas.map((e) => {
    const inicio = acumulado;
    acumulado += e.duracionSegundos;
    return { id: e.id, inicio, fin: acumulado };
  });
}

export function ProduccionEscenas({
  escenasIniciales,
  planos,
  locaciones,
  personajes,
  onCrear,
  onSave,
  onEstadoChange,
  onMover,
  onDuplicar,
  onEliminar,
}: {
  escenasIniciales: StoryboardEscenaConPersonajes[];
  planos: Plano[];
  locaciones: Activo[];
  personajes: Personaje[];
  onCrear: () => Promise<void>;
  onSave: (escenaId: string, formData: FormData) => Promise<void>;
  onEstadoChange: (escenaId: string, estado: string) => Promise<void>;
  onMover: (escenaId: string, direccion: "arriba" | "abajo") => Promise<void>;
  onDuplicar: (escenaId: string) => Promise<void>;
  onEliminar: (escenaId: string) => Promise<void>;
}) {
  const [escenaAbiertaId, setEscenaAbiertaId] = useState<string | null>(null);
  const [escenaAEliminarId, setEscenaAEliminarId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const tiempos = calcularTiempos(escenasIniciales);
  const escenaAbierta = escenasIniciales.find((e) => e.id === escenaAbiertaId) ?? null;

  async function handleCrear() {
    setCreando(true);
    setError("");
    try {
      await onCrear();
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCreando(false);
    }
  }

  async function handleEstadoChange(escenaId: string, estado: string) {
    startTransition(async () => {
      try {
        await onEstadoChange(escenaId, estado);
      } catch (e) {
        setError(explicarError(e));
      }
    });
  }

  function handleMover(escenaId: string, direccion: "arriba" | "abajo") {
    startTransition(async () => {
      try {
        await onMover(escenaId, direccion);
      } catch (e) {
        setError(explicarError(e));
      }
    });
  }

  function handleDuplicar(escenaId: string) {
    startTransition(async () => {
      try {
        await onDuplicar(escenaId);
      } catch (e) {
        setError(explicarError(e));
      }
    });
  }

  function handleEliminar(escenaId: string) {
    startTransition(async () => {
      try {
        await onEliminar(escenaId);
      } catch (e) {
        setError(explicarError(e));
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

      {escenasIniciales.length === 0 ? (
        <Empty title="Todavía no hay escenas planificadas">
          Agrega la primera escena para empezar a armar el storyboard de esta producción.
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {escenasIniciales.map((escena, index) => {
            const t = tiempos.find((x) => x.id === escena.id)!;
            const plano = planos.find((p) => p.id === escena.planoId);
            const locacion = locaciones.find((a) => a.id === escena.locacionId);
            const esPrimera = index === 0;
            const esUltima = index === escenasIniciales.length - 1;
            return (
              <Card
                key={escena.id}
                className="cursor-pointer transition-colors hover:bg-surface-2/50"
              >
                <div onClick={() => setEscenaAbiertaId(escena.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text-muted">#{escena.numero}</span>
                      <Chip>{ETIQUETAS_TIPO_ESCENA[escena.tipoEscena] ?? "Sin tipo"}</Chip>
                    </div>
                    <div className="flex items-center gap-1">
                      <EstadoProduccionSelect
                        escenaId={escena.id}
                        estado={escena.estadoProduccion}
                        onChange={handleEstadoChange}
                      />
                      <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu>
                          <ActionMenuItem disabled={esPrimera} onSelect={() => handleMover(escena.id, "arriba")}>
                            ↑ Mover arriba
                          </ActionMenuItem>
                          <ActionMenuItem disabled={esUltima} onSelect={() => handleMover(escena.id, "abajo")}>
                            ↓ Mover abajo
                          </ActionMenuItem>
                          <ActionMenuItem onSelect={() => handleDuplicar(escena.id)}>Duplicar</ActionMenuItem>
                          <ActionMenuItem variant="danger" onSelect={() => setEscenaAEliminarId(escena.id)}>
                            Eliminar
                          </ActionMenuItem>
                        </ActionMenu>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-[13.5px] text-text">
                    {escena.objetivoNarrativo || "Sin objetivo narrativo todavía"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-text-muted">
                    <span>
                      {formatoTiempo(t.inicio)}–{formatoTiempo(t.fin)} ({escena.duracionSegundos}s)
                    </span>
                    {plano ? <span>🎥 {plano.nombre}</span> : null}
                    {locacion ? <span>📍 {locacion.nombre}</span> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Button type="button" variant="secondary" onClick={handleCrear} disabled={creando}>
        {creando ? "Creando…" : "+ Nueva escena"}
      </Button>

      {escenaAbierta ? (
        <EscenaPanel
          escena={escenaAbierta}
          planos={planos}
          locaciones={locaciones}
          personajes={personajes}
          onClose={() => setEscenaAbiertaId(null)}
          onSave={onSave}
          onEstadoChange={onEstadoChange}
        />
      ) : null}

      <ConfirmDialog
        open={escenaAEliminarId !== null}
        onOpenChange={(open) => !open && setEscenaAEliminarId(null)}
        title="¿Eliminar esta escena?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (escenaAEliminarId) handleEliminar(escenaAEliminarId);
        }}
      />
    </div>
  );
}
