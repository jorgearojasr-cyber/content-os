"use client";

import { useState } from "react";
import { Button, Card, Textarea } from "@/components/ui";
import { BotonGuardar } from "@/components/boton-guardar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FieldWithHelp } from "@/components/field-with-help";
import { FotosPersonaje } from "@/components/fotos-personaje";
import { explicarError } from "@/lib/errores";
import { extraerFragmento } from "@/lib/reutilizacion";
import { parseFotosPersonaje } from "@/lib/types";
import type { FotoPersonaje, Personaje, TipoFotoPersonaje } from "@/lib/types";
import type { PersonajeSugerido } from "@/lib/ai";

const LARGO_RESUMEN = 80;

function resumenPersonaje(p: Personaje): string {
  const primero = [p.personalidad, p.fisica, p.vestuario, p.vozDescrita].find((v) => v.trim().length > 0);
  return extraerFragmento(primero ?? "", LARGO_RESUMEN);
}

function setCampoEstilo(id: string, valor: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = valor;
}

/**
 * Personajes de este proyecto — lista de tarjetas (como Activos): cada una
 * con Editar/Eliminar, más "+ Nuevo personaje" que abre el mismo formulario
 * vacío. Un solo formulario abierto a la vez (nuevo o edición de una
 * tarjeta existente) — nunca sobrescribe: crear o editar son siempre
 * acciones explícitas sobre una fila concreta.
 */
export function PersonajesLista({
  personajes,
  onCreate,
  onUpdate,
  onDelete,
  onSubirFoto,
  onEliminarFoto,
  onSubirTemporal,
  onEliminarTemporal,
  onGenerarPersonaje,
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-text-muted">Quién aparece en el contenido, si aplica.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={() => setModoIA((v) => !v)}
          >
            ✨ Generar con IA
          </Button>
          <Button
            type="button"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={() => setAbierto(abierto === "nuevo" ? null : "nuevo")}
          >
            + Nuevo personaje
          </Button>
        </div>
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
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-[12.5px]"
              onClick={() => setModoIA(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="px-3 py-1.5 text-[12.5px]"
              disabled={generando || !descripcionIA.trim()}
              onClick={generarYAbrir}
            >
              {generando ? "Generando…" : "Generar"}
            </Button>
          </div>
        </div>
      ) : null}

      {abierto === "nuevo" ? (
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
      ) : null}

      {personajes.length === 0 && abierto !== "nuevo" ? (
        <p className="text-[13px] text-text-muted">Todavía no hay personajes en este proyecto.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personajes.map((p) =>
            abierto === p.id ? (
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
                />
              </div>
            ) : (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-[15px]">{p.nombre || "Personaje sin nombre"}</div>
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
                {resumenPersonaje(p) ? (
                  <p className="mt-1.5 text-[13px] text-text-muted">{resumenPersonaje(p)}</p>
                ) : null}
                {parseFotosPersonaje(p.fotosUrlsJson).length > 0 ? (
                  <p className="mt-1.5 text-[12px] text-text-muted">
                    {parseFotosPersonaje(p.fotosUrlsJson).length} foto
                    {parseFotosPersonaje(p.fotosUrlsJson).length === 1 ? "" : "s"} de referencia
                  </p>
                ) : null}
              </Card>
            ),
          )}
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

/** Exportado para reutilizarse tal cual desde la pantalla global
 * /personajes (creación/edición de Personajes del estudio) — no se
 * duplica. */
export function PersonajeForm({
  titulo,
  personaje,
  onSubmit,
  onCancelar,
  onSubirFoto,
  onEliminarFoto,
}: {
  titulo: string;
  personaje: Personaje | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancelar: () => void;
  onSubirFoto: (tipo: TipoFotoPersonaje, formData: FormData) => Promise<string>;
  onEliminarFoto: (tipo: TipoFotoPersonaje, url: string) => Promise<void>;
}) {
  const fotosIniciales = parseFotosPersonaje(personaje?.fotosUrlsJson);

  return (
    <Card className="border border-accent/30 bg-accent-soft/20">
      <p className="mb-3 font-display text-[15px]">{titulo}</p>
      <form action={onSubmit}>
        <FieldWithHelp label="Nombre" name="nombre" defaultValue={personaje?.nombre} multiline={false} />
        <FieldWithHelp
          label="Personalidad"
          name="personalidad"
          defaultValue={personaje?.personalidad}
        />
        <FieldWithHelp label="Descripción física exacta" name="fisica" defaultValue={personaje?.fisica} />
        <FieldWithHelp
          label="Vestuario característico"
          name="vestuario"
          defaultValue={personaje?.vestuario}
        />
        <FieldWithHelp
          label="Voz (descripción)"
          name="vozDescrita"
          defaultValue={personaje?.vozDescrita}
          multiline={false}
        />
        <FieldWithHelp label="Gestos" name="gestos" defaultValue={personaje?.gestos} />
        <FieldWithHelp
          label="Muletillas"
          name="muletillas"
          defaultValue={personaje?.muletillas}
          multiline={false}
        />
        <div className="mt-3.5">
          <label className="mb-1 block text-[12.5px] text-text-muted">Fotos de referencia</label>
          <FotosPersonaje fotosIniciales={fotosIniciales} onSubir={onSubirFoto} onEliminar={onEliminarFoto} />
        </div>
        <div className="mt-4 flex gap-2">
          <BotonGuardar texto={personaje ? "Guardar cambios" : "Crear personaje"} />
          <Button type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
