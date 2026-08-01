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

/** Indicador compacto de Personajes para la tarjeta — sigue siendo una
 * vista de escaneo rápido, no lista todos los nombres a partir de 3. */
function etiquetaPersonajes(personajeIds: string[], personajes: Personaje[]) {
  if (personajeIds.length === 0) return null;
  const nombres = personajeIds.map((id) => personajes.find((p) => p.id === id)?.nombre || "Sin nombre");
  if (nombres.length === 1) return `👤 ${nombres[0]}`;
  if (nombres.length === 2) return `👥 ${nombres[0]} · ${nombres[1]}`;
  return `👥 ${nombres[0]} +${nombres.length - 1}`;
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
  onReordenar,
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
  onReordenar: (idsEnOrden: string[]) => Promise<void>;
  onDuplicar: (escenaId: string) => Promise<void>;
  onEliminar: (escenaId: string) => Promise<void>;
}) {
  // Copia local para poder reordenar al instante durante un arrastre, sin
  // esperar el viaje al servidor — se resincroniza sola cada vez que el
  // servidor confirma un cambio (drag, flechas, duplicar, eliminar, crear).
  // Ajuste de estado derivado de props durante el render (sin useEffect),
  // siguiendo el patrón recomendado por React para este caso exacto.
  const [escenas, setEscenas] = useState(escenasIniciales);
  const [escenasInicialesPrevias, setEscenasInicialesPrevias] = useState(escenasIniciales);
  if (escenasIniciales !== escenasInicialesPrevias) {
    setEscenasInicialesPrevias(escenasIniciales);
    setEscenas(escenasIniciales);
  }

  const [escenaAbiertaId, setEscenaAbiertaId] = useState<string | null>(null);
  const [escenaAEliminarId, setEscenaAEliminarId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  const [arrastradaId, setArrastradaId] = useState<string | null>(null);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const tiempos = calcularTiempos(escenas);
  const escenaAbierta = escenas.find((e) => e.id === escenaAbiertaId) ?? null;

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

  function handleSoltar(destinoEscenaId: string) {
    const origenId = arrastradaId;
    setArrastradaId(null);
    setDestinoId(null);
    if (!origenId || origenId === destinoEscenaId) return;

    const fromIndex = escenas.findIndex((e) => e.id === origenId);
    const toIndex = escenas.findIndex((e) => e.id === destinoEscenaId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordenadas = [...escenas];
    const [movida] = reordenadas.splice(fromIndex, 1);
    reordenadas.splice(toIndex, 0, movida);
    setEscenas(reordenadas);

    startTransition(async () => {
      try {
        await onReordenar(reordenadas.map((e) => e.id));
      } catch (e) {
        setError(explicarError(e));
        setEscenas(escenasIniciales);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

      <Button type="button" variant="secondary" onClick={handleCrear} disabled={creando}>
        {creando ? "Creando…" : "+ Nueva escena"}
      </Button>

      {escenas.length === 0 ? (
        <Empty title="Todavía no hay escenas planificadas">
          Agrega la primera escena para empezar a armar el storyboard de esta producción.
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {escenas.map((escena, index) => {
            const t = tiempos.find((x) => x.id === escena.id)!;
            const plano = planos.find((p) => p.id === escena.planoId);
            const locacion = locaciones.find((a) => a.id === escena.locacionId);
            const esPrimera = index === 0;
            const esUltima = index === escenas.length - 1;
            const tipoLabel = ETIQUETAS_TIPO_ESCENA[escena.tipoEscena];
            const personajesLabel = etiquetaPersonajes(escena.personajeIds, personajes);
            return (
              <Card
                key={escena.id}
                draggable
                onDragStart={(e) => {
                  setArrastradaId(escena.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", escena.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (arrastradaId && arrastradaId !== escena.id) setDestinoId(escena.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleSoltar(escena.id);
                }}
                onDragEnd={() => {
                  setArrastradaId(null);
                  setDestinoId(null);
                }}
                className={`cursor-grab transition-colors hover:bg-surface-2/50 active:cursor-grabbing ${
                  arrastradaId === escena.id ? "opacity-40 shadow-lg" : ""
                } ${destinoId === escena.id && arrastradaId && arrastradaId !== escena.id ? "ring-2 ring-accent" : ""}`}
              >
                <div onClick={() => setEscenaAbiertaId(escena.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text-muted">#{escena.numero}</span>
                      <Chip variant={tipoLabel ? "default" : "neutral"}>{tipoLabel ?? "Sin tipo"}</Chip>
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
                      {escena.duracionSegundos === 0
                        ? "Duración pendiente"
                        : `${formatoTiempo(t.inicio)}–${formatoTiempo(t.fin)} (${escena.duracionSegundos}s)`}
                    </span>
                    {plano ? <span>🎥 {plano.nombre}</span> : null}
                    {locacion ? <span>📍 {locacion.nombre}</span> : null}
                    {personajesLabel ? <span>{personajesLabel}</span> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
