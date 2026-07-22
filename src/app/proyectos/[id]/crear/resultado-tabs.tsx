"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { EscenasEditor } from "@/components/escenas-editor";
import { explicarError } from "@/lib/errores";
import {
  descargarArchivoTexto,
  formatearKitMarkdown,
  formatearKitTexto,
  nombreArchivoDesdeTitulo,
  type KitContenido,
} from "@/lib/exportar-kit";
import { descargarKitPdf } from "@/lib/exportar-pdf";
import { formatearEscenas, type Escena } from "@/lib/types";
import type { ContenidoGenerado, EscenaRevisada } from "@/lib/ai";

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

/**
 * KIT DE PRODUCCIÓN — pantalla de revisión final (Paso 5 del asistente).
 * Antes era una vista por pestañas (Guión/Escenas/Prompts imagen/Prompts
 * video/Narración/Copy/Hashtags/CTA/Miniatura, cada una por separado); acá
 * es la MISMA información y los MISMOS campos editables, pero apilados en
 * tarjetas (cada escena con todos sus campos juntos, vía EscenasEditor) en
 * vez de repartidos entre pestañas — nada de contenido ni de lógica de
 * guardado cambia, solo la jerarquía visual.
 */
export function ResultadoTabs({
  proyectoId,
  resultado,
  formato,
  tipoProduccion,
  personajeIds,
  tema,
  resumenFormato,
  incluirMarca,
  incluirLogo,
  posicionLogo,
  incluirContacto,
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
  /** Toggles de "Qué incluir en esta pieza" (Paso 4) tal como quedaron al
   * exportar — se guardan junto con el bloque para poder precargarlos al
   * editar (ver QueIncluir en que-incluir.tsx). */
  incluirMarca?: boolean;
  incluirLogo?: boolean;
  posicionLogo?: string;
  incluirContacto?: boolean;
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
  const [exportandoPdf, setExportandoPdf] = useState(false);

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
      fd.set("incluirMarca", String(incluirMarca ?? true));
      fd.set("incluirLogo", String(incluirLogo ?? false));
      if (posicionLogo) fd.set("posicionLogo", posicionLogo);
      fd.set("incluirContacto", String(incluirContacto ?? false));
      await onGuardar(fd);
      router.push(`/proyectos/${proyectoId}/biblioteca`);
    } catch (e) {
      setError(explicarError(e));
      setGuardando(false);
    }
  }

  const kit: KitContenido = { titulo, copy, hashtags, cta, miniatura, narracion, escenas };

  function exportarTxt() {
    descargarArchivoTexto(nombreArchivoDesdeTitulo(titulo, "txt"), formatearKitTexto(kit), "text/plain;charset=utf-8");
  }

  function exportarMarkdown() {
    descargarArchivoTexto(nombreArchivoDesdeTitulo(titulo, "md"), formatearKitMarkdown(kit), "text/markdown;charset=utf-8");
  }

  async function exportarPdf() {
    setExportandoPdf(true);
    try {
      await descargarKitPdf(kit);
    } finally {
      setExportandoPdf(false);
    }
  }

  return (
    <Card>
      {resumenFormato ? (
        <p className="mb-2 text-[12px] font-medium text-text-muted">{resumenFormato}</p>
      ) : null}
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle subtitle="Revisa y ajusta cada tarjeta — nada se guarda hasta que confirmes abajo.">
          Kit de Producción
        </SectionTitle>
        <button
          type="button"
          onClick={onEmpezarDeNuevo}
          className="shrink-0 text-[12.5px] text-text-muted underline hover:text-accent"
        >
          Empezar de nuevo
        </button>
      </div>

      {escenas.length > 0 ? (
        <div className="mb-5">
          <p className="mb-2 font-display text-[14.5px]">🎬 Escenas</p>
          <EscenasEditor escenas={escenas} onChange={setEscenas} onRevisarEscena={revisarEscena} />
        </div>
      ) : null}

      {narracion.trim() ? (
        <div className="mb-5 border-t border-border pt-4">
          <div className="mb-1 flex items-center justify-between">
            <Label>🎙 Narración</Label>
            <BotonCopiar texto={narracion} />
          </div>
          <Textarea value={narracion} onChange={(e) => setNarracion(e.target.value)} className="min-h-[100px]" />
        </div>
      ) : null}

      <div className="mb-5 border-t border-border pt-4">
        <div className="mb-1 flex items-center justify-between">
          <Label>✍ Copy</Label>
          <BotonCopiar texto={copy} />
        </div>
        <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} className="min-h-[100px]" />
      </div>

      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between">
          <Label>🏷 Hashtags</Label>
          <BotonCopiar texto={hashtags} />
        </div>
        <Textarea value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
      </div>

      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between">
          <Label>📌 CTA</Label>
          <BotonCopiar texto={cta} />
        </div>
        <Textarea value={cta} onChange={(e) => setCta(e.target.value)} />
      </div>

      {miniatura.trim() ? (
        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <Label>🖼 Miniatura</Label>
            <BotonCopiar texto={miniatura} />
          </div>
          <Textarea value={miniatura} onChange={(e) => setMiniatura(e.target.value)} />
        </div>
      ) : null}

      <div className="mt-4 border-t border-border pt-4">
        <Label htmlFor="tituloFinal">Título</Label>
        <Input
          id="tituloFinal"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de esta pieza"
        />

        <p className="mb-1.5 mt-3.5 text-[12.5px] text-text-muted">Exportar Kit completo</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={exportarTxt}>
            ⬇ TXT
          </Button>
          <Button type="button" variant="secondary" onClick={exportarMarkdown}>
            ⬇ Markdown
          </Button>
          <Button type="button" variant="secondary" disabled={exportandoPdf} onClick={exportarPdf}>
            {exportandoPdf ? "Generando…" : "⬇ PDF"}
          </Button>
        </div>

        {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
        <Button type="button" className="mt-3" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar en Biblioteca"}
        </Button>
      </div>
    </Card>
  );
}
