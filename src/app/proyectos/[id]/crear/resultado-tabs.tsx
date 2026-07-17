"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { EscenasEditor } from "@/components/escenas-editor";
import { explicarError } from "@/lib/errores";
import { formatearEscenas, type Escena } from "@/lib/types";
import type { ContenidoGenerado } from "@/lib/ai";

type PestanaId =
  | "guion"
  | "escenas"
  | "promptsImagen"
  | "promptsVideo"
  | "narracion"
  | "copy"
  | "hashtags"
  | "cta"
  | "miniatura";

function construirTextoPlano(resultado: {
  copy: string;
  hashtags: string;
  cta: string;
  narracion: string;
  miniatura: string;
  escenas: Escena[];
}): string {
  const secciones: string[] = [];
  if (resultado.copy.trim()) secciones.push(`## Copy\n${resultado.copy.trim()}`);
  if (resultado.narracion.trim()) secciones.push(`## Narración\n${resultado.narracion.trim()}`);
  const bloqueEscenas = formatearEscenas(resultado.escenas);
  if (bloqueEscenas) secciones.push(`## Escenas\n${bloqueEscenas}`);
  if (resultado.hashtags.trim()) secciones.push(`## Hashtags\n${resultado.hashtags.trim()}`);
  if (resultado.cta.trim()) secciones.push(`## CTA\n${resultado.cta.trim()}`);
  if (resultado.miniatura.trim()) secciones.push(`## Miniatura\n${resultado.miniatura.trim()}`);
  return secciones.join("\n\n");
}

function BotonCopiar({ texto }: { texto: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(texto)}
      className="text-[12px] text-accent hover:underline"
    >
      Copiar
    </button>
  );
}

function ListaPorEscena({
  escenas,
  campo,
  onChange,
}: {
  escenas: Escena[];
  campo: "guionHablado" | "promptImagen" | "promptVideo";
  onChange: (index: number, valor: string) => void;
}) {
  const conContenido = escenas
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e[campo].trim().length > 0);

  if (conContenido.length === 0) {
    return <p className="text-[13px] text-text-muted">Sin contenido para esta pestaña.</p>;
  }

  return (
    <div className="space-y-3">
      {conContenido.map(({ e, i }) => (
        <div key={e.numero}>
          <div className="mb-1 flex items-center justify-between">
            <Label>Escena {e.numero}</Label>
            <BotonCopiar texto={e[campo]} />
          </div>
          <Textarea
            value={e[campo]}
            onChange={(ev) => onChange(i, ev.target.value)}
            className="min-h-[70px]"
          />
        </div>
      ))}
    </div>
  );
}

export function ResultadoTabs({
  proyectoId,
  resultado,
  formato,
  personajeId,
  onGuardar,
  onEmpezarDeNuevo,
}: {
  proyectoId: string;
  resultado: ContenidoGenerado;
  formato: string;
  /** El Personaje que estaba seleccionado al generar esta pieza (si
   * corresponde) — se guarda junto con el bloque para que la generación de
   * imagen use su foto de referencia. "" si no había ninguno. */
  personajeId?: string;
  onGuardar: (formData: FormData) => Promise<void>;
  onEmpezarDeNuevo: () => void;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(resultado.titulo);
  const [copy, setCopy] = useState(resultado.copy);
  const [hashtags, setHashtags] = useState(resultado.hashtags);
  const [cta, setCta] = useState(resultado.cta);
  const [narracion, setNarracion] = useState(resultado.narracion);
  const [miniatura, setMiniatura] = useState(resultado.miniatura);
  const [escenas, setEscenas] = useState<Escena[]>(resultado.escenas);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function updateEscena<K extends keyof Escena>(index: number, campo: K, valor: Escena[K]) {
    setEscenas((prev) => prev.map((e, i) => (i === index ? { ...e, [campo]: valor } : e)));
  }

  const promptsImagenCount = escenas.filter((e) => e.promptImagen.trim()).length;
  const promptsVideoCount = escenas.filter((e) => e.promptVideo.trim()).length;
  const guionCount = escenas.filter((e) => e.guionHablado.trim()).length;

  const pestañas: { id: PestanaId; icono: string; etiqueta: string; visible: boolean }[] = [
    { id: "guion", icono: "📜", etiqueta: "Guión", visible: guionCount > 0 },
    { id: "escenas", icono: "🎬", etiqueta: "Escenas", visible: escenas.length > 0 },
    { id: "promptsImagen", icono: "🖼", etiqueta: "Prompts de imágenes", visible: promptsImagenCount > 0 },
    { id: "promptsVideo", icono: "🎥", etiqueta: "Prompts para video IA", visible: promptsVideoCount > 0 },
    { id: "narracion", icono: "🎙", etiqueta: "Narración", visible: narracion.trim().length > 0 },
    { id: "copy", icono: "✍", etiqueta: "Copy", visible: copy.trim().length > 0 },
    { id: "hashtags", icono: "🏷", etiqueta: "Hashtags", visible: hashtags.trim().length > 0 },
    { id: "cta", icono: "📌", etiqueta: "CTA", visible: cta.trim().length > 0 },
    { id: "miniatura", icono: "🖼", etiqueta: "Miniatura", visible: miniatura.trim().length > 0 },
  ];
  const visibles = pestañas.filter((p) => p.visible);
  const [tabActiva, setTabActiva] = useState<PestanaId>(visibles[0]?.id ?? "copy");

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("titulo", titulo.trim() || "Sin título");
      fd.set("formato", formato || "Otro formato");
      fd.set("texto", construirTextoPlano({ copy, hashtags, cta, narracion, miniatura, escenas }) || "(sin contenido)");
      fd.set("escenasJson", escenas.length > 0 ? JSON.stringify(escenas) : "");
      if (personajeId) fd.set("personajeId", personajeId);
      await onGuardar(fd);
      router.push(`/proyectos/${proyectoId}/biblioteca`);
    } catch (e) {
      setError(explicarError(e));
      setGuardando(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13.5px] text-text-muted">
          Revisa y ajusta cada pestaña — nada se guarda hasta que confirmes abajo.
        </p>
        <button
          type="button"
          onClick={onEmpezarDeNuevo}
          className="text-[12.5px] text-text-muted underline hover:text-accent"
        >
          Empezar de nuevo
        </button>
      </div>

      {visibles.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
            {visibles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTabActiva(p.id)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${
                  tabActiva === p.id
                    ? "bg-accent font-semibold text-white"
                    : "border border-border bg-surface-2 text-text-muted hover:text-text"
                }`}
              >
                {p.icono} {p.etiqueta}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {tabActiva === "guion" ? (
              <ListaPorEscena
                escenas={escenas}
                campo="guionHablado"
                onChange={(i, v) => updateEscena(i, "guionHablado", v)}
              />
            ) : null}

            {tabActiva === "promptsImagen" ? (
              <ListaPorEscena
                escenas={escenas}
                campo="promptImagen"
                onChange={(i, v) => updateEscena(i, "promptImagen", v)}
              />
            ) : null}

            {tabActiva === "promptsVideo" ? (
              <ListaPorEscena
                escenas={escenas}
                campo="promptVideo"
                onChange={(i, v) => updateEscena(i, "promptVideo", v)}
              />
            ) : null}

            {tabActiva === "escenas" ? (
              <EscenasEditor escenas={escenas} onChange={setEscenas} />
            ) : null}

            {tabActiva === "narracion" ? (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Narración</Label>
                  <BotonCopiar texto={narracion} />
                </div>
                <Textarea
                  value={narracion}
                  onChange={(e) => setNarracion(e.target.value)}
                  className="min-h-[160px]"
                />
              </>
            ) : null}

            {tabActiva === "copy" ? (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Copy</Label>
                  <BotonCopiar texto={copy} />
                </div>
                <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} className="min-h-[160px]" />
              </>
            ) : null}

            {tabActiva === "hashtags" ? (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Hashtags</Label>
                  <BotonCopiar texto={hashtags} />
                </div>
                <Textarea value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
              </>
            ) : null}

            {tabActiva === "cta" ? (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <Label>CTA</Label>
                  <BotonCopiar texto={cta} />
                </div>
                <Textarea value={cta} onChange={(e) => setCta(e.target.value)} />
              </>
            ) : null}

            {tabActiva === "miniatura" ? (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Miniatura</Label>
                  <BotonCopiar texto={miniatura} />
                </div>
                <Textarea value={miniatura} onChange={(e) => setMiniatura(e.target.value)} />
              </>
            ) : null}
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-text-muted">
          Todo vacío — escribe directamente en el título cuando guardes, o usa &ldquo;Empezar de
          nuevo&rdquo; para pedirle ayuda a la IA.
        </p>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <Label htmlFor="tituloFinal">Título</Label>
        <Input
          id="tituloFinal"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de esta pieza"
        />
        {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
        <Button type="button" className="mt-3" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar en Biblioteca"}
        </Button>
      </div>
    </Card>
  );
}
