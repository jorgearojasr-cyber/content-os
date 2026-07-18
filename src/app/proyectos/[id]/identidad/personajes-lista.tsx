"use client";

import { useState } from "react";
import {
  eliminarVersionPersonaje,
  guardarVersionPersonaje,
  restaurarVersionPersonaje,
} from "@/lib/actions";
import { Button, Card, Textarea } from "@/components/ui";
import { BotonGuardar } from "@/components/boton-guardar";
import { ConfirmDialog, PromptDialog } from "@/components/confirm-dialog";
import { FieldWithHelp } from "@/components/field-with-help";
import { FotosPersonaje } from "@/components/fotos-personaje";
import { explicarError } from "@/lib/errores";
import { formatearFechaChile } from "@/lib/fecha";
import { extraerFragmento } from "@/lib/reutilizacion";
import { parseFotosPersonaje, parseVersionesPersonaje } from "@/lib/types";
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

        <p className="mt-5 border-t border-border pt-4 text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          Ficha completa
        </p>
        <FieldWithHelp
          label="Edad"
          name="edad"
          defaultValue={personaje?.edad}
          placeholder="Ej: 58 años"
          multiline={false}
        />
        <FieldWithHelp
          label="Profesión"
          name="profesion"
          defaultValue={personaje?.profesion}
          placeholder="Ej: maestro de construcción con 30 años de experiencia"
          multiline={false}
        />
        <FieldWithHelp
          label="Historia"
          name="historia"
          defaultValue={personaje?.historia}
          tip="De dónde viene y por qué sabe lo que sabe — el trasfondo que lo hace creíble."
          placeholder="Ej: partió como ayudante a los 15 años en obras del sur..."
        />
        <FieldWithHelp
          label="Contexto habitual"
          name="contexto"
          defaultValue={personaje?.contexto}
          tip="Dónde y en qué situación aparece típicamente."
          placeholder="Ej: siempre en obra, rodeado de materiales"
          multiline={false}
        />

        <p className="mt-5 border-t border-border pt-4 text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          Prompts maestros (para IA externa)
        </p>
        <FieldWithHelp
          label="Prompt maestro"
          name="promptMaestro"
          defaultValue={personaje?.promptMaestro}
          tip="La descripción canónica del personaje, lista para pegar en cualquier IA — se incluye en el contexto exportado."
          placeholder="Ej: Eres Don José, maestro chileno de 58 años que explica construcción con ejemplos simples..."
        />
        <FieldWithHelp
          label="Prompt para imagen"
          name="promptImagen"
          defaultValue={personaje?.promptImagen}
          tip="Instrucciones fijas al generar imágenes de este personaje (además de las fotos de referencia)."
          placeholder="Ej: usa las fotos de referencia; luz natural, encuadre a la altura de los ojos"
        />
        <FieldWithHelp
          label="Prompt para video"
          name="promptVideo"
          defaultValue={personaje?.promptVideo}
          tip="Instrucciones fijas al animar/generar video de este personaje."
          placeholder="Ej: movimientos calmados, gesticula con las manos al explicar"
        />
        <FieldWithHelp
          label="Prompt para voz"
          name="promptVoz"
          defaultValue={personaje?.promptVoz}
          tip="Instrucciones fijas para clonar o generar su voz (ElevenLabs u otra)."
          placeholder="Ej: voz grave, pausada, acento chileno marcado"
        />
        <FieldWithHelp
          label="Notas internas"
          name="notas"
          defaultValue={personaje?.notas}
          tip="Apuntes de trabajo — nunca se incluyen en el contexto exportado."
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

      {personaje ? <VersionesPersonaje personaje={personaje} /> : null}
    </Card>
  );
}

/** Versiones guardadas de la ficha (solo para Personajes ya guardados) —
 * snapshots manuales de los campos de texto, restaurables. Vive FUERA del
 * <form> de edición: guardar/restaurar/eliminar versiones son acciones
 * inmediatas contra el servidor, no parte del submit del formulario. */
function VersionesPersonaje({ personaje }: { personaje: Personaje }) {
  const versiones = parseVersionesPersonaje(personaje.versionesJson);
  const [guardandoVersion, setGuardandoVersion] = useState(false);
  const [restaurar, setRestaurar] = useState<number | null>(null);
  const [eliminar, setEliminar] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function correr(accion: () => Promise<void>) {
    setError("");
    try {
      await accion();
    } catch (e) {
      setError(explicarError(e));
    }
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          Versiones guardadas
        </p>
        <Button
          type="button"
          variant="secondary"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => setGuardandoVersion(true)}
        >
          Guardar versión actual
        </Button>
      </div>
      <p className="mt-1 text-[11.5px] text-text-muted">
        Un snapshot de la ficha de texto tal como está guardada ahora (las fotos no se versionan).
        Guarda una versión antes de un cambio grande para poder volver atrás.
      </p>

      {versiones.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5">
          {versiones.map((v, i) => (
            <li
              key={`${v.fecha}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <span className="text-[12.5px] text-text">
                {v.nombre || `Versión ${i + 1}`}
                <span className="ml-1.5 text-[11.5px] text-text-muted">
                  {formatearFechaChile(v.fecha)}
                </span>
              </span>
              <span className="flex gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2.5 py-1 text-[12px]"
                  onClick={() => setRestaurar(i)}
                >
                  Restaurar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="px-2.5 py-1 text-[12px]"
                  onClick={() => setEliminar(i)}
                >
                  Eliminar
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}

      <PromptDialog
        open={guardandoVersion}
        onOpenChange={setGuardandoVersion}
        title="Nombre de esta versión"
        placeholder="Ej: antes del cambio de vestuario"
        onSubmit={(nombre) => correr(() => guardarVersionPersonaje(personaje.id, nombre))}
      />
      <ConfirmDialog
        open={restaurar !== null}
        onOpenChange={(open) => !open && setRestaurar(null)}
        title="¿Restaurar esta versión?"
        description="La ficha de texto vuelve a ese snapshot (las fotos no cambian). La ficha actual se pierde salvo que ya la hayas guardado como versión."
        confirmLabel="Restaurar"
        variant="primary"
        onConfirm={() => restaurar !== null && correr(() => restaurarVersionPersonaje(personaje.id, restaurar))}
      />
      <ConfirmDialog
        open={eliminar !== null}
        onOpenChange={(open) => !open && setEliminar(null)}
        title="¿Eliminar esta versión?"
        description="Solo se borra el snapshot — la ficha actual no cambia."
        confirmLabel="Eliminar"
        onConfirm={() => eliminar !== null && correr(() => eliminarVersionPersonaje(personaje.id, eliminar))}
      />
    </div>
  );
}
