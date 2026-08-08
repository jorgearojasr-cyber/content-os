"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, Card, Chip, Empty } from "@/components/ui";
import { EstadoProduccionSelect } from "@/components/estado-produccion-badge";
import { ActionMenu, ActionMenuItem } from "@/components/action-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { explicarError } from "@/lib/errores";
import { buscarEscenaOriginalCpp } from "@/lib/creator-os-package";
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

/** Etiqueta de la acción principal de la tarjeta — mismo destino que
 * siempre tuvo (Copiloto para esa escena, ver `abrirEnCopiloto`), solo
 * texto distinto según el estado, para que la tarjeta diga explícitamente
 * qué hacer con esta escena en vez de dejarlo implícito (Sprint 5,
 * rediseño visual "hoja de rodaje" — no cambia el destino, solo lo nombra). */
function etiquetaAccionPrincipal(estado: string) {
  switch (estado) {
    case "BORRADOR":
      return "🎬 Grabar esta escena";
    case "GRABADA":
      return "✂️ Revisar y editar";
    case "EDITADA":
      return "👁 Ver escena";
    case "PUBLICADA":
      return "✓ Ver escena publicada";
    default:
      return "Ver escena";
  }
}

/** Formato compacto de nombres de Personajes — sigue siendo una vista de
 * escaneo rápido, no lista todos los nombres a partir de 3. Recibe nombres
 * ya resueltos (de la Biblioteca o crudos del CPP, SPRINT_EXECUTION_2) para
 * poder reutilizarse en ambos casos. */
function formatoPersonajes(nombres: string[]) {
  if (nombres.length === 0) return null;
  if (nombres.length === 1) return `👤 ${nombres[0]}`;
  if (nombres.length === 2) return `👥 ${nombres[0]} · ${nombres[1]}`;
  return `👥 ${nombres[0]} +${nombres.length - 1}`;
}

/** Indicador compacto de Personajes para la tarjeta, a partir de vínculos
 * reales de Biblioteca. */
function etiquetaPersonajes(personajeIds: string[], personajes: Personaje[]) {
  if (personajeIds.length === 0) return null;
  const nombres = personajeIds.map((id) => personajes.find((p) => p.id === id)?.nombre || "Sin nombre");
  return formatoPersonajes(nombres);
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
  cppOriginal,
  onCrear,
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
  cppOriginal: string | null;
  onCrear: () => Promise<void>;
  onEstadoChange: (escenaId: string, estado: string) => Promise<void>;
  onMover: (escenaId: string, direccion: "arriba" | "abajo") => Promise<void>;
  onReordenar: (idsEnOrden: string[]) => Promise<void>;
  onDuplicar: (escenaId: string) => Promise<void>;
  onEliminar: (escenaId: string) => Promise<void>;
}) {
  const router = useRouter();
  const params = useParams<{ id: string; produccionId: string }>();
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

  const [escenaAEliminarId, setEscenaAEliminarId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  const [arrastradaId, setArrastradaId] = useState<string | null>(null);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const tiempos = calcularTiempos(escenas);
  const quedanEscenasPorGrabar = escenas.some((e) => e.estadoProduccion === "BORRADOR");

  // SPRINT_EXECUTION_2: respaldo de solo lectura para cuando una escena no
  // tiene Plano/Locación/Personajes vinculados en la Biblioteca — busca el
  // texto original que declaró el CPP usando la posición inmutable
  // (`numeroEnAnalisisDirector`), nunca el `numero` visible actual.
  const escenasCppPorId = useMemo(() => {
    const mapa = new Map<string, ReturnType<typeof buscarEscenaOriginalCpp>>();
    for (const escena of escenas) {
      mapa.set(escena.id, buscarEscenaOriginalCpp(cppOriginal, escena.numeroEnAnalisisDirector));
    }
    return mapa;
  }, [escenas, cppOriginal]);

  // UX-MIGRATION-5: tocar una tarjeta lleva a Copiloto para esa escena —
  // el Storyboard deja de ser una segunda forma de editar contenido
  // (antes abría `EscenaPanel` acá mismo) y pasa a ser exclusivamente la
  // herramienta para ordenar, mover, duplicar y eliminar.
  function abrirEnCopiloto(escenaId: string) {
    router.push(`/proyectos/${params.id}/producciones/${params.produccionId}/copiloto/${escenaId}`);
  }

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

      {/* UX-MIGRATION-5.1: recuerda que cada tarjeta ya tiene su acción
          principal (Sprint 5) — desaparece sola apenas no queda ninguna
          escena en Borrador. */}
      {quedanEscenasPorGrabar ? (
        <p className="text-[12.5px] text-text-muted">
          Todavía quedan escenas por grabar. Usá el botón de cada tarjeta para continuar donde quedaste.
        </p>
      ) : null}

      <Button type="button" variant="secondary" onClick={handleCrear} disabled={creando}>
        {creando ? "Creando…" : "+ Nueva escena"}
      </Button>

      {escenas.length === 0 ? (
        <Empty title="Todavía no hay escenas planificadas">
          Agrega la primera escena para empezar a armar el storyboard de esta producción.
        </Empty>
      ) : (
        <div className="space-y-3">
          {escenas.map((escena, index) => {
            const t = tiempos.find((x) => x.id === escena.id)!;
            const plano = planos.find((p) => p.id === escena.planoId);
            const locacion = locaciones.find((a) => a.id === escena.locacionId);
            const esPrimera = index === 0;
            const esUltima = index === escenas.length - 1;
            const tipoLabel = ETIQUETAS_TIPO_ESCENA[escena.tipoEscena];
            // SPRINT_EXECUTION_2: si no hay vínculo de Biblioteca, cae al
            // nombre crudo que declaró el CPP — nunca a "Sin definir/Sin
            // vincular/Pendiente".
            const escenaCpp = escenasCppPorId.get(escena.id) ?? null;
            const planoNombre = plano?.nombre ?? escenaCpp?.plano ?? null;
            const locacionNombre = locacion?.nombre ?? escenaCpp?.locacion ?? null;
            const personajesLabel =
              etiquetaPersonajes(escena.personajeIds, personajes) ??
              (escenaCpp?.personajes?.length ? formatoPersonajes(escenaCpp.personajes) : null);
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
                {/* SPRINT_EXECUTION_3: "cada tarjeta responde una sola
                    pregunta" (¿qué tengo que grabar?) — número, tipo,
                    objetivo, plano/locación/personajes/duración en una
                    línea y el botón, sin fichas ni recuadros vacíos.
                    Estado y menú (⋮) se mantienen: son controles, no
                    información secundaria. */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="font-display text-xl font-normal tracking-wide text-text">
                      #{escena.numero}
                    </span>
                    <Chip variant={tipoLabel ? "default" : "neutral"}>{tipoLabel ?? "Sin tipo"}</Chip>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <EstadoProduccionSelect
                      escenaId={escena.id}
                      estado={escena.estadoProduccion}
                      onChange={handleEstadoChange}
                    />
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

                {locacion?.valor ? (
                  <img
                    src={locacion.valor}
                    alt={`Referencia visual: ${locacion.nombre}`}
                    className="mt-2 h-16 w-full rounded-lg object-cover"
                  />
                ) : null}

                <p className="mt-1.5 line-clamp-2 text-[14px] text-text">
                  {escena.objetivoNarrativo || "Sin objetivo narrativo todavía"}
                </p>

                <p className="mt-1 truncate text-[12px] text-text-muted">
                  🎥 {planoNombre ?? "No especificado en el CPP"}
                  {locacionNombre ? ` · 📍 ${locacionNombre}` : ""}
                  {personajesLabel ? ` · ${personajesLabel}` : ""}
                  {" · ⏱ "}
                  {escena.duracionSegundos === 0
                    ? "Pendiente"
                    : `${formatoTiempo(t.inicio)}–${formatoTiempo(t.fin)} (${escena.duracionSegundos}s)`}
                </p>

                <div className="mt-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1.5 text-[12.5px]"
                    onClick={() => abrirEnCopiloto(escena.id)}
                  >
                    {etiquetaAccionPrincipal(escena.estadoProduccion)}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
