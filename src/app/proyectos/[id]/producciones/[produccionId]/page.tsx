import { notFound } from "next/navigation";
import { getProduccion, getStoryboardEscenas } from "@/lib/actions";
import { Card, Chip, Empty, LinkButton, SectionTitle } from "@/components/ui";
import { ESTADOS_PRODUCCION_ESCENA } from "@/lib/types";
import { ESTADO_PRODUCCION_INFO, resolverFaseCopiloto } from "@/lib/estado-produccion";
import type { CreatorOSProductionPackage } from "@/lib/creator-os-package";

function estadoGeneral(totalEscenas: number, desglose: Record<string, number>) {
  if (totalEscenas === 0) return "Sin escenas planificadas";
  if (desglose.PUBLICADA === totalEscenas) return "Publicado";
  if (desglose.BORRADOR === totalEscenas) return "En planificación";
  return "En producción";
}

function formatoDuracion(segundosTotales: number) {
  const m = Math.floor(segundosTotales / 60);
  const s = segundosTotales % 60;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

/**
 * Dashboard de Producción (CONTENT OS V2 — SPRINT 4) — el nuevo centro de
 * la aplicación: qué es esta Producción, en qué estado está, y cuál es el
 * siguiente paso concreto. Sin IA, sin chat, sin asistentes — solo lectura
 * del estado real (mismas fuentes que ya usan Escenas y Copiloto:
 * `getStoryboardEscenas` + `resolverFaseCopiloto`), nunca un módulo nuevo
 * de generación.
 */
export default async function ProduccionDashboardPage({
  params,
}: {
  params: Promise<{ id: string; produccionId: string }>;
}) {
  const { id: proyectoId, produccionId } = await params;
  const produccion = await getProduccion(produccionId);
  if (!produccion || produccion.proyectoId !== proyectoId) notFound();

  const escenas = await getStoryboardEscenas(produccionId);
  const base = `/proyectos/${proyectoId}/producciones/${produccionId}`;

  const desglose: Record<string, number> = Object.fromEntries(
    ESTADOS_PRODUCCION_ESCENA.map((e) => [e, escenas.filter((esc) => esc.estadoProduccion === e).length]),
  );
  const duracionTotal = escenas.reduce((acc, e) => acc + e.duracionSegundos, 0);
  const completadas = desglose.PUBLICADA ?? 0;
  const porcentaje = escenas.length === 0 ? 0 : Math.round((completadas / escenas.length) * 100);

  const miniaturaCpp = produccion.cppMiniaturaJson as CreatorOSProductionPackage["miniatura"] | null;

  // Sprint 5: la etiqueta ES la acción concreta ("Grabar Escena 3", no
  // "Continuar") — el botón dice exactamente adónde lleva, sin un paso
  // intermedio genérico.
  const fase = resolverFaseCopiloto(escenas);
  const proximaAccion: { etiqueta: string; href: string | null } =
    fase.fase === "vacio"
      ? { etiqueta: "Agregar la primera escena", href: `${base}/escenas` }
      : fase.fase === "grabar"
        ? {
            etiqueta: `Grabar Escena ${escenas.find((e) => e.id === fase.escenaId)?.numero ?? ""}`,
            href: `${base}/copiloto/${fase.escenaId}`,
          }
        : fase.fase === "editar"
          ? { etiqueta: "Editar el video completo", href: `${base}/copiloto/editar` }
          : fase.fase === "cierre"
            ? { etiqueta: "Publicar", href: `${base}/copiloto/cierre` }
            : { etiqueta: "Producción completa ✓", href: null };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle subtitle={produccion.ideaCentral || undefined}>{produccion.titulo}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Chip variant="neutral">{produccion.formato}</Chip>
          {produccion.duracionEstimadaSegundos ? (
            <Chip variant="neutral">~{produccion.duracionEstimadaSegundos}s estimados</Chip>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionTitle>Estado general</SectionTitle>
        <p className="text-[13px] text-text-muted">{estadoGeneral(escenas.length, desglose)}</p>
        <p className="mt-1 text-[13px] text-text-muted">
          {escenas.length} escena{escenas.length === 1 ? "" : "s"} · {formatoDuracion(duracionTotal)}
        </p>
      </Card>

      <Card>
        <SectionTitle>Progreso</SectionTitle>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="mt-1.5 text-[12px] text-text-muted">{porcentaje}% publicado</p>
        <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
          {ESTADOS_PRODUCCION_ESCENA.map((estado) => (
            <span key={estado} className={`text-[12px] ${ESTADO_PRODUCCION_INFO[estado].clase}`}>
              {ESTADO_PRODUCCION_INFO[estado].icono} {ESTADO_PRODUCCION_INFO[estado].etiqueta}: {desglose[estado]}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Escenas</SectionTitle>
        {escenas.length === 0 ? (
          <Empty title="Todavía no hay escenas">Agregalas desde la pestaña Escenas.</Empty>
        ) : (
          <div className="space-y-1.5">
            {escenas.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-[12.5px] text-text">
                  #{e.numero} · {e.objetivoNarrativo || "Sin objetivo definido"}
                </span>
                <span className={`shrink-0 text-[12px] ${ESTADO_PRODUCCION_INFO[e.estadoProduccion].clase}`}>
                  {ESTADO_PRODUCCION_INFO[e.estadoProduccion].icono} {ESTADO_PRODUCCION_INFO[e.estadoProduccion].etiqueta}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <LinkButton href={`${base}/escenas`} variant="secondary">
            Ver todas las escenas
          </LinkButton>
        </div>
      </Card>

      <Card>
        <SectionTitle>Miniatura</SectionTitle>
        {produccion.coverImage ? (
          <img
            src={produccion.coverImage}
            alt={`Portada de ${produccion.titulo}`}
            className="h-40 w-full rounded-lg object-cover"
          />
        ) : miniaturaCpp ? (
          <div className="rounded-xl border border-border bg-surface-2 p-3 text-[13px] text-text">
            <p>{miniaturaCpp.descripcion}</p>
            {miniaturaCpp.textoEnMiniatura ? (
              <p className="mt-1 text-text-muted">Texto: “{miniaturaCpp.textoEnMiniatura}”</p>
            ) : null}
          </div>
        ) : (
          <Empty title="Todavía no hay miniatura">Esta Producción no tiene una portada definida.</Empty>
        )}
      </Card>

      <Card>
        <SectionTitle>Próxima acción</SectionTitle>
        <div className="rounded-xl border border-accent/30 bg-accent-soft p-4">
          {proximaAccion.href ? (
            <LinkButton href={proximaAccion.href}>{proximaAccion.etiqueta}</LinkButton>
          ) : (
            <p className="text-[14px] text-text">{proximaAccion.etiqueta}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
