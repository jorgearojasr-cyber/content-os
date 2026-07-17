"use client";

import { useEffect, useState } from "react";
import {
  archivarBloque,
  desarchivarBloque,
  duplicarBloque,
  eliminarBloquePermanente,
  guardarLinkPublicacion,
  moverAPapelera,
  moverBloqueAProyecto,
  renombrarBloque,
  restaurarBloque,
} from "@/lib/actions";
import { Button, Card, Chip } from "@/components/ui";
import { ActionMenu, ActionMenuItem } from "@/components/action-menu";
import { ConfirmDialog, PromptDialog, SelectDialog } from "@/components/confirm-dialog";
import { explicarError } from "@/lib/errores";
import { formatearFechaChile } from "@/lib/fecha";
import { urlImagenVisible } from "@/lib/imagen-url";
import { iconoFormato, parseEscenas, type Bloque, type Escena, type PersonajeResumen } from "@/lib/types";

export type BloqueConDias = Bloque & { diasRestantes?: number };
export type Vista = "activos" | "archivados" | "papelera";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const INSTAGRAM_EMBED_SCRIPT_SRC = "https://www.instagram.com/embed.js";

/** Renderiza el HTML de oEmbed de Instagram y carga (una sola vez para
 * toda la página) el script oficial que lo convierte en el embed visual —
 * sin él, `blockquote.instagram-media` se ve como una caja vacía. */
function InstagramEmbed({ html }: { html: string }) {
  useEffect(() => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    if (document.querySelector(`script[src="${INSTAGRAM_EMBED_SCRIPT_SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = INSTAGRAM_EMBED_SCRIPT_SRC;
    script.async = true;
    script.onload = () => window.instgrm?.Embeds.process();
    document.body.appendChild(script);
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Guía de producción de una escena — solo existe si la escena tiene
 * `promptVisual` (componente de imagen fija). Se expande individualmente,
 * sin afectar a las demás escenas de la misma pieza. */
function GuiaProduccionEscena({ escena, personaje }: { escena: Escena; personaje?: PersonajeResumen }) {
  const [abierta, setAbierta] = useState(false);
  const promptVisual = escena.promptVisual?.trim();
  if (!promptVisual) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-[12.5px] font-medium text-text"
      >
        <span>Escena {escena.numero} — guía de producción</span>
        <span className="text-text-muted">{abierta ? "▲" : "▼"}</span>
      </button>

      {abierta ? (
        <ol className="mt-2.5 space-y-3 text-[12.5px] text-text">
          <li>
            <p className="font-medium">1. Abre Gemini</p>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-accent underline"
            >
              gemini.google.com ↗
            </a>
            <p className="mt-1 text-[11px] text-text-muted">
              Si el texto en pantalla no sale legible, prueba con ChatGPT/GPT Image en su lugar.
            </p>
          </li>

          {personaje?.fotoUrl ? (
            <li>
              <p className="font-medium">
                2. Descarga la foto de referencia de {personaje.nombre || "tu Personaje"}
              </p>
              <a
                href={urlImagenVisible(personaje.fotoUrl)}
                download
                className="mt-1 inline-block rounded-lg bg-accent-soft px-2.5 py-1.5 text-[12px] font-medium text-accent hover:opacity-80"
              >
                Descargar foto
              </a>
            </li>
          ) : null}

          <li>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">3. Copia este prompt</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(promptVisual)}
                className="text-[12px] text-accent hover:underline"
              >
                Copiar
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-2 p-2.5 text-[12px] text-text-muted">
              {promptVisual}
            </p>
          </li>

          <li>
            <p className="font-medium">4. Cuando tengas la imagen</p>
            <p className="mt-1 text-[12px] text-text-muted">
              Publícala y pega el link de Instagram en &ldquo;Evidencia de publicación&rdquo; (abajo)
              para dejarlo guardado en esta misma pieza.
            </p>
          </li>
        </ol>
      ) : null}
    </div>
  );
}

/** Sección "Guía de producción": una guía por escena, solo para las que
 * tienen componente de imagen fija (`promptVisual`). No aparece si ninguna
 * escena la tiene (piezas de puro texto, o guardadas antes de este campo). */
function GuiaProduccion({ bloque, personaje }: { bloque: BloqueConDias; personaje?: PersonajeResumen }) {
  const escenas = parseEscenas(bloque.escenasJson).filter((e) => e.promptVisual?.trim());
  if (escenas.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 text-[12.5px] font-medium text-text-muted">Guía de producción</p>
      <div className="space-y-1.5">
        {escenas.map((e) => (
          <GuiaProduccionEscena key={e.numero} escena={e} personaje={personaje} />
        ))}
      </div>
    </div>
  );
}

/** Formulario simple para pegar el link de una publicación real (post,
 * carrusel o reel de Instagram — no Stories) y guardarlo como evidencia.
 * Si ya hay un embed cacheado lo muestra; si no, cae al link crudo con un
 * botón "Ver publicación"; si no hay nada guardado, solo el formulario. */
function EvidenciaPublicacion({ proyectoId, bloque }: { proyectoId: string; bloque: BloqueConDias }) {
  const [link, setLink] = useState(bloque.linkPublicacion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    if (!link.trim()) return;
    setGuardando(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("link", link.trim());
      await guardarLinkPublicacion(proyectoId, bloque.id, fd);
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 text-[12.5px] font-medium text-text-muted">Evidencia de publicación</p>

      {bloque.instagramEmbedHtml ? (
        <InstagramEmbed html={bloque.instagramEmbedHtml} />
      ) : bloque.linkPublicacion ? (
        <a
          href={bloque.linkPublicacion}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] font-medium text-accent hover:opacity-80"
        >
          Ver publicación ↗
        </a>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link del post, carrusel o reel de Instagram"
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-text placeholder:text-text-muted/60"
        />
        <Button
          type="button"
          className="px-3 py-2 text-[12.5px]"
          disabled={!link.trim() || guardando}
          onClick={guardar}
        >
          {guardando ? "Guardando…" : bloque.linkPublicacion ? "Actualizar link" : "Guardar link"}
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-text-muted">
        Solo publicaciones públicas — no soporta Stories (son públicas por 24h).
      </p>
      {error ? <p className="mt-1.5 text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

export function BibliotecaLista({
  proyectoId,
  vista,
  bloques,
  otrosProyectos,
  personajePorId,
}: {
  proyectoId: string;
  vista: Vista;
  bloques: BloqueConDias[];
  otrosProyectos: { id: string; nombre: string }[];
  /** Para resolver, por `bloque.personajeId`, el nombre y la foto a usar en
   * la Guía de producción de cada escena. */
  personajePorId: Record<string, PersonajeResumen>;
}) {
  return (
    <div className="space-y-3">
      {bloques.map((bloque) => (
        <BloqueCard
          key={bloque.id}
          proyectoId={proyectoId}
          vista={vista}
          bloque={bloque}
          otrosProyectos={otrosProyectos}
          personaje={bloque.personajeId ? personajePorId[bloque.personajeId] : undefined}
        />
      ))}
    </div>
  );
}

export function BloqueCard({
  proyectoId,
  vista,
  bloque,
  otrosProyectos,
  nombreProyecto,
  personaje,
}: {
  proyectoId: string;
  vista: Vista;
  bloque: BloqueConDias;
  otrosProyectos: { id: string; nombre: string }[];
  /** Se muestra como una etiqueta extra junto al formato — solo lo pasa la
   * pantalla global /biblioteca, que mezcla piezas de varios proyectos. La
   * Biblioteca de un proyecto (donde ya se sabe de cuál se trata) no lo
   * necesita y lo deja sin pasar. */
  nombreProyecto?: string;
  /** El Personaje que se usó para generar esta pieza (resuelto desde
   * `bloque.personajeId`) — para el paso 2 de la Guía de producción. */
  personaje?: PersonajeResumen;
}) {
  const [confirmPapelera, setConfirmPapelera] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [moviendo, setMoviendo] = useState(false);
  const [expandido, setExpandido] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
        >
          <span className="text-[20px] leading-none">{iconoFormato(bloque.formato)}</span>
          <div className="min-w-0">
            <div className="truncate font-display text-[15px]">{bloque.titulo}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-text-muted">
              {nombreProyecto ? <span>{nombreProyecto}</span> : null}
              <span>{formatearFechaChile(bloque.createdAt)}</span>
              {vista === "papelera" ? (
                <span>
                  · se elimina en {bloque.diasRestantes} día{bloque.diasRestantes === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>
        </button>

        <ActionMenu>
          {vista === "activos" ? (
            <>
              <ActionMenuItem href={`/proyectos/${proyectoId}/biblioteca/${bloque.id}/editar`}>
                Ver / Editar
              </ActionMenuItem>
              <ActionMenuItem onSelect={() => duplicarBloque(proyectoId, bloque.id)}>
                Duplicar
              </ActionMenuItem>
              <ActionMenuItem onSelect={() => setRenombrando(true)}>Renombrar</ActionMenuItem>
              {otrosProyectos.length > 0 ? (
                <ActionMenuItem onSelect={() => setMoviendo(true)}>
                  Mover a otro proyecto
                </ActionMenuItem>
              ) : null}
              <ActionMenuItem onSelect={() => archivarBloque(proyectoId, bloque.id)}>
                Archivar
              </ActionMenuItem>
              <ActionMenuItem variant="danger" onSelect={() => setConfirmPapelera(true)}>
                Eliminar
              </ActionMenuItem>
            </>
          ) : null}
          {vista === "archivados" ? (
            <>
              <ActionMenuItem href={`/proyectos/${proyectoId}/biblioteca/${bloque.id}/editar`}>
                Ver / Editar
              </ActionMenuItem>
              <ActionMenuItem onSelect={() => desarchivarBloque(proyectoId, bloque.id)}>
                Desarchivar
              </ActionMenuItem>
              <ActionMenuItem variant="danger" onSelect={() => setConfirmPapelera(true)}>
                Eliminar
              </ActionMenuItem>
            </>
          ) : null}
          {vista === "papelera" ? (
            <>
              <ActionMenuItem onSelect={() => restaurarBloque(proyectoId, bloque.id)}>
                Restaurar
              </ActionMenuItem>
              <ActionMenuItem variant="danger" onSelect={() => setConfirmEliminar(true)}>
                Eliminar para siempre
              </ActionMenuItem>
            </>
          ) : null}
        </ActionMenu>
      </div>

      {expandido ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Chip>{bloque.formato}</Chip>
            {nombreProyecto ? <Chip>{nombreProyecto}</Chip> : null}
          </div>
          <p className="whitespace-pre-wrap text-[14px] text-text">{bloque.texto}</p>
          <GuiaProduccion bloque={bloque} personaje={personaje} />
          <EvidenciaPublicacion proyectoId={proyectoId} bloque={bloque} />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmPapelera}
        onOpenChange={setConfirmPapelera}
        title="¿Eliminar este bloque?"
        description="Se moverá a la papelera y podrás recuperarlo durante 7 días."
        confirmLabel="Eliminar"
        onConfirm={() => moverAPapelera(proyectoId, bloque.id)}
      />
      <ConfirmDialog
        open={confirmEliminar}
        onOpenChange={setConfirmEliminar}
        title="¿Eliminar para siempre?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar para siempre"
        onConfirm={() => eliminarBloquePermanente(proyectoId, bloque.id)}
      />
      <PromptDialog
        open={renombrando}
        onOpenChange={setRenombrando}
        title="Renombrar bloque"
        defaultValue={bloque.titulo}
        onSubmit={(titulo) => {
          const fd = new FormData();
          fd.set("titulo", titulo);
          renombrarBloque(proyectoId, bloque.id, fd);
        }}
      />
      <SelectDialog
        open={moviendo}
        onOpenChange={setMoviendo}
        title="Mover a otro proyecto"
        options={otrosProyectos.map((p) => ({ value: p.id, label: p.nombre }))}
        onSubmit={(destino) => moverBloqueAProyecto(bloque.id, proyectoId, destino)}
      />
    </Card>
  );
}
