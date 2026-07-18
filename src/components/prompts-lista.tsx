"use client";

import { useRef, useState } from "react";
import { Button, Card, Empty, Input, Label, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { explicarError } from "@/lib/errores";
import { CATEGORIAS_PROMPT, type PromptGuardado } from "@/lib/types";

/** Colores fijos por categoría — clases estándar de Tailwind (no hay
 * suficientes tokens semánticos propios de la app para 5 categorías
 * distintas, ver --accent/--success/--danger en globals.css). */
const COLOR_CATEGORIA: Record<string, string> = {
  Logo: "bg-violet-500/15 text-violet-700",
  Personaje: "bg-blue-500/15 text-blue-700",
  Video: "bg-rose-500/15 text-rose-700",
  Imagen: "bg-emerald-500/15 text-emerald-700",
  Otro: "bg-neutral-500/15 text-neutral-700",
};

function ChipCategoria({ categoria }: { categoria: string }) {
  const clases = COLOR_CATEGORIA[categoria] ?? COLOR_CATEGORIA.Otro;
  return (
    <span className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] ${clases}`}>{categoria}</span>
  );
}

const DURACION_CONFIRMACION_MS = 2000;

type Props = {
  prompts: PromptGuardado[];
  /** true solo en la pestaña "Prompts" de un proyecto — la vista global ya
   * sabe que todo lo que ve es global, no necesita el chip. */
  mostrarChipGlobal: boolean;
  onCreate: (formData: FormData) => Promise<{ id: string }>;
  onUpdate: (promptId: string, formData: FormData) => Promise<void>;
  onDelete: (promptId: string) => Promise<void>;
};

export function PromptsLista({ prompts, mostrarChipGlobal, onCreate, onUpdate, onDelete }: Props) {
  const [filtro, setFiltro] = useState("");
  const [creando, setCreando] = useState(false);

  const promptsFiltrados = filtro ? prompts.filter((p) => p.categoria === filtro) : prompts;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_PROMPT.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="button" onClick={() => setCreando((v) => !v)} className="px-4 py-2.5 text-[13.5px]">
          {creando ? "Cancelar" : "+ Nuevo prompt"}
        </Button>
      </div>

      {creando ? (
        <Card>
          <PromptForm
            onSubmit={async (formData) => {
              await onCreate(formData);
              setCreando(false);
            }}
            submitLabel="Guardar prompt"
          />
        </Card>
      ) : null}

      {promptsFiltrados.length === 0 ? (
        <Empty title="No hay prompts para este filtro">
          {prompts.length === 0
            ? "Guarda tu primer prompt de referencia con \"+ Nuevo prompt\"."
            : "Prueba con otra categoría."}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {promptsFiltrados.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              mostrarChipGlobal={mostrarChipGlobal}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PromptForm({
  onSubmit,
  submitLabel,
  defaultValues,
}: {
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel: string;
  defaultValues?: { titulo: string; categoria: string; texto: string };
}) {
  const [guardando, setGuardando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");

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
      <Label htmlFor="titulo">Título</Label>
      <Input
        id="titulo"
        name="titulo"
        defaultValue={defaultValues?.titulo}
        placeholder="Ej: Prompt base para fotos de producto"
        required
      />

      <Label htmlFor="categoria">Categoría</Label>
      <select
        id="categoria"
        name="categoria"
        defaultValue={defaultValues?.categoria ?? CATEGORIAS_PROMPT[0]}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        {CATEGORIAS_PROMPT.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <Label htmlFor="texto">Texto del prompt</Label>
      <Textarea
        id="texto"
        name="texto"
        defaultValue={defaultValues?.texto}
        placeholder="El texto completo que vas a copiar y pegar"
        required
        className="min-h-[120px]"
      />

      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}

      <Button type="submit" disabled={guardando} className="mt-4">
        {guardando ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

function PromptCard({
  prompt,
  mostrarChipGlobal,
  onUpdate,
  onDelete,
}: {
  prompt: PromptGuardado;
  mostrarChipGlobal: boolean;
  onUpdate: (promptId: string, formData: FormData) => Promise<void>;
  onDelete: (promptId: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const esGlobal = prompt.proyectoId === null;

  if (editando) {
    return (
      <Card>
        <PromptForm
          submitLabel="Guardar cambios"
          defaultValues={{ titulo: prompt.titulo, categoria: prompt.categoria, texto: prompt.texto }}
          onSubmit={async (formData) => {
            await onUpdate(prompt.id, formData);
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
        <ChipCategoria categoria={prompt.categoria} />
        {mostrarChipGlobal && esGlobal ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
            Global
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 font-display text-[15px]">{prompt.titulo}</div>
      <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-text">{prompt.texto}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => {
            navigator.clipboard.writeText(prompt.texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), DURACION_CONFIRMACION_MS);
          }}
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </Button>
        <Button type="button" variant="secondary" className="px-2.5 py-1 text-[12.5px]" onClick={() => setEditando(true)}>
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
        title="¿Eliminar este prompt?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => onDelete(prompt.id)}
      />
    </Card>
  );
}
