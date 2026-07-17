"use client";

import { useState } from "react";
import { Button, Card, SectionTitle } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { explicarError } from "@/lib/errores";
import type { PlanEdicion } from "@/lib/ai";

type ClaveCriterio = Exclude<keyof PlanEdicion["evaluacionFinal"], "recomendaciones">;

const NOMBRE_CRITERIO: Record<ClaveCriterio, string> = {
  gancho: "Gancho",
  claridad: "Claridad",
  retencion: "Retención",
  ritmo: "Ritmo",
  valorEducativo: "Valor educativo",
  potencialViralidad: "Potencial de viralidad",
};

/** Arma el plan como texto plano legible — sin JSON crudo — para "Copiar
 * todo" y "Descargar .txt". Pensado para leerse en pantalla partida
 * mientras se edita en CapCut/Premiere/DaVinci. */
function formatearPlanEdicion(plan: PlanEdicion, tituloBloque: string, esConversion: boolean): string {
  const unidad = esConversion ? "Lámina" : "Escena";
  const lineas: string[] = [];
  lineas.push(`PLAN DE EDICIÓN — ${tituloBloque}`, "");
  lineas.push(`RITMO GENERAL: ${plan.ritmoGeneral.recomendacion}`, plan.ritmoGeneral.porQue, "");

  lineas.push(`── ${unidad.toUpperCase()} POR ${unidad.toUpperCase()} ──`, "");
  for (const e of plan.porEscena) {
    lineas.push(
      `${unidad} ${e.numero} (${e.duracionSugerida}s)`,
      `Movimiento de cámara: ${e.movimientoCamara}`,
      `Transición de entrada: ${e.transicionEntrada}`,
      `Elementos gráficos: ${e.elementosGraficos || "—"}`,
      `Nota de edición: ${e.notaDeEdicion}`,
      "",
    );
  }

  lineas.push("── B-ROLL ──", ...plan.bRoll.map((b) => `- ${b}`), "");
  lineas.push(
    "── EFECTOS DE SONIDO ──",
    ...plan.efectosSonido.map((s) => `- ${s.momento}: ${s.efecto}`),
    "",
  );
  lineas.push("── MÚSICA ──", plan.musica, "");
  lineas.push("── COLOR ──", `${plan.color.recomendacion} — ${plan.color.porQue}`, "");
  lineas.push("── ANIMACIONES ──", ...plan.animaciones.map((a) => `- ${a}`), "");
  lineas.push("── PAUSAS ──", ...plan.pausas.map((p) => `- ${p}`), "");
  lineas.push(
    "── CTA ──",
    `Análisis: ${plan.evaluacionCta.analisis}`,
    `Mejora sugerida: ${plan.evaluacionCta.mejoraSugerida}`,
    "",
  );

  lineas.push("── EVALUACIÓN FINAL ──");
  for (const [clave, etiqueta] of Object.entries(NOMBRE_CRITERIO)) {
    const c = plan.evaluacionFinal[clave as keyof typeof NOMBRE_CRITERIO];
    lineas.push(`${etiqueta}: ${c.nota}/10 — ${c.comentario}`);
  }
  lineas.push("", "Recomendaciones:", ...plan.evaluacionFinal.recomendaciones.map((r) => `- ${r}`));

  return lineas.join("\n");
}

function descargarTxt(nombreArchivo: string, contenido: string) {
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

function Nota({ etiqueta, nota, comentario }: { etiqueta: string; nota: number; comentario: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12.5px] font-medium text-text">{etiqueta}</p>
        <p className="font-display text-[15px] text-accent">{nota}/10</p>
      </div>
      <p className="mt-1 text-[12.5px] text-text-muted">{comentario}</p>
    </div>
  );
}

/**
 * DIRECTOR DE EDICIÓN — panel de solo lectura del Plan de Edición de una
 * pieza de video. Se genera una sola vez (botón inicial) y se muestra
 * directamente en las visitas siguientes; "Regenerar plan" es la única
 * forma de volver a llamar a la IA sobre esta pieza.
 */
export function PlanEdicionPanel({
  tituloBloque,
  planInicial,
  puedeGenerar,
  esConversion,
  onGenerar,
}: {
  tituloBloque: string;
  planInicial: PlanEdicion | null;
  /** Si la pieza no tiene ninguna escena, el panel entero no se renderiza
   * — no hay nada sobre lo que hacer un plan. Con escenas (de video real O
   * de Carrusel/Imagen), siempre se ofrece: para Carrusel/Imagen, como un
   * plan de CONVERSIÓN a video (ver `esConversion`). */
  puedeGenerar: boolean;
  /** true = esta pieza nació como Carrusel/Imagen de varias láminas (sin
   * video real) — ajusta textos a "convertir en video" en vez de asumir
   * metraje ya filmado. */
  esConversion: boolean;
  onGenerar: (regenerar: boolean) => Promise<PlanEdicion>;
}) {
  const [plan, setPlan] = useState(planInicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [confirmRegenerar, setConfirmRegenerar] = useState(false);
  const [copiado, setCopiado] = useState(false);

  if (!puedeGenerar) return null;

  async function generar(regenerar: boolean) {
    setCargando(true);
    setError("");
    try {
      setPlan(await onGenerar(regenerar));
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setCargando(false);
    }
  }

  if (!plan) {
    return (
      <Card>
        <SectionTitle
          subtitle={
            esConversion
              ? "La IA analiza este Carrusel/Imagen ya generado y te entrega un plan para convertirlo en video (tiempos por lámina, transiciones, movimiento y música) para que edites a mano en CapCut, Premiere o DaVinci — no automatiza la edición."
              : "La IA analiza esta pieza ya generada y te entrega un plan de edición profesional para que edites a mano en CapCut, Premiere o DaVinci — no automatiza la edición."
          }
        >
          Director de Edición
        </SectionTitle>
        {error ? <p className="mb-2 text-[12.5px] text-danger">{error}</p> : null}
        <Button type="button" disabled={cargando} onClick={() => generar(false)}>
          {cargando
            ? "Generando plan… (puede tardar 20-40s)"
            : esConversion
              ? "🎬 Plan para convertir en video"
              : "🎬 Generar Plan de Edición"}
        </Button>
      </Card>
    );
  }

  const textoPlano = formatearPlanEdicion(plan, tituloBloque, esConversion);
  const unidad = esConversion ? "Lámina" : "Escena";

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          subtitle={
            esConversion
              ? "Plan para convertir este Carrusel/Imagen en video — sigue estos pasos a mano en tu editor."
              : "Sigue este plan a mano en tu editor — la IA no edita el video por ti."
          }
        >
          Director de Edición
        </SectionTitle>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(textoPlano);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              } catch {
                setError("No se pudo copiar al portapapeles. Intenta de nuevo.");
              }
            }}
          >
            {copiado ? "Copiado ✓" : "Copiar todo"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={() => descargarTxt(`plan-edicion-${tituloBloque.slice(0, 40)}.txt`, textoPlano)}
          >
            Descargar .txt
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-[12.5px]"
            disabled={cargando}
            onClick={() => setConfirmRegenerar(true)}
          >
            {cargando ? "Regenerando…" : "Regenerar plan"}
          </Button>
        </div>
      </div>

      {error ? <p className="mb-3 text-[12.5px] text-danger">{error}</p> : null}

      <div className="space-y-5">
        <section>
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">
            Ritmo general
          </p>
          <p className="mt-1 font-display text-[16px] text-text">{plan.ritmoGeneral.recomendacion}</p>
          <p className="mt-1 text-[13.5px] text-text-muted">{plan.ritmoGeneral.porQue}</p>
        </section>

        <section>
          <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">
            {unidad} por {unidad.toLowerCase()}
          </p>
          <div className="space-y-2.5">
            {plan.porEscena.map((e) => (
              <div key={e.numero} className="rounded-xl border border-border bg-surface-2 p-3.5">
                <p className="text-[13.5px] font-medium text-text">
                  {unidad} {e.numero} <span className="font-normal text-text-muted">({e.duracionSugerida}s)</span>
                </p>
                <p className="mt-1.5 text-[12.5px] text-text-muted">
                  <span className="text-text">Cámara:</span> {e.movimientoCamara}
                </p>
                <p className="text-[12.5px] text-text-muted">
                  <span className="text-text">Entrada:</span> {e.transicionEntrada}
                </p>
                {e.elementosGraficos ? (
                  <p className="text-[12.5px] text-text-muted">
                    <span className="text-text">Gráficos:</span> {e.elementosGraficos}
                  </p>
                ) : null}
                <p className="mt-1.5 text-[13px] text-text">{e.notaDeEdicion}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">B-roll</p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-text">
              {plan.bRoll.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">
              Efectos de sonido
            </p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-text">
              {plan.efectosSonido.map((s, i) => (
                <li key={i}>
                  • {s.momento}: <span className="font-mono text-[12px] text-accent">{s.efecto}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">Música</p>
            <p className="mt-1.5 text-[13px] text-text">{plan.musica}</p>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">Color</p>
            <p className="mt-1.5 text-[13px] text-text">
              {plan.color.recomendacion} — <span className="text-text-muted">{plan.color.porQue}</span>
            </p>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">
              Animaciones
            </p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-text">
              {plan.animaciones.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">Pausas</p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-text">
              {plan.pausas.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">CTA</p>
          <p className="mt-1.5 text-[13px] text-text">{plan.evaluacionCta.analisis}</p>
          <p className="mt-1 text-[13px] text-accent">{plan.evaluacionCta.mejoraSugerida}</p>
        </section>

        <section>
          <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-text-muted">
            Evaluación final
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(NOMBRE_CRITERIO).map(([clave, etiqueta]) => {
              const c = plan.evaluacionFinal[clave as keyof typeof NOMBRE_CRITERIO];
              return <Nota key={clave} etiqueta={etiqueta} nota={c.nota} comentario={c.comentario} />;
            })}
          </div>
          <ul className="mt-3 space-y-1 text-[13px] text-text">
            {plan.evaluacionFinal.recomendaciones.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </section>
      </div>

      <ConfirmDialog
        open={confirmRegenerar}
        onOpenChange={setConfirmRegenerar}
        title="¿Regenerar el plan de edición?"
        description="Se reemplaza el plan actual por uno nuevo — esta acción no se puede deshacer."
        confirmLabel="Regenerar"
        onConfirm={() => generar(true)}
      />
    </Card>
  );
}
