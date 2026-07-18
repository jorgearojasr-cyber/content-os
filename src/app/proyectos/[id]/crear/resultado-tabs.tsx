"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { EscenasEditor } from "@/components/escenas-editor";
import { explicarError } from "@/lib/errores";
import { formatearEscenas, type Escena } from "@/lib/types";
import type { ContenidoGenerado, EscenaRevisada } from "@/lib/ai";

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
  campo: "guionHablado" | "promptVisual" | "promptVideo";
  onChange: (index: number, valor: string) => void;
}) {
  const conContenido = escenas
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (e[campo] ?? "").trim().length > 0);

  if (conContenido.length === 0) {
    return <p className="text-[13px] text-text-muted">Sin contenido para esta pestaña.</p>;
  }

  return (
    <div className="space-y-3">
      {conContenido.map(({ e, i }) => (
        <div key={e.numero}>
          <div className="mb-1 flex items-center justify-between">
            <Label>Escena {e.numero}</Label>
            <BotonCopiar texto={e[campo] ?? ""} />
          </div>
          <Textarea
            value={e[campo] ?? ""}
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
  tipoProduccion,
  personajeIds,
  tema,
  resumenFormato,
  onGuardar,
  onEmpezarDeNuevo,
  onRevisarEscena,
}: {
  proyectoId: string;
  resultado: ContenidoGenerado;
  formato: string;
  /** El tipo de producción elegido (Paso 2 de Crear, ej. "Solo escenas
   * reales") — junto con `formato`, le da a "Revisar cambios" el mismo
   * contexto que tuvo la generación original. */
  tipoProduccion?: string;
  /** Los Personajes que estaban seleccionados al generar esta pieza (si
   * corresponde) — se guardan junto con el bloque; el primero es el que
   * usa la generación de imagen para tomar su foto de referencia. Vacío/
   * ausente si no había ninguno. */
  personajeIds?: string[];
  /** El tema/idea con el que se generó esta pieza — se usa para detectar si
   * hizo match con una nota pendiente de Segundo Cerebro y marcarla como
   * trabajada al guardar. */
  tema?: string;
  /** Línea compacta "Formato · Plataforma · Tipo de publicación · Duración ·
   * Personaje(s)" ya armada por quien llama (`CrearModos`, a partir de la
   * misma selección de Paso 4/5) — este componente solo la muestra, no
   * recalcula ni infiere nada. "" si no hay nada que mostrar. */
  resumenFormato?: string;
  onGuardar: (formData: FormData) => Promise<void>;
  onEmpezarDeNuevo: () => void;
  /** Re-genera los prompts/referencias de una escena editada a mano — ver
   * `revisarEscenaAction` en actions.ts. Recibe `contexto` como argumento
   * SEPARADO (no fusionado en un solo objeto) porque esta pieza todavía no
   * está guardada — `contexto` solo existe acá, en el estado del cliente,
   * nunca se pre-aplica con `.bind()` como sí ocurre al editar un bloque ya
   * guardado (ver editar/page.tsx). */
  onRevisarEscena: (
    contexto: {
      tema: string;
      tipoContenido: string;
      tipoProduccion: string;
      personajeIds?: string[];
    },
    input: {
      escena: Pick<Escena, "numero" | "descripcion" | "textoEnPantalla">;
      otrasEscenas: { numero: number; descripcion: string; textoEnPantalla: string }[];
    },
  ) => Promise<EscenaRevisada>;
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

  function revisarEscena(escena: Escena, otrasEscenas: Escena[]) {
    return onRevisarEscena(
      {
        tema: tema ?? "",
        tipoContenido: formato,
        tipoProduccion: tipoProduccion ?? "",
        personajeIds,
      },
      {
        escena: { numero: escena.numero, descripcion: escena.descripcion, textoEnPantalla: escena.textoEnPantalla },
        otrasEscenas: otrasEscenas.map((e) => ({
          numero: e.numero,
          descripcion: e.descripcion,
          textoEnPantalla: e.textoEnPantalla,
        })),
      },
    );
  }

  const promptsImagenCount = escenas.filter((e) => (e.promptVisual ?? "").trim()).length;
  const promptsVideoCount = escenas.filter((e) => e.promptVideo.trim()).length;
  const guionCount = escenas.filter((e) => e.guionHablado.trim()).length;

  const pestañas: { id: PestanaId; icono: string; etiqueta: string; ayuda: string; visible: boolean }[] = [
    {
      id: "guion",
      icono: "📜",
      etiqueta: "Guión",
      ayuda: "El texto hablado completo de la pieza.",
      visible: guionCount > 0,
    },
    {
      id: "escenas",
      icono: "🎬",
      etiqueta: "Escenas",
      ayuda: "Desglose visual escena por escena, con sus prompts de imagen/video.",
      visible: escenas.length > 0,
    },
    {
      id: "promptsImagen",
      icono: "🖼",
      etiqueta: "Prompts de imágenes",
      ayuda: "Los prompts listos para copiar en herramientas de imagen (Gemini).",
      visible: promptsImagenCount > 0,
    },
    {
      id: "promptsVideo",
      icono: "🎥",
      etiqueta: "Prompts para video IA",
      ayuda: "Los prompts listos para copiar en herramientas de video (Kling/Runway/Veo).",
      visible: promptsVideoCount > 0,
    },
    {
      id: "narracion",
      icono: "🎙",
      etiqueta: "Narración",
      ayuda: "La voz en off general de la pieza, aparte del diálogo de cada escena.",
      visible: narracion.trim().length > 0,
    },
    {
      id: "copy",
      icono: "✍",
      etiqueta: "Copy",
      ayuda: "El texto que acompaña la publicación.",
      visible: copy.trim().length > 0,
    },
    {
      id: "hashtags",
      icono: "🏷",
      etiqueta: "Hashtags",
      ayuda: "Los hashtags recomendados para la publicación.",
      visible: hashtags.trim().length > 0,
    },
    {
      id: "cta",
      icono: "📌",
      etiqueta: "CTA",
      ayuda: "El llamado a la acción de cierre.",
      visible: cta.trim().length > 0,
    },
    {
      id: "miniatura",
      icono: "🖼",
      etiqueta: "Miniatura",
      ayuda: "La imagen de portada/preview de la pieza.",
      visible: miniatura.trim().length > 0,
    },
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
      if (personajeIds && personajeIds.length > 0) fd.set("personajeIds", JSON.stringify(personajeIds));
      if (tema) fd.set("tema", tema);
      await onGuardar(fd);
      router.push(`/proyectos/${proyectoId}/biblioteca`);
    } catch (e) {
      setError(explicarError(e));
      setGuardando(false);
    }
  }

  return (
    <Card>
      {resumenFormato ? (
        <p className="mb-2 text-[12px] font-medium text-text-muted">{resumenFormato}</p>
      ) : null}
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

          {visibles.find((p) => p.id === tabActiva) ? (
            <p className="mt-2 text-[12px] text-text-muted">
              {visibles.find((p) => p.id === tabActiva)?.ayuda}
            </p>
          ) : null}

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
                campo="promptVisual"
                onChange={(i, v) => updateEscena(i, "promptVisual", v)}
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
              <EscenasEditor escenas={escenas} onChange={setEscenas} onRevisarEscena={revisarEscena} />
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
