"use client";

import { useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { urlImagenVisible } from "@/lib/imagen-url";
import type { Activo } from "@/lib/types";

/**
 * Galería de "Fotos de lugares" — Activos de tipo "foto" con etiqueta libre
 * (reutiliza el mismo modelo/CRUD de Activos, sin tabla nueva: `nombre` es
 * la etiqueta, `valor` es la URL). Grid con miniatura + etiqueta debajo;
 * "+ Agregar foto" abre un mini-formulario (etiqueta + archivo) que
 * persiste con `createActivoArchivo` de siempre (tipo="foto" fijo, oculto).
 * Sin límite de cuántas fotos puede tener un proyecto.
 */
export function FotosLugar({
  fotos,
  onSubir,
  onRenombrar,
  onEliminar,
}: {
  fotos: Activo[];
  onSubir: (formData: FormData) => Promise<void>;
  onRenombrar: (activoId: string, formData: FormData) => Promise<void>;
  onEliminar: (activoId: string) => Promise<void>;
}) {
  const [agregando, setAgregando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      {fotos.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((f) => (
            <FotoLugarCard key={f.id} activo={f} onRenombrar={onRenombrar} onEliminar={onEliminar} />
          ))}
        </div>
      ) : null}

      {agregando ? (
        <form
          ref={formRef}
          action={async (fd) => {
            setGuardando(true);
            try {
              await onSubir(fd);
              formRef.current?.reset();
              setAgregando(false);
            } finally {
              setGuardando(false);
            }
          }}
          className="rounded-xl border border-border bg-surface-2 p-3"
        >
          <input type="hidden" name="tipo" value="foto" />
          <label className="mb-1 block text-[12.5px] text-text-muted">Etiqueta</label>
          <Input name="nombre" placeholder="Ej: Piscina, Quincho, Acceso" required />
          <label className="mb-1 mt-2.5 block text-[12.5px] text-text-muted">Foto</label>
          <input
            name="archivo"
            type="file"
            accept="image/*"
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-2.5 file:py-1.5 file:text-accent"
          />
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={guardando} className="px-3 py-2 text-[12.5px]">
              {guardando ? "Guardando…" : "Guardar foto"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2 text-[12.5px]"
              onClick={() => setAgregando(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" className="px-3 py-2 text-[12.5px]" onClick={() => setAgregando(true)}>
          + Agregar foto
        </Button>
      )}
    </div>
  );
}

function FotoLugarCard({
  activo,
  onRenombrar,
  onEliminar,
}: {
  activo: Activo;
  onRenombrar: (activoId: string, formData: FormData) => Promise<void>;
  onEliminar: (activoId: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(activo.nombre);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.set("nombre", nombre.trim());
      await onRenombrar(activo.id, fd);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlImagenVisible(activo.valor)}
          alt={activo.nombre}
          className="h-28 w-full rounded-lg object-cover"
        />
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] leading-none text-white hover:bg-black/80"
          aria-label="Eliminar esta foto"
        >
          ✕
        </button>
      </div>
      {editando ? (
        <div className="mt-1 flex items-center gap-1">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="min-w-0 flex-1 rounded border border-border bg-surface px-1.5 py-1 text-[12px] text-text"
            autoFocus
          />
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="text-[11px] text-accent hover:underline"
          >
            {guardando ? "…" : "OK"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="mt-1 block w-full truncate text-left text-[12.5px] text-text hover:text-accent"
          title="Editar etiqueta"
        >
          {activo.nombre}
        </button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar esta foto?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => onEliminar(activo.id)}
      />
    </div>
  );
}
