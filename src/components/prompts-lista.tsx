"use client";

import { useRef, useState } from "react";
import { Button, Card, Empty, Input, Label, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { explicarError } from "@/lib/errores";
import { CATEGORIAS_PROMPT, ESTADOS_PROMPT, type PromptGuardado } from "@/lib/types";

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

function etiquetaEstado(estado: string): string {
  return ESTADOS_PROMPT.find((e) => e.value === estado)?.label ?? estado;
}

function listaEtiquetas(etiquetas: string): string[] {
  return etiquetas
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

const DURACION_CONFIRMACION_MS = 2000;

/** Personajes disponibles para asociar (id + nombre alcanza — la ficha
 * completa no se necesita acá). */
export type PersonajeAsociable = { id: string; nombre: string };

/** Marcas disponibles para el selector de Alcance — MIGRATION-4B: pantalla
 * única, el alcance (Global o de una Marca) lo elige el usuario al crear o
 * editar, no la pantalla desde la que entra. */
export type MarcaAsociable = { id: string; nombre: string };

type PromptConMarca = PromptGuardado & { proyectoNombre?: string };

type Props = {
  prompts: PromptConMarca[];
  marcas: MarcaAsociable[];
  /** Si se entra desde una Marca (ej. `/prompts?proyecto=<id>`), preselecciona
   * esa Marca tanto en el filtro de la lista como en el formulario de
   * creación — el usuario puede cambiarla igual. */
  marcaIdPreseleccionada?: string | null;
  personajes: PersonajeAsociable[];
  onCreate: (formData: FormData) => Promise<{ id: string }>;
  onUpdate: (promptId: string, formData: FormData) => Promise<void>;
  onDelete: (promptId: string) => Promise<void>;
};

export function PromptsLista({
  prompts,
  marcas,
  marcaIdPreseleccionada = null,
  personajes,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [filtro, setFiltro] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroAlcance, setFiltroAlcance] = useState(marcaIdPreseleccionada ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);

  const texto = busqueda.trim().toLowerCase();
  const promptsFiltrados = prompts.filter((p) => {
    if (filtro && p.categoria !== filtro) return false;
    if (filtroEstado && p.estado !== filtroEstado) return false;
    if (filtroAlcance === "global" && p.proyectoId !== null) return false;
    if (filtroAlcance && filtroAlcance !== "global" && p.proyectoId !== filtroAlcance) return false;
    if (texto && !`${p.titulo} ${p.texto} ${p.etiquetas}`.toLowerCase().includes(texto)) return false;
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
            placeholder="Buscar por título, texto o etiquetas"
            className="min-w-[200px] rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text placeholder:text-text-muted/60"
          />
          <select
            value={filtroAlcance}
            onChange={(e) => setFiltroAlcance(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
          >
            <option value="">Todas las marcas</option>
            <option value="global">🌍 Todo el estudio</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>
                🪪 {m.nombre}
              </option>
            ))}
          </select>
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
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_PROMPT.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={() => setCreando((v) => !v)} className="px-4 py-2.5 text-[13.5px]">
          {creando ? "Cancelar" : "+ Nuevo prompt"}
        </Button>
      </div>

      {creando ? (
        <Card>
          <PromptForm
            personajes={personajes}
            marcas={marcas}
            defaultValues={{ proyectoId: marcaIdPreseleccionada ?? "" }}
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
            : "Prueba con otra marca, categoría, estado o búsqueda."}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {promptsFiltrados.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              marcas={marcas}
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

function PromptForm({
  onSubmit,
  submitLabel,
  personajes,
  marcas,
  defaultValues,
}: {
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel: string;
  personajes: PersonajeAsociable[];
  marcas: MarcaAsociable[];
  defaultValues?: {
    titulo?: string;
    categoria?: string;
    texto?: string;
    etiquetas?: string;
    estado?: string;
    personajeId?: string | null;
    /** "" = Global, id = una Marca — default de la pestaña Alcance. */
    proyectoId?: string;
  };
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

      <Label htmlFor="etiquetas">Etiquetas (opcional, separadas por coma)</Label>
      <Input
        id="etiquetas"
        name="etiquetas"
        defaultValue={defaultValues?.etiquetas}
        placeholder="Ej: fachada, exterior, producto"
      />

      {personajes.length > 0 ? (
        <>
          <Label htmlFor="personajeId">Personaje asociado (opcional)</Label>
          <select
            id="personajeId"
            name="personajeId"
            defaultValue={defaultValues?.personajeId ?? ""}
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

      <Label htmlFor="proyectoId">Alcance</Label>
      <select
        id="proyectoId"
        name="proyectoId"
        defaultValue={defaultValues?.proyectoId ?? ""}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        <option value="">🌍 Todo el estudio</option>
        {marcas.map((m) => (
          <option key={m.id} value={m.id}>
            🪪 {m.nombre}
          </option>
        ))}
      </select>

      <Label htmlFor="estado">Estado</Label>
      <select
        id="estado"
        name="estado"
        defaultValue={defaultValues?.estado ?? "activo"}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        {ESTADOS_PROMPT.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>

      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}

      <Button type="submit" disabled={guardando} className="mt-4">
        {guardando ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

function PromptCard({
  prompt,
  marcas,
  personajes,
  onUpdate,
  onDelete,
}: {
  prompt: PromptConMarca;
  marcas: MarcaAsociable[];
  personajes: PersonajeAsociable[];
  onUpdate: (promptId: string, formData: FormData) => Promise<void>;
  onDelete: (promptId: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const esGlobal = prompt.proyectoId === null;
  const personajeAsociado = prompt.personajeId
    ? personajes.find((p) => p.id === prompt.personajeId)
    : null;
  const etiquetas = listaEtiquetas(prompt.etiquetas);

  if (editando) {
    return (
      <Card>
        <PromptForm
          submitLabel="Guardar cambios"
          personajes={personajes}
          marcas={marcas}
          defaultValues={{
            titulo: prompt.titulo,
            categoria: prompt.categoria,
            texto: prompt.texto,
            etiquetas: prompt.etiquetas,
            estado: prompt.estado,
            personajeId: prompt.personajeId,
            proyectoId: prompt.proyectoId ?? "",
          }}
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
        {esGlobal ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
            🌍 Global
          </span>
        ) : (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
            🪪 {prompt.proyectoNombre || "Marca"}
          </span>
        )}
        {prompt.estado !== "activo" ? (
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10.5px] text-text-muted">
            {etiquetaEstado(prompt.estado)}
          </span>
        ) : null}
        <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-text-muted">
          v{prompt.version}
        </span>
      </div>
      <div className="mt-1.5 font-display text-[15px]">{prompt.titulo}</div>
      {personajeAsociado ? (
        <p className="mt-0.5 text-[12px] text-text-muted">👤 {personajeAsociado.nombre}</p>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-text">{prompt.texto}</p>

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
