"use client";

import { useState } from "react";
import { getRelacionesPersonaje } from "@/lib/actions";
import { Button, Card, Empty, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RelacionadoPanel } from "@/components/relacionado-panel";
import { PersonajeForm } from "@/app/proyectos/[id]/identidad/personajes-lista";
import { explicarError } from "@/lib/errores";
import { extraerFragmento } from "@/lib/reutilizacion";
import { urlImagenVisible } from "@/lib/imagen-url";
import { fotoPrincipal, parseFotosPersonaje } from "@/lib/types";
import type { FotoContextoPersonaje, FotoPersonaje, Personaje, TipoFotoPersonaje } from "@/lib/types";
import type { PersonajeSugerido } from "@/lib/ai";

const LARGO_RESUMEN = 90;

function resumenPersonaje(p: Personaje): string {
  const primero = [p.personalidad, p.fisica, p.vestuario, p.vozDescrita].find((v) => v.trim().length > 0);
  return extraerFragmento(primero ?? "", LARGO_RESUMEN);
}

function setCampoEstilo(id: string, valor: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = valor;
}

/**
 * Lista global de Personajes (PERSONAJES-1-PASADA-1: ya no hay Personajes
 * de Proyecto — todos viven acá, la única pantalla que los administra).
 */
export function PersonajesGlobalLista({
  personajes,
  onCreate,
  onUpdate,
  onDelete,
  onSubirFoto,
  onEliminarFoto,
  onSubirTemporal,
  onEliminarTemporal,
  onGenerarPersonaje,
  onSubirFotoContexto,
  onEditarEtiquetaFotoContexto,
  onEliminarFotoContexto,
}: {
  personajes: Personaje[];
  onCreate: (formData: FormData) => Promise<{ id: string }>;
  onUpdate: (personajeId: string, formData: FormData) => Promise<void>;
  onDelete: (personajeId: string) => Promise<void>;
  onSubirFoto: (personajeId: string, tipo: TipoFotoPersonaje, formData: FormData) => Promise<FotoPersonaje[]>;
  onEliminarFoto: (personajeId: string, url: string) => Promise<FotoPersonaje[]>;
  onSubirTemporal: (formData: FormData) => Promise<string>;
  onEliminarTemporal: (url: string) => Promise<void>;
  onGenerarPersonaje: (
    descripcion: string,
    contexto?: Partial<PersonajeSugerido>,
  ) => Promise<PersonajeSugerido>;
  onSubirFotoContexto: (personajeId: string, formData: FormData) => Promise<FotoContextoPersonaje[]>;
  onEditarEtiquetaFotoContexto: (personajeId: string, url: string, etiqueta: string) => Promise<FotoContextoPersonaje[]>;
  onEliminarFotoContexto: (personajeId: string, url: string) => Promise<FotoContextoPersonaje[]>;
}) {
  const [abierto, setAbierto] = useState<"nuevo" | string | null>(null);
  const [modoIA, setModoIA] = useState(false);
  const [descripcionIA, setDescripcionIA] = useState("");
  const [generando, setGenerando] = useState(false);
  const [errorIA, setErrorIA] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null);

  async function generarYAbrir() {
    setGenerando(true);
    setErrorIA("");
    try {
      const sugerido = await onGenerarPersonaje(descripcionIA);
      const fd = new FormData();
      fd.set("nombre", "");
      fd.set("personalidad", sugerido.personajePersonalidad);
      fd.set("fisica", sugerido.fisica);
      fd.set("vestuario", sugerido.vestuario);
      fd.set("vozDescrita", sugerido.vozDescrita);
      fd.set("gestos", sugerido.gestos);
      fd.set("muletillas", sugerido.muletillas);
      const { id } = await onCreate(fd);
      // look/cámara son campos de Estilo (viven en identidades, no en el
      // Personaje) — se sugieren igual, como subproducto de describirlo.
      setCampoEstilo("look", sugerido.look);
      setCampoEstilo("camara", sugerido.camara);
      setModoIA(false);
      setDescripcionIA("");
      setAbierto(id);
    } catch (e) {
      setErrorIA(explicarError(e));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setModoIA((v) => !v)}
        >
          ✨ Generar con IA
        </Button>
        <Button
          type="button"
          onClick={() => setAbierto(abierto === "nuevo" ? null : "nuevo")}
        >
          + Nuevo personaje
        </Button>
      </div>

      {modoIA ? (
        <div className="mb-4 rounded-xl border border-border bg-surface-2 p-3.5">
          <Textarea
            value={descripcionIA}
            onChange={(e) => setDescripcionIA(e.target.value)}
            placeholder="Ej: Quiero un maestro chileno de aproximadamente 58 años, cercano, con mucha experiencia y que enseñe de forma sencilla."
          />
          {errorIA ? <p className="mt-2 text-[12.5px] text-danger">{errorIA}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModoIA(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={generando || !descripcionIA.trim()} onClick={generarYAbrir}>
              {generando ? "Generando…" : "Generar"}
            </Button>
          </div>
        </div>
      ) : null}

      {abierto === "nuevo" ? (
        <div className="mb-4">
          <PersonajeForm
            key="nuevo"
            titulo="Nuevo personaje"
            personaje={null}
            onSubmit={async (fd) => {
              await onCreate(fd);
              setAbierto(null);
            }}
            onCancelar={() => setAbierto(null)}
            onSubirFoto={(_tipo, fd) => onSubirTemporal(fd)}
            onEliminarFoto={(_tipo, url) => onEliminarTemporal(url)}
          />
        </div>
      ) : null}

      {personajes.length === 0 && abierto !== "nuevo" ? (
        <Empty title="Todavía no hay personajes">Crea el primero arriba.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personajes.map((p) => {
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
                  <div className="font-display text-[16px]">{p.nombre || "Personaje sin nombre"}</div>
                  <div className="flex shrink-0 gap-1.5">
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
