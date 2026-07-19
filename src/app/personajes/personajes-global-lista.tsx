"use client";

import { useState } from "react";
import Link from "next/link";
import { getRelacionesPersonaje } from "@/lib/actions";
import { Button, Card, Chip, Empty } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RelacionadoPanel } from "@/components/relacionado-panel";
import { PersonajeForm } from "@/app/proyectos/[id]/identidad/personajes-lista";
import { extraerFragmento } from "@/lib/reutilizacion";
import { urlImagenVisible } from "@/lib/imagen-url";
import { fotoPrincipal, parseFotosPersonaje } from "@/lib/types";
import type { FotoContextoPersonaje, FotoPersonaje, Personaje, Proyecto, TipoFotoPersonaje } from "@/lib/types";

const LARGO_RESUMEN = 90;

function resumenPersonaje(p: Personaje): string {
  const primero = [p.personalidad, p.fisica, p.vestuario, p.vozDescrita].find((v) => v.trim().length > 0);
  return extraerFragmento(primero ?? "", LARGO_RESUMEN);
}

type PersonajeGlobal = Personaje & { proyectoNombre: string };

/**
 * Lista global de Personajes: los de proyecto se ven y se editan como
 * siempre (Editar navega a la Identidad de su proyecto — no hay formulario
 * acá para no duplicarlo). Los del estudio (`proyectoId: null`) no tienen
 * proyecto al que navegar, así que Editar/Eliminar se resuelven aquí
 * mismo, reutilizando el mismo `PersonajeForm` de Identidad.
 */
export function PersonajesGlobalLista({
  personajes,
  proyectos,
  onCreate,
  onUpdate,
  onDelete,
  onSubirFoto,
  onEliminarFoto,
  onSubirTemporal,
  onEliminarTemporal,
  onSubirFotoContexto,
  onEditarEtiquetaFotoContexto,
  onEliminarFotoContexto,
}: {
  personajes: PersonajeGlobal[];
  proyectos: Proyecto[];
  onCreate: (proyectoId: string | null, formData: FormData) => Promise<{ id: string }>;
  onUpdate: (personajeId: string, formData: FormData) => Promise<void>;
  onDelete: (personajeId: string) => Promise<void>;
  onSubirFoto: (personajeId: string, tipo: TipoFotoPersonaje, formData: FormData) => Promise<FotoPersonaje[]>;
  onEliminarFoto: (personajeId: string, url: string) => Promise<FotoPersonaje[]>;
  onSubirTemporal: (formData: FormData) => Promise<string>;
  onEliminarTemporal: (url: string) => Promise<void>;
  onSubirFotoContexto: (personajeId: string, formData: FormData) => Promise<FotoContextoPersonaje[]>;
  onEditarEtiquetaFotoContexto: (personajeId: string, url: string, etiqueta: string) => Promise<FotoContextoPersonaje[]>;
  onEliminarFotoContexto: (personajeId: string, url: string) => Promise<FotoContextoPersonaje[]>;
}) {
  const [abierto, setAbierto] = useState<"nuevo" | string | null>(null);
  const [destino, setDestino] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          onClick={() => {
            setDestino("");
            setAbierto(abierto === "nuevo" ? null : "nuevo");
          }}
        >
          + Nuevo personaje
        </Button>
      </div>

      {abierto === "nuevo" ? (
        <div className="mb-4">
          <Card className="mb-3 border border-accent/30 bg-accent-soft/20">
            <label className="mb-1 block text-[12.5px] text-text-muted">¿Dónde vive este personaje?</label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text"
            >
              <option value="">Personaje del estudio (usable en cualquier proyecto)</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Card>
          <PersonajeForm
            key="nuevo"
            titulo="Nuevo personaje"
            personaje={null}
            onSubmit={async (fd) => {
              await onCreate(destino || null, fd);
              setAbierto(null);
            }}
            onCancelar={() => setAbierto(null)}
            onSubirFoto={(_tipo, fd) => onSubirTemporal(fd)}
            onEliminarFoto={(_tipo, url) => onEliminarTemporal(url)}
          />
        </div>
      ) : null}

      {personajes.length === 0 && abierto !== "nuevo" ? (
        <Empty title="Todavía no hay personajes">
          Crea el primero arriba, o desde la Identidad de un proyecto — ambos aparecen aquí.
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personajes.map((p) => {
            const esDelEstudio = p.proyectoId === null;

            if (abierto === p.id) {
              return (
                <div key={p.id} className="sm:col-span-2">
                  <PersonajeForm
                    titulo={p.nombre || "Editar personaje"}
                    personaje={p}
                    onSubmit={async (fd) => {
                      await onUpdate(p.id, fd);
                      setAbierto(null);
                    }}
                    onCancelar={() => setAbierto(null)}
                    onSubirFoto={async (tipo, fd) => {
                      const nuevas = await onSubirFoto(p.id, tipo, fd);
                      return nuevas.find((f) => f.tipo === tipo)?.url ?? "";
                    }}
                    onEliminarFoto={async (_tipo, url) => {
                      await onEliminarFoto(p.id, url);
                    }}
                    onSubirFotoContexto={(fd) => onSubirFotoContexto(p.id, fd)}
                    onEditarEtiquetaFotoContexto={(url, etiqueta) =>
                      onEditarEtiquetaFotoContexto(p.id, url, etiqueta)
                    }
                    onEliminarFotoContexto={(url) => onEliminarFotoContexto(p.id, url)}
                  />
                </div>
              );
            }

            const foto = fotoPrincipal(parseFotosPersonaje(p.fotosUrlsJson));
            const resumen = resumenPersonaje(p);

            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Chip>{esDelEstudio ? "Estudio" : p.proyectoNombre}</Chip>
                    <div className="mt-1.5 font-display text-[16px]">
                      {p.nombre || "Personaje sin nombre"}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {esDelEstudio ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-2.5 py-1 text-[12.5px]"
                          onClick={() => setAbierto(p.id)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="px-2.5 py-1 text-[12.5px]"
                          onClick={() => setConfirmEliminar(p.id)}
                        >
                          Eliminar
                        </Button>
                      </>
                    ) : (
                      <Link
                        href={`/proyectos/${p.proyectoId}/identidad`}
                        className="inline-flex items-center justify-center rounded-xl border border-border bg-transparent px-2.5 py-1 text-[12.5px] text-text transition-opacity hover:bg-surface-2"
                      >
                        Editar
                      </Link>
                    )}
                  </div>
                </div>
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlImagenVisible(foto)}
                    alt={p.nombre || "Personaje"}
                    className="mt-2 h-32 w-full rounded-lg object-cover"
                  />
                ) : null}
                {resumen ? <p className="mt-2 text-[13px] text-text-muted">{resumen}</p> : null}
                <RelacionadoPanel onCargar={() => getRelacionesPersonaje(p.id)} />
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmEliminar !== null}
        onOpenChange={(open) => !open && setConfirmEliminar(null)}
        title="¿Eliminar este personaje?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => confirmEliminar && onDelete(confirmEliminar)}
      />
    </div>
  );
}
