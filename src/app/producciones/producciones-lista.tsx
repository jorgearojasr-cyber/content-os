"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, Empty, Input, Label } from "@/components/ui";
import { explicarError } from "@/lib/errores";

function formatoDuracion(segundosTotales: number) {
  const m = Math.floor(segundosTotales / 60);
  const s = segundosTotales % 60;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

export type ProduccionGlobal = {
  id: string;
  proyectoId: string;
  proyectoNombre: string;
  titulo: string;
  totalEscenas: number;
  duracionCalculadaSegundos: number;
  terminada: boolean;
};

export type MarcaAsociableProduccion = { id: string; nombre: string };

/**
 * Pantalla única de Producciones (MIGRATION-4C.2) — reemplaza el listado
 * por Marca. El alcance (a qué Marca pertenece) se elige en el formulario
 * de creación, nunca por la ruta desde la que se entra (mismo criterio que
 * Prompts/Documentos en MIGRATION-4B) — `producciones.proyectoId` es
 * NOT NULL, así que a diferencia de esos dos no hay opción "Todo el
 * estudio", el selector de Marca es obligatorio.
 */
export function ProduccionesLista({
  producciones,
  marcas,
  marcaIdPreseleccionada = null,
  onCrear,
}: {
  producciones: ProduccionGlobal[];
  marcas: MarcaAsociableProduccion[];
  /** Si se entra desde una Marca (ej. `/producciones?proyecto=<id>`),
   * preselecciona esa Marca tanto en el filtro como en el formulario de
   * creación — el usuario puede cambiarla igual. */
  marcaIdPreseleccionada?: string | null;
  onCrear: (formData: FormData) => Promise<void>;
}) {
  const [filtro, setFiltro] = useState(marcaIdPreseleccionada ?? "");
  const [creando, setCreando] = useState(false);

  const filtradas = filtro ? producciones.filter((p) => p.proyectoId === filtro) : producciones;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-text"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        {marcas.length > 0 ? (
          <Button type="button" onClick={() => setCreando((v) => !v)} className="px-4 py-2.5 text-[13.5px]">
            {creando ? "Cancelar" : "+ Nueva producción"}
          </Button>
        ) : null}
      </div>

      {creando ? (
        <Card>
          <ProduccionForm
            marcas={marcas}
            marcaIdDefault={marcaIdPreseleccionada ?? filtro}
            onSubmit={async (formData) => {
              await onCrear(formData);
              setCreando(false);
            }}
          />
        </Card>
      ) : null}

      {marcas.length === 0 ? (
        <Empty title="Todavía no tienes marcas">
          Creá tu primera Marca para poder empezar a producir un video.
        </Empty>
      ) : filtradas.length === 0 ? (
        <Empty title="No hay producciones para este filtro">
          {producciones.length === 0
            ? "Creá la primera con \"+ Nueva producción\"."
            : "Prueba con otra Marca."}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtradas.map((p) => (
            <Link key={p.id} href={`/proyectos/${p.proyectoId}/producciones/${p.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-surface-2/50">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
                    🪪 {p.proyectoNombre}
                  </span>
                  {p.terminada ? (
                    <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10.5px] text-text-muted">
                      ✓ Publicada
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[14.5px] font-medium text-text">{p.titulo}</p>
                <p className="mt-1.5 text-[12px] text-text-muted">
                  {p.totalEscenas} escena{p.totalEscenas === 1 ? "" : "s"} · {formatoDuracion(p.duracionCalculadaSegundos)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProduccionForm({
  onSubmit,
  marcas,
  marcaIdDefault,
}: {
  onSubmit: (formData: FormData) => Promise<void>;
  marcas: MarcaAsociableProduccion[];
  marcaIdDefault: string;
}) {
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
      <Label htmlFor="titulo">Título</Label>
      <Input id="titulo" name="titulo" placeholder="Título de la producción" required autoFocus />

      <Label htmlFor="proyectoId">Marca</Label>
      <select
        id="proyectoId"
        name="proyectoId"
        defaultValue={marcaIdDefault || marcas[0]?.id || ""}
        required
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14.5px] text-text"
      >
        {marcas.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </select>

      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}

      <Button type="submit" disabled={guardando} className="mt-4">
        {guardando ? "Creando…" : "Crear producción"}
      </Button>
    </form>
  );
}
