"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { explicarError } from "@/lib/errores";
import type { AnalisisCPP, DatosImportacionCPP, EntidadBiblioteca } from "@/lib/actions";
import {
  SelectorResolucion,
  type TipoCampoPendiente,
} from "@/lib/blueprint-import-shared";
import {
  agruparPendientesCpp,
  construirRevisionCpp,
  faltanDecisionesCpp,
  type EscenaCppEnRevision,
} from "@/lib/creator-os-import-shared";

const ETIQUETA_TIPO_PENDIENTE: Record<TipoCampoPendiente, string> = {
  plano: "Plano",
  locacion: "Locación",
  personaje: "Personaje",
};

type DecisionDuplicado = "reemplazar" | "nueva";

/**
 * Pantalla de revisión de un CreatorOS Production Package (CPP) — CONTENT
 * OS V2, SPRINT 3. Mismo patrón que `RevisionBlueprint` (analizar → cada
 * nombre libre se resuelve con `SelectorResolucion`, el motor de
 * similitud ya existente → confirmar), aplicado al contrato JSON en vez
 * del CBD en Markdown — con una diferencia deliberada (Sprint 4): al
 * confirmar aterriza en el Dashboard de la Producción, no en el Copiloto.
 * Nunca pega texto: recibe el
 * contenido ya leído de un archivo `.cpp.json` (Sprint 3, corrección 1).
 */
export function RevisionCpp({
  textoInicial,
  proyecto,
  onCerrar,
  onAnalizar,
  onConfirmar,
  onReemplazar,
  onCrearPersonaje,
  onCrearLocacion,
}: {
  textoInicial: string;
  proyecto: EntidadBiblioteca;
  onCerrar: () => void;
  onAnalizar: (proyectoId: string, textoCrudo: string) => Promise<AnalisisCPP>;
  onConfirmar: (
    proyectoId: string,
    textoCrudo: string,
    datos: DatosImportacionCPP,
  ) => Promise<{ produccionId: string }>;
  onReemplazar: (
    proyectoId: string,
    produccionId: string,
    textoCrudo: string,
    datos: DatosImportacionCPP,
  ) => Promise<{ produccionId: string }>;
  onCrearPersonaje: (nombre: string) => Promise<{ id: string }>;
  onCrearLocacion: (proyectoId: string, nombre: string) => Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [analisis, setAnalisis] = useState<AnalisisCPP | null>(null);
  const [escenasRevision, setEscenasRevision] = useState<EscenaCppEnRevision[]>([]);
  const [decisionDuplicado, setDecisionDuplicado] = useState<DecisionDuplicado | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");

  // Se analiza una única vez, al montar esta pantalla — `textoInicial` es
  // fijo durante toda la vida del componente (HoyScreen lo desmonta al
  // cerrar), así que no hace falta reaccionar a cambios posteriores.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError("");
      try {
        const resultado = await onAnalizar(proyecto.id, textoInicial);
        if (cancelado) return;
        setAnalisis(resultado);
        setEscenasRevision(
          construirRevisionCpp(
            resultado.paquete.escenas,
            resultado.personajesDisponibles,
            resultado.locacionesDisponibles,
            resultado.planosDisponibles,
          ),
        );
        setDecisionDuplicado(resultado.produccionDuplicada ? null : "nueva");
      } catch (e) {
        if (!cancelado) setError(explicarError(e));
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendientesConsolidados = agruparPendientesCpp(escenasRevision);

  async function crearPersonajeInline(nombre: string) {
    const { id } = await onCrearPersonaje(nombre);
    return { id };
  }

  async function crearLocacionInline(nombre: string) {
    const { id } = await onCrearLocacion(proyecto.id, nombre);
    return { id };
  }

  const confirmarDeshabilitado =
    confirmando || faltanDecisionesCpp(escenasRevision) || decisionDuplicado === null;

  async function handleConfirmar() {
    if (!analisis || !decisionDuplicado) return;
    setConfirmando(true);
    setError("");
    try {
      const { paquete } = analisis;
      const datos: DatosImportacionCPP = {
        produccion: {
          titulo: paquete.produccion.titulo,
          formato: paquete.produccion.formato,
          ideaCentral: paquete.produccion.ideaCentral,
          objetivoGeneral: paquete.produccion.objetivoGeneral ?? "",
          objetivoEspectador: paquete.produccion.objetivoEspectador ?? "",
          publicoObjetivo: paquete.produccion.publicoObjetivo ?? "",
          duracionEstimada: paquete.produccion.duracionEstimadaSegundos ?? null,
          contexto: paquete.produccion.contexto ?? "",
          notas: paquete.produccion.notas ?? "",
          coverImage: paquete.produccion.coverImage ?? null,
          musicaPrincipal: paquete.produccion.recursosGlobales?.musicaPrincipal ?? "",
          intro: paquete.produccion.recursosGlobales?.intro ?? "",
          outro: paquete.produccion.recursosGlobales?.outro ?? "",
        },
        escenas: escenasRevision.map((e) => ({
          numero: e.escena.numero,
          tipo: e.escena.tipo,
          objetivoNarrativo: e.escena.objetivoNarrativo,
          textoHablado: e.escena.textoHablado ?? "",
          textoPantalla: e.escena.textoPantalla ?? "",
          duracionEstimada: e.escena.duracionEstimadaSegundos ?? null,
          personajeIds: e.personajes
            .map((c) => (c.resuelto ? c.id : c.decision))
            .filter((id): id is string => Boolean(id)),
          locacionId: e.locacion ? (e.locacion.resuelto ? e.locacion.id : (e.locacion.decision ?? null)) : null,
          planoId: e.plano ? (e.plano.resuelto ? e.plano.id : (e.plano.decision ?? null)) : null,
          movimientoCamara: e.escena.movimientoCamara ?? "",
          recursosNecesarios: (e.escena.recursosNecesarios ?? []).join(", "),
          musica: e.escena.musica ?? "",
          transicion: e.escena.transicion ?? "",
          notas: e.escena.notas ?? "",
        })),
        packageId: paquete.packageId,
        version: paquete.creatorOSPackage,
        recursosJson: paquete.recursos ?? null,
        miniaturaJson: paquete.miniatura ?? null,
        publicacionJson: paquete.publicacion ?? null,
        metadataJson: paquete.metadata ?? null,
      };

      const { produccionId } =
        decisionDuplicado === "reemplazar" && analisis.produccionDuplicada
          ? await onReemplazar(proyecto.id, analisis.produccionDuplicada.id, textoInicial, datos)
          : await onConfirmar(proyecto.id, textoInicial, datos);

      onCerrar();
      // Sprint 4: el Dashboard de Producción (no el Copiloto) es el nuevo
      // destino tras importar un CPP — es el nuevo centro de la app.
      router.push(`/proyectos/${proyecto.id}/producciones/${produccionId}`);
    } catch (e) {
      setError(explicarError(e));
      setConfirmando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">Vista previa</p>
            <h1 className="mt-1 font-display text-2xl font-normal tracking-wide text-text">
              Importar Producción
            </h1>
          </div>
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
        </div>

        {cargando ? (
          <p className="text-[14px] text-text-muted">Analizando la Producción…</p>
        ) : error && !analisis ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-[13.5px] text-danger">{error}</p>
            <p className="text-[13px] text-text-muted">
              Corregí el archivo (o pedile a la IA que lo regenere) y volvé a intentar.
            </p>
          </div>
        ) : analisis ? (
          <div className="space-y-5">
            {analisis.produccionDuplicada ? (
              <div className="rounded-xl border border-accent/30 bg-accent-soft p-3.5">
                <p className="text-[13.5px] font-medium text-text">
                  Esta Producción ya se importó antes como “{analisis.produccionDuplicada.titulo}”
                </p>
                <p className="mt-1 text-[12.5px] text-text-muted">
                  Es la misma Producción que importaste el{" "}
                  {new Date(analisis.produccionDuplicada.fecha).toLocaleDateString("es-CL")}. ¿Reemplazar su
                  contenido, o importar de todas formas como una Producción nueva?
                </p>
                <div className="mt-2 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[12.5px] text-text">
                    <input
                      type="radio"
                      checked={decisionDuplicado === "reemplazar"}
                      onChange={() => setDecisionDuplicado("reemplazar")}
                    />
                    Reemplazar el contenido de “{analisis.produccionDuplicada.titulo}”
                  </label>
                  <label className="flex items-center gap-1.5 text-[12.5px] text-text">
                    <input
                      type="radio"
                      checked={decisionDuplicado === "nueva"}
                      onChange={() => setDecisionDuplicado("nueva")}
                    />
                    Importar como Producción nueva de todas formas
                  </label>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-border bg-surface p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Producción</p>
              <p className="mt-1 font-display text-lg text-text">{analisis.paquete.produccion.titulo}</p>
              <p className="mt-1 text-[12.5px] text-text-muted">
                {analisis.paquete.produccion.formato} · {analisis.paquete.escenas.length} escena
                {analisis.paquete.escenas.length === 1 ? "" : "s"}
                {analisis.paquete.produccion.duracionEstimadaSegundos
                  ? ` · ~${analisis.paquete.produccion.duracionEstimadaSegundos}s`
                  : ""}
              </p>
              <p className="mt-2 text-[13px] text-text">{analisis.paquete.produccion.ideaCentral}</p>
              {analisis.paquete.produccion.coverImage ? (
                <img
                  src={analisis.paquete.produccion.coverImage}
                  alt="Portada de la Producción"
                  className="mt-3 h-32 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>

            {pendientesConsolidados.length > 0 ? (
              <div className="rounded-xl border border-accent/30 bg-accent-soft p-3">
                <p className="mb-2 text-[13px] font-medium text-text">Antes de continuar</p>
                <div className="space-y-3">
                  {pendientesConsolidados.map(({ tipo, campo, ocurrencias }, i) => (
                    <div key={`${tipo}-${i}`} className="rounded-lg border border-border bg-surface p-2.5">
                      <span className="text-[11.5px] text-text-muted">
                        {ETIQUETA_TIPO_PENDIENTE[tipo]}
                        {ocurrencias > 1 ? ` (aparece en ${ocurrencias} escenas)` : ""}:{" "}
                      </span>
                      <span className="text-[12.5px] font-medium text-text">{campo.nombre}</span>
                      <div className="mt-1.5">
                        <SelectorResolucion
                          campo={campo}
                          onDecidir={(valor) => {
                            const decision = valor === "__sin_vincular__" ? null : valor;
                            setEscenasRevision((actual) =>
                              actual.map((e) => ({
                                ...e,
                                personajes: e.personajes.map((c) =>
                                  tipo === "personaje" && !c.resuelto && c.nombre === campo.nombre
                                    ? { ...c, decision }
                                    : c,
                                ),
                                locacion:
                                  tipo === "locacion" && e.locacion && !e.locacion.resuelto && e.locacion.nombre === campo.nombre
                                    ? { ...e.locacion, decision }
                                    : e.locacion,
                                plano:
                                  tipo === "plano" && e.plano && !e.plano.resuelto && e.plano.nombre === campo.nombre
                                    ? { ...e.plano, decision }
                                    : e.plano,
                              })),
                            );
                          }}
                          onCrearNuevo={
                            tipo === "personaje"
                              ? crearPersonajeInline
                              : tipo === "locacion"
                                ? crearLocacionInline
                                : undefined
                          }
                          etiquetaCrearNuevo={tipo === "personaje" ? "nuevo Personaje" : "nueva Locación"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Escenas</p>
              {escenasRevision.map((e, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface p-3">
                  <p className="text-[12.5px] font-medium text-text">
                    #{e.escena.numero} — {e.escena.tipo}
                  </p>
                  <p className="mt-0.5 text-[13px] text-text">{e.escena.objetivoNarrativo}</p>
                  {e.escena.textoHablado ? (
                    <p className="mt-1 text-[12.5px] text-text-muted">“{e.escena.textoHablado}”</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                    {e.locacion ? (
                      <span>
                        📍 <SelectorResolucion campo={e.locacion} soloEstado onDecidir={() => {}} />
                      </span>
                    ) : null}
                    {e.plano ? (
                      <span>
                        🎥 <SelectorResolucion campo={e.plano} soloEstado onDecidir={() => {}} />
                      </span>
                    ) : null}
                    {e.personajes.length > 0
                      ? e.personajes.map((c, j) => (
                          <span key={j}>
                            🧑 <SelectorResolucion campo={c} soloEstado onDecidir={() => {}} />
                          </span>
                        ))
                      : null}
                  </div>
                </div>
              ))}
            </div>

            {analisis.paquete.recursos && analisis.paquete.recursos.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Recursos</p>
                <div className="rounded-xl border border-border bg-surface p-3">
                  {analisis.paquete.recursos.map((r, i) => (
                    <p key={i} className="text-[12.5px] text-text">
                      <span className="font-medium">{r.nombre}</span>{" "}
                      <span className="text-text-muted">({r.tipo})</span>
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {analisis.paquete.miniatura ? (
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Miniatura</p>
                <div className="rounded-xl border border-border bg-surface p-3">
                  <p className="text-[12.5px] text-text">{analisis.paquete.miniatura.descripcion}</p>
                </div>
              </div>
            ) : null}

            {analisis.paquete.publicacion ? (
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Publicación</p>
                <div className="rounded-xl border border-border bg-surface p-3 text-[12.5px] text-text">
                  {analisis.paquete.publicacion.fechaPlanificada ? (
                    <p>Fecha planeada: {analisis.paquete.publicacion.fechaPlanificada}</p>
                  ) : null}
                  {analisis.paquete.publicacion.plataformas?.length ? (
                    <p>Plataformas: {analisis.paquete.publicacion.plataformas.join(", ")}</p>
                  ) : null}
                  {analisis.paquete.publicacion.copy ? <p className="mt-1">{analisis.paquete.publicacion.copy}</p> : null}
                </div>
              </div>
            ) : null}

            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

            <div className="flex justify-end gap-2 pb-8">
              <Button type="button" variant="secondary" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmar} disabled={confirmarDeshabilitado}>
                {confirmando
                  ? "Importando…"
                  : decisionDuplicado === "reemplazar"
                    ? "Reemplazar Producción"
                    : "Crear Producción"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
