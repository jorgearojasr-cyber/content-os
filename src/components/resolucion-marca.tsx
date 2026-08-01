"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { explicarError } from "@/lib/errores";
import type { EntidadBiblioteca } from "@/lib/actions";

/**
 * Paso de resolución de Marca — mismo criterio que Personaje/Locación/Plano
 * (`SelectorResolucion` en `blueprint-import-shared.tsx`): si el nombre
 * declarado coincide exacto con un solo Proyecto existente, se resuelve
 * solo ANTES de llegar acá (ver `AnalisisProyectoBlueprint.proyectoResuelto`
 * en el caller); si no coincide con ninguno o coincide con más de uno, este
 * paso deja elegir — vincular a un Proyecto existente o crear uno nuevo —
 * nunca una sustitución automática a otra Marca.
 *
 * Extraído de `ImportarBlueprintGlobalModal` (UX Migration 1) para que sea
 * invocable tanto desde el camino de guion pegado (`nombreDeclarado` viene
 * del CBD) como desde el de idea cruda sin Marca todavía (`nombreDeclarado`
 * vacío) — mismo componente, mismo estado propio, dos callers distintos.
 */
export function ResolucionMarca({
  nombreDeclarado,
  proyectosDisponibles,
  onCrearProyecto,
  onResuelto,
}: {
  nombreDeclarado: string;
  proyectosDisponibles: EntidadBiblioteca[];
  onCrearProyecto: (nombre: string) => Promise<{ proyectoId: string }>;
  onResuelto: (proyectoId: string, nombre: string) => void;
}) {
  const [nombreNuevo, setNombreNuevo] = useState(nombreDeclarado);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  async function handleCrear() {
    if (!nombreNuevo.trim()) return;
    setCreando(true);
    setError("");
    try {
      const { proyectoId } = await onCrearProyecto(nombreNuevo);
      onResuelto(proyectoId, nombreNuevo.trim());
    } catch (e) {
      setError(explicarError(e));
      setCreando(false);
    }
  }

  return (
    <div className="rounded-lg border border-danger/40 bg-danger/5 p-3">
      <p className="text-[12.5px] font-medium text-danger">
        {nombreDeclarado
          ? `“${nombreDeclarado}” no coincide con ningún Proyecto existente — elegí qué hacer.`
          : "Todavía no elegiste a qué Marca pertenece esto — elegí a cuál."}
      </p>

      {proyectosDisponibles.length > 0 ? (
        <>
          <label className="mt-3 block text-[12px] text-text-muted">Vincular a un Proyecto existente</label>
          <select
            value=""
            onChange={(e) => {
              const p = proyectosDisponibles.find((x) => x.id === e.target.value);
              if (p) onResuelto(p.id, p.nombre);
            }}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[12.5px] text-text"
          >
            <option value="">— Elegí un Proyecto —</option>
            {proyectosDisponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </>
      ) : null}

      <label className="mt-3 block text-[12px] text-text-muted">O crear un Proyecto nuevo</label>
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre del Proyecto"
          className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[12.5px] text-text"
        />
        <Button type="button" onClick={handleCrear} disabled={creando || !nombreNuevo.trim()}>
          {creando ? "Creando…" : "Crear y continuar"}
        </Button>
      </div>

      {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
    </div>
  );
}
