"use client";

import { useRef, useState } from "react";
import { Button, Card, Empty, Input, Label, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { explicarError } from "@/lib/errores";
import { formatearFechaChile } from "@/lib/fecha";
import { urlImagenVisible } from "@/lib/imagen-url";
import { TIPOS_DOCUMENTO, type Documento } from "@/lib/types";

const ICONO_TIPO: Record<string, string> = {
  archivo: "📄",
  link: "🔗",
  texto: "📝",
};

function listaEtiquetas(etiquetas: string): string[] {
  return etiquetas
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

export type PersonajeAsociableDoc = { id: string; nombre: string };

/**
 * Biblioteca de Conocimiento — mismo patrón de componente compartido que
 * PromptsLista: la vista global (/conocimiento) y la pestaña Conocimiento
 * de cada proyecto usan ESTE componente, filtrado según contexto.
 */
export function DocumentosLista({
  documentos,
  mostrarChipGlobal,
  personajes,
  onCreate,
  onUpdate,
  onDelete,
}: {
  documentos: Documento[];
  mostrarChipGlobal: boolean;
  personajes: PersonajeAsociableDoc[];
  onCreate: (formData: FormData) => Promise<{ id: string }>;
  onUpdate: (documentoId: string, formData: FormData) => Promise<void>;
  onDelete: (documentoId: string) => Promise<void>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [creando, setCreando] = useState(false);

  const texto = busqueda.trim().toLowerCase();
  const filtrados = documentos.filter((d) => {
    if (filtroTipo && d.tipo !== filtroTipo) return false;
    if (texto && !`${d.titulo} ${d.contenido} ${d.etiquetas}`.toLowerCase().includes(texto)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, contenido o etiquetas"
            className="min-w-[220px] rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text placeholder:text-text-muted/60"
          />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
          >
            <option value="">Todos los tipos</option>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={() => setCreando((v) => !v)} className="px-4 py-2.5 text-[13.5px]">
          {creando ? "Cancelar" : "+ Nuevo documento"}
        </Button>
      </div>

      {creando ? (
        <Card>
          <DocumentoForm
            personajes={personajes}
            submitLabel="Guardar documento"
            onSubmit={async (fd) => {
              await onCreate(fd);
              setCreando(false);
            }}
          />
        </Card>
      ) : null}

      {filtrados.length === 0 ? (
        <Empty title="No hay documentos para este filtro">
          {documentos.length === 0
            ? "Guarda normativas, investigaciones, manuales o resúmenes con \"+ Nuevo documento\"."
            : "Prueba con otro tipo o búsqueda."}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtrados.map((d) => (
            <DocumentoCard
              key={d.id}
              documento={d}
              mostrarChipGlobal={mostrarChipGlobal}
              personajes={personajes}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentoForm({
  onSubmit,
  submitLabel,
  personajes,
  documento,
}: {
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel: string;
  personajes: PersonajeAsociableDoc[];
  /** Presente = edición de metadatos (el tipo y el archivo no cambian). */
  documento?: Documento;
}) {
  const [tipo, setTipo] = useState(documento?.tipo ?? "texto");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const editando = !!documento;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setGuardando(true);
        setError("");
        try {
          await onSubmit(formData);
          formRef.current?.reset();
        } catch (e) {
          setError(explicarError(e));
        } finally {
          setGuardando(false);
        }
      }}
    >
      <Label htmlFor="doc-tipo">Tipo</Label>
      <select
        id="doc-tipo"
        name="tipo"
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        disabled={editando}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text disabled:opacity-60"
      >
        {TIPOS_DOCUMENTO.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <Label htmlFor="doc-titulo">Título</Label>
      <Input
        id="doc-titulo"
        name="titulo"
        defaultValue={documento?.titulo}
        placeholder="Ej: Normativa térmica 2025, Manual de estilo, Estudio de mercado"
        required
      />

      {tipo === "archivo" && !editando ? (
        <>
          <Label htmlFor="doc-archivo">Archivo (PDF, Word, Markdown, TXT…)</Label>
          <input
            id="doc-archivo"
            name="archivo"
            type="file"
            required
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13.5px] text-text file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-2.5 file:py-1.5 file:text-accent"
          />
        </>
      ) : null}

      {tipo === "link" ? (
        <>
          <Label htmlFor="doc-link">Link</Label>
          <Input
            id="doc-link"
            name="link"
            type="url"
            defaultValue={documento?.tipo === "link" ? documento.valor : undefined}
            placeholder="https://…"
            required={!editando}
          />
        </>
      ) : null}

      <Label htmlFor="doc-contenido">
        {tipo === "texto" ? "Contenido" : "Resumen / de qué trata (opcional, ayuda a encontrarlo)"}
      </Label>
      <Textarea
        id="doc-contenido"
        name="contenido"
        defaultValue={documento?.contenido}
        placeholder={
          tipo === "texto"
            ? "El texto completo del documento"
            : "Ej: puntos clave del documento, para búsquedas y contexto"
        }
        className="min-h-[100px]"
      />

      <Label htmlFor="doc-etiquetas">Etiquetas (opcional, separadas por coma)</Label>
      <Input
        id="doc-etiquetas"
        name="etiquetas"
        defaultValue={documento?.etiquetas}
        placeholder="Ej: normativa, aislación, techos"
      />

      {personajes.length > 0 ? (
        <>
          <Label htmlFor="doc-personaje">Personaje asociado (opcional)</Label>
          <select
            id="doc-personaje"
            name="personajeId"
            defaultValue={documento?.personajeId ?? ""}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
          >
            <option value="">Ninguno</option>
            {personajes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre || "Personaje sin nombre"}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}

      <Button type="submit" disabled={guardando} className="mt-4">
        {guardando ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

function DocumentoCard({
  documento,
  mostrarChipGlobal,
  personajes,
  onUpdate,
  onDelete,
}: {
  documento: Documento;
  mostrarChipGlobal: boolean;
  personajes: PersonajeAsociableDoc[];
  onUpdate: (documentoId: string, formData: FormData) => Promise<void>;
  onDelete: (documentoId: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const esGlobal = documento.proyectoId === null;
  const personajeAsociado = documento.personajeId
    ? personajes.find((p) => p.id === documento.personajeId)
    : null;
  const etiquetas = listaEtiquetas(documento.etiquetas);

  if (editando) {
    return (
      <Card>
        <DocumentoForm
          personajes={personajes}
          documento={documento}
          submitLabel="Guardar cambios"
          onSubmit={async (fd) => {
            await onUpdate(documento.id, fd);
            setEditando(false);
          }}
        />
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="mt-2 text-[12.5px] text-text-muted hover:text-text"
        >
          Cancelar
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
          {ICONO_TIPO[documento.tipo] ?? "📄"} {documento.tipo}
        </span>
        {mostrarChipGlobal && esGlobal ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
            Global
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 font-display text-[15px]">{documento.titulo}</div>
      <p className="mt-0.5 text-[11.5px] text-text-muted">{formatearFechaChile(documento.createdAt)}</p>
      {personajeAsociado ? (
        <p className="mt-0.5 text-[12px] text-text-muted">👤 {personajeAsociado.nombre}</p>
      ) : null}

      {documento.valor ? (
        <a
          href={documento.tipo === "archivo" ? urlImagenVisible(documento.valor) : documento.valor}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-[13px] text-accent underline"
        >
          {documento.tipo === "archivo" ? "Ver archivo ↗" : "Abrir link ↗"}
        </a>
      ) : null}

      {documento.contenido ? (
        <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-text">{documento.contenido}</p>
      ) : null}

      {etiquetas.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {etiquetas.map((e) => (
            <span
              key={e}
              className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-text-muted"
            >
              {e}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => setEditando(true)}
        >
          Editar
        </Button>
        <Button
          type="button"
          variant="danger"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => setConfirmEliminar(true)}
        >
          Eliminar
        </Button>
      </div>

      <ConfirmDialog
        open={confirmEliminar}
        onOpenChange={setConfirmEliminar}
        title="¿Eliminar este documento?"
        description="Esta acción no se puede deshacer. Si es un archivo subido, también se borra."
        confirmLabel="Eliminar"
        onConfirm={() => onDelete(documento.id)}
      />
    </Card>
  );
}
