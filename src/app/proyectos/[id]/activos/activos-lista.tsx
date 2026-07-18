"use client";

import { useState } from "react";
import { Button, Card, Chip } from "@/components/ui";
import { ConfirmDialog, PromptDialog } from "@/components/confirm-dialog";
import { urlImagenVisible } from "@/lib/imagen-url";
import { TIPOS_ACTIVO } from "@/lib/types";
import type { Activo } from "@/lib/types";

const TIPOS_CON_PREVIEW = new Set(["foto", "icono", "recurso_grafico", "logo"]);

function esArchivo(tipo: string) {
  return TIPOS_ACTIVO.find((t) => t.value === tipo)?.archivo ?? false;
}

function etiquetaTipo(tipo: string) {
  return TIPOS_ACTIVO.find((t) => t.value === tipo)?.label ?? tipo;
}

/** Etiquetas separadas por coma -> lista limpia, sin vacías. */
function listaEtiquetas(etiquetas: string): string[] {
  return etiquetas
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/**
 * Lista de "Otros activos" con búsqueda y filtro por tipo — todo en el
 * cliente (la lista completa ya llegó del servidor). La búsqueda matchea
 * nombre, notas y etiquetas, sin distinguir mayúsculas ni requerir orden.
 */
export function ActivosLista({
  activos,
  onDelete,
  onEditarEtiquetas,
}: {
  activos: Activo[];
  onDelete: (activoId: string) => Promise<void>;
  onEditarEtiquetas: (activoId: string, formData: FormData) => Promise<void>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const texto = busqueda.trim().toLowerCase();
  const filtrados = activos.filter((a) => {
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    if (!texto) return true;
    return `${a.nombre} ${a.notas} ${a.etiquetas}`.toLowerCase().includes(texto);
  });

  // Solo los tipos realmente presentes en la lista — un filtro con 12
  // opciones vacías es ruido.
  const tiposPresentes = TIPOS_ACTIVO.filter((t) => activos.some((a) => a.tipo === t.value));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, notas o etiquetas"
          className="min-w-[220px] flex-1 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text placeholder:text-text-muted/60"
        />
        {tiposPresentes.length > 1 ? (
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
          >
            <option value="">Todos los tipos</option>
            {tiposPresentes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {filtrados.length === 0 ? (
        <p className="text-[13px] text-text-muted">Ningún activo coincide con la búsqueda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtrados.map((activo) => (
            <ActivoCard
              key={activo.id}
              activo={activo}
              onDelete={onDelete}
              onEditarEtiquetas={onEditarEtiquetas}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivoCard({
  activo,
  onDelete,
  onEditarEtiquetas,
}: {
  activo: Activo;
  onDelete: (activoId: string) => Promise<void>;
  onEditarEtiquetas: (activoId: string, formData: FormData) => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editandoEtiquetas, setEditandoEtiquetas] = useState(false);
  const etiquetas = listaEtiquetas(activo.etiquetas);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Chip>{etiquetaTipo(activo.tipo)}</Chip>
          <div className="mt-1.5 font-display text-[15px]">{activo.nombre}</div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            variant="secondary"
            className="px-2.5 py-1 text-[12.5px]"
            onClick={() => setEditandoEtiquetas(true)}
          >
            Etiquetas
          </Button>
          <Button
            variant="danger"
            className="px-2.5 py-1 text-[12.5px]"
            onClick={() => setConfirmOpen(true)}
          >
            Eliminar
          </Button>
        </div>
      </div>

      {esArchivo(activo.tipo) ? (
        TIPOS_CON_PREVIEW.has(activo.tipo) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlImagenVisible(activo.valor)}
            alt={activo.nombre}
            className="mt-2 h-28 w-full rounded-lg object-cover"
          />
        ) : (
          <a
            href={urlImagenVisible(activo.valor)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-[13px] text-accent underline"
          >
            Ver archivo
          </a>
        )
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-text">{activo.valor}</p>
      )}

      {activo.notas ? <p className="mt-2 text-[12.5px] text-text-muted">{activo.notas}</p> : null}

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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar este activo?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => onDelete(activo.id)}
      />
      <PromptDialog
        open={editandoEtiquetas}
        onOpenChange={setEditandoEtiquetas}
        title="Etiquetas (separadas por coma)"
        defaultValue={activo.etiquetas}
        placeholder="Ej: exterior, piscina, día"
        onSubmit={(valor) => {
          const fd = new FormData();
          fd.set("etiquetas", valor);
          onEditarEtiquetas(activo.id, fd);
        }}
      />
    </Card>
  );
}
