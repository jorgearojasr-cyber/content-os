"use client";

import { useRef, useState } from "react";
import { Button, Card, Empty, Input, Label, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { explicarError } from "@/lib/errores";
import { formatearFechaChile } from "@/lib/fecha";
import { CATEGORIAS_MOTOR, ESTADOS_MOTOR, VARIABLES_MOTOR, type MotorIA } from "@/lib/types";

type Props = {
  motores: MotorIA[];
  /** true solo en la pestaña "Motores" de un proyecto. */
  mostrarChipGlobal: boolean;
  onCreate: (formData: FormData) => Promise<{ id: string }>;
  onUpdate: (motorId: string, formData: FormData) => Promise<{ id: string; copiaCreada: boolean }>;
  onDuplicar: (motorId: string) => Promise<{ id: string }>;
  onDelete: (motorId: string) => Promise<void>;
};

export function MotoresLista({ motores, mostrarChipGlobal, onCreate, onUpdate, onDuplicar, onDelete }: Props) {
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<"usados" | "recientes">("usados");
  const [creando, setCreando] = useState(false);

  const texto = busqueda.trim().toLowerCase();
  const filtrados = motores
    .filter((m) => {
      if (filtroCategoria && m.categoria !== filtroCategoria) return false;
      if (filtroEstado && m.estado !== filtroEstado) return false;
      if (filtroOrigen && m.origen !== filtroOrigen) return false;
      if (texto && !`${m.nombre} ${m.descripcion} ${m.palabrasClave}`.toLowerCase().includes(texto)) return false;
      return true;
    })
    .sort((a, b) =>
      orden === "usados" ? b.vecesUsado - a.vecesUsado : (a.createdAt < b.createdAt ? 1 : -1),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, descripción o palabras clave"
            className="min-w-[200px] rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text placeholder:text-text-muted/60"
          />
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS_MOTOR.map((c) => (
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
            {ESTADOS_MOTOR.map((e) => (
              <option key={e} value={e}>
                {e === "activo" ? "Activo" : "Archivado"}
              </option>
            ))}
          </select>
          <select
            value={filtroOrigen}
            onChange={(e) => setFiltroOrigen(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
          >
            <option value="">Sistema y usuario</option>
            <option value="sistema">Solo de Sistema</option>
            <option value="usuario">Solo personalizados</option>
          </select>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as "usados" | "recientes")}
            className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
          >
            <option value="usados">Más usados</option>
            <option value="recientes">Más recientes</option>
          </select>
        </div>
        <Button type="button" onClick={() => setCreando((v) => !v)} className="px-4 py-2.5 text-[13.5px]">
          {creando ? "Cancelar" : "+ Nuevo Motor"}
        </Button>
      </div>

      {creando ? (
        <Card>
          <p className="mb-1 font-display text-[15px]">Nuevo Motor</p>
          <p className="mb-3 text-[12.5px] text-text-muted">
            Solo lo esencial para arrancar — el resto (palabras clave, plantilla, estructura…) se
            edita después.
          </p>
          <MotorFormBase
            onSubmit={async (formData) => {
              await onCreate(formData);
              setCreando(false);
            }}
          />
        </Card>
      ) : null}

      {filtrados.length === 0 ? (
        <Empty title="No hay Motores para este filtro">
          {motores.length === 0 ? "Todavía no hay Motores IA disponibles." : "Prueba con otro filtro o búsqueda."}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtrados.map((m) => (
            <MotorCard
              key={m.id}
              motor={m}
              mostrarChipGlobal={mostrarChipGlobal}
              onUpdate={onUpdate}
              onDuplicar={onDuplicar}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** El formulario mínimo de "Crear Motor Nuevo" — Nombre/Objetivo/
 * Descripción/Categoría, el "Motor Base". */
function MotorFormBase({ onSubmit }: { onSubmit: (formData: FormData) => Promise<void> }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

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
      <Label htmlFor="nombre">Nombre</Label>
      <Input id="nombre" name="nombre" placeholder="Ej: Retos y desafíos" required />

      <Label htmlFor="objetivo">Objetivo</Label>
      <Input id="objetivo" name="objetivo" placeholder="Ej: invitar a la audiencia a intentar algo" />

      <Label htmlFor="descripcion">Descripción</Label>
      <Textarea id="descripcion" name="descripcion" placeholder="En una o dos frases, de qué se trata esta estrategia" />

      <Label htmlFor="categoria">Categoría</Label>
      <select
        id="categoria"
        name="categoria"
        defaultValue={CATEGORIAS_MOTOR[0]}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        {CATEGORIAS_MOTOR.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}
      <Button type="submit" disabled={guardando} className="mt-4">
        {guardando ? "Guardando…" : "Crear Motor"}
      </Button>
    </form>
  );
}

/** Formulario completo (todos los campos editables) — usado tanto para
 * Motores de usuario como para el intento de editar uno de Sistema (que
 * dispara el copy-on-edit del lado del servidor). */
function MotorFormCompleto({
  motor,
  onSubmit,
}: {
  motor: MotorIA;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      action={async (formData) => {
        setGuardando(true);
        setError("");
        try {
          await onSubmit(formData);
        } catch (e) {
          setError(explicarError(e));
        } finally {
          setGuardando(false);
        }
      }}
    >
      <Label htmlFor="nombre">Nombre</Label>
      <Input id="nombre" name="nombre" defaultValue={motor.nombre} required />

      <Label htmlFor="descripcion">Descripción</Label>
      <Textarea id="descripcion" name="descripcion" defaultValue={motor.descripcion} />

      <Label htmlFor="objetivo">Objetivo</Label>
      <Input id="objetivo" name="objetivo" defaultValue={motor.objetivo} />

      <Label htmlFor="cuandoUsar">Cuándo usar</Label>
      <Textarea id="cuandoUsar" name="cuandoUsar" defaultValue={motor.cuandoUsar} />

      <Label htmlFor="cuandoNoUsar">Cuándo NO usar</Label>
      <Textarea id="cuandoNoUsar" name="cuandoNoUsar" defaultValue={motor.cuandoNoUsar} />

      <Label htmlFor="categoria">Categoría</Label>
      <select
        id="categoria"
        name="categoria"
        defaultValue={motor.categoria}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        {CATEGORIAS_MOTOR.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <Label htmlFor="tipoContenidoRecomendado">Tipo de contenido recomendado</Label>
      <Input
        id="tipoContenidoRecomendado"
        name="tipoContenidoRecomendado"
        defaultValue={motor.tipoContenidoRecomendado}
        placeholder="Ej: Video Corto, Carrusel"
      />

      <Label htmlFor="palabrasClave">Palabras clave (separadas por coma — detección en Crear)</Label>
      <Input id="palabrasClave" name="palabrasClave" defaultValue={motor.palabrasClave} />

      <Label htmlFor="prioridad">Prioridad (1 a 5 — desempata sugerencias)</Label>
      <select
        id="prioridad"
        name="prioridad"
        defaultValue={String(motor.prioridad)}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <Label htmlFor="estructuraNarrativa">Estructura narrativa</Label>
      <Textarea id="estructuraNarrativa" name="estructuraNarrativa" defaultValue={motor.estructuraNarrativa} />

      <Label htmlFor="promptMaestro">
        Prompt maestro (plantilla — usa {"{{"}VARIABLES{"}}"})
      </Label>
      <Textarea id="promptMaestro" name="promptMaestro" defaultValue={motor.promptMaestro} className="min-h-[120px]" />
      <p className="mt-1 text-[11.5px] text-text-muted">
        Variables disponibles: {VARIABLES_MOTOR.map((v) => `{{${v}}}`).join(" ")}
      </p>

      <Label htmlFor="variablesUtilizadas">Variables que usa (informativo, separadas por coma)</Label>
      <Input id="variablesUtilizadas" name="variablesUtilizadas" defaultValue={motor.variablesUtilizadas} />

      <Label htmlFor="ejemplo">Ejemplo</Label>
      <Textarea id="ejemplo" name="ejemplo" defaultValue={motor.ejemplo} />

      <Label htmlFor="notasInternas">Notas internas</Label>
      <Textarea id="notasInternas" name="notasInternas" defaultValue={motor.notasInternas} />

      <Label htmlFor="estado">Estado</Label>
      <select
        id="estado"
        name="estado"
        defaultValue={motor.estado}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        {ESTADOS_MOTOR.map((e) => (
          <option key={e} value={e}>
            {e === "activo" ? "Activo" : "Archivado"}
          </option>
        ))}
      </select>

      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}
      <Button type="submit" disabled={guardando} className="mt-4">
        {guardando ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

function MotorCard({
  motor,
  mostrarChipGlobal,
  onUpdate,
  onDuplicar,
  onDelete,
}: {
  motor: MotorIA;
  mostrarChipGlobal: boolean;
  onUpdate: (motorId: string, formData: FormData) => Promise<{ id: string; copiaCreada: boolean }>;
  onDuplicar: (motorId: string) => Promise<{ id: string }>;
  onDelete: (motorId: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [avisoCopia, setAvisoCopia] = useState(false);
  const esSistema = motor.origen === "sistema";
  const esGlobal = motor.proyectoId === null;

  if (avisoCopia) {
    return (
      <Card className="border border-accent/30 bg-accent-soft/20">
        <p className="text-[13.5px] text-text">
          ✓ Se creó una copia editable de <strong>{motor.nombre}</strong> — el Motor de Sistema
          original queda intacto, sin cambios.
        </p>
        <Button type="button" variant="secondary" className="mt-2 px-2.5 py-1 text-[12.5px]" onClick={() => setAvisoCopia(false)}>
          Entendido
        </Button>
      </Card>
    );
  }

  if (editando) {
    return (
      <Card>
        <p className="mb-1 font-display text-[15px]">{motor.nombre}</p>
        {esSistema ? (
          <p className="mb-3 text-[12px] text-text-muted">
            Este es un Motor de Sistema — guardar cambios crea una copia editable, el original no
            se toca.
          </p>
        ) : null}
        <MotorFormCompleto
          motor={motor}
          onSubmit={async (formData) => {
            const r = await onUpdate(motor.id, formData);
            setEditando(false);
            if (r.copiaCreada) setAvisoCopia(true);
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
          {motor.categoria || "Sin categoría"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] ${
            esSistema ? "border border-border bg-surface-2 text-text-muted" : "bg-accent-soft text-accent"
          }`}
        >
          {esSistema ? "🔒 Sistema" : "Personalizado"}
        </span>
        {mostrarChipGlobal && esGlobal ? (
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10.5px] text-text-muted">
            Global
          </span>
        ) : null}
        {motor.estado !== "activo" ? (
          <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10.5px] text-text-muted">
            Archivado
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 font-display text-[15px]">{motor.nombre}</div>
      {motor.descripcion ? <p className="mt-1 text-[13px] text-text-muted">{motor.descripcion}</p> : null}

      <p className="mt-2 text-[11.5px] text-text-muted">
        Usado {motor.vecesUsado} {motor.vecesUsado === 1 ? "vez" : "veces"}
        {motor.ultimoUsoAt ? ` · última vez ${formatearFechaChile(motor.ultimoUsoAt)}` : ""}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="px-2.5 py-1 text-[12.5px]" onClick={() => setEditando(true)}>
          Editar
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => onDuplicar(motor.id)}
        >
          Duplicar Motor
        </Button>
        {!esSistema ? (
          <Button
            type="button"
            variant="danger"
            className="px-2.5 py-1 text-[12.5px]"
            onClick={() => setConfirmEliminar(true)}
          >
            Eliminar
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmEliminar}
        onOpenChange={setConfirmEliminar}
        title="¿Eliminar este Motor?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => onDelete(motor.id)}
      />
    </Card>
  );
}
