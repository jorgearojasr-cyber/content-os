"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { SeccionColapsable } from "@/components/seccion-colapsable";
import { ResolucionMarca } from "@/components/resolucion-marca";
import { explicarError } from "@/lib/errores";
import type {
  AnalisisBlueprint,
  AnalisisProyectoBlueprint,
  DatosImportacionBlueprint,
  EscenaResuelta,
} from "@/lib/actions";
import {
  ETIQUETAS_TIPO_ESCENA,
  SIN_VINCULAR,
  SelectorResolucion,
  construirRevision,
  faltanDecisiones,
  type EscenaEnRevision,
} from "@/lib/blueprint-import-shared";

/** Entrada al importador de Blueprint SIN un Proyecto ya elegido de
 * antemano (a diferencia de `ImportarBlueprintModal`, que vive dentro de
 * un Proyecto y da por hecho cuál es). Acá "Proyecto" es una referencia
 * más a resolver (ver `ResolucionMarca`) — nunca una sustitución automática
 * a otro Proyecto.
 *
 * Dos modos de uso (UX Migration 1):
 * - Standalone (sin `textoInicial`): muestra su propio botón "Importar
 *   Blueprint" y arranca cerrado — comportamiento histórico, sin cambios.
 * - Controlado (con `textoInicial`): arranca abierto, con el texto ya
 *   cargado, y analiza automáticamente al montar — así "Hoy" puede abrir
 *   este mismo flujo ya probado sin que el usuario tenga que pegar el
 *   texto una segunda vez ni tocar "Analizar" de nuevo. `onCerrarControlado`
 *   avisa al padre cuando se cierra, para que pueda desmontarlo. */
export function ImportarBlueprintGlobalModal({
  onAnalizarProyecto,
  onCrearProyecto,
  onAnalizarBiblioteca,
  onConfirmar,
  textoInicial,
  onCerrarControlado,
}: {
  onAnalizarProyecto: (textoCrudo: string) => Promise<AnalisisProyectoBlueprint>;
  onCrearProyecto: (nombre: string) => Promise<{ proyectoId: string }>;
  onAnalizarBiblioteca: (proyectoId: string, textoCrudo: string) => Promise<AnalisisBlueprint>;
  onConfirmar: (
    proyectoId: string,
    textoCrudo: string,
    datos: DatosImportacionBlueprint,
  ) => Promise<{ produccionId: string }>;
  textoInicial?: string;
  onCerrarControlado?: () => void;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(Boolean(textoInicial));
  const [texto, setTexto] = useState(textoInicial ?? "");
  const [analizando, setAnalizando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");

  const [analisisProyecto, setAnalisisProyecto] = useState<AnalisisProyectoBlueprint | null>(null);

  const [proyectoElegidoId, setProyectoElegidoId] = useState<string | null>(null);
  const [proyectoElegidoNombre, setProyectoElegidoNombre] = useState("");
  const [analisisBiblioteca, setAnalisisBiblioteca] = useState<AnalisisBlueprint | null>(null);
  const [escenasRevision, setEscenasRevision] = useState<EscenaEnRevision[]>([]);
  const [aceptarDuplicado, setAceptarDuplicado] = useState(false);

  function cerrar() {
    setAbierto(false);
    setTexto("");
    setAnalisisProyecto(null);
    setProyectoElegidoId(null);
    setProyectoElegidoNombre("");
    setAnalisisBiblioteca(null);
    setEscenasRevision([]);
    setAceptarDuplicado(false);
    setError("");
    onCerrarControlado?.();
  }

  function volverAPegar() {
    setAnalisisProyecto(null);
    setProyectoElegidoId(null);
    setProyectoElegidoNombre("");
    setAnalisisBiblioteca(null);
    setEscenasRevision([]);
    setAceptarDuplicado(false);
  }

  async function resolverProyecto(proyectoId: string, nombre: string) {
    setError("");
    try {
      const analisis = await onAnalizarBiblioteca(proyectoId, texto);
      setAnalisisBiblioteca(analisis);
      setEscenasRevision(construirRevision(analisis.resultado.escenas, analisis));
      setProyectoElegidoId(proyectoId);
      setProyectoElegidoNombre(nombre);
    } catch (e) {
      setError(explicarError(e));
    }
  }

  async function handleAnalizar(textoAAnalizar: string) {
    setAnalizando(true);
    setError("");
    setProyectoElegidoId(null);
    setAnalisisBiblioteca(null);
    setEscenasRevision([]);
    setAceptarDuplicado(false);
    try {
      const resultado = await onAnalizarProyecto(textoAAnalizar);
      setAnalisisProyecto(resultado);
      if (resultado.resultado.errores.length === 0 && resultado.proyectoResuelto) {
        await resolverProyecto(resultado.proyectoResuelto.id, resultado.proyectoResuelto.nombre);
      }
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setAnalizando(false);
    }
  }

  // Modo controlado (textoInicial presente): analiza automáticamente al
  // montar, una sola vez — el usuario ya "confirmó" al pegar/escribir en
  // Hoy, no debería tener que tocar "Analizar" de nuevo. Diferido a un
  // microtask para no disparar setState de forma síncrona dentro del
  // cuerpo del efecto (react-hooks/set-state-in-effect).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!textoInicial) return;
    queueMicrotask(() => handleAnalizar(textoInicial));
  }, []);

  function decidirPersonaje(escenaIndex: number, personajeIndex: number, valor: string) {
    setEscenasRevision((prev) =>
      prev.map((e, i) => {
        if (i !== escenaIndex) return e;
        return {
          ...e,
          personajes: e.personajes.map((c, j) => {
            if (j !== personajeIndex || c.resuelto) return c;
            return { ...c, decision: valor === "" ? undefined : valor === SIN_VINCULAR ? null : valor };
          }),
        };
      }),
    );
  }

  function decidirCampo(escenaIndex: number, tipo: "locacion" | "plano", valor: string) {
    setEscenasRevision((prev) =>
      prev.map((e, i) => {
        if (i !== escenaIndex) return e;
        const actual = e[tipo];
        if (!actual || actual.resuelto) return e;
        const decision = valor === "" ? undefined : valor === SIN_VINCULAR ? null : valor;
        return { ...e, [tipo]: { ...actual, decision } };
      }),
    );
  }

  async function handleConfirmar() {
    if (!analisisBiblioteca?.resultado.produccion || !proyectoElegidoId) return;
    setConfirmando(true);
    setError("");
    try {
      const escenasResueltas: EscenaResuelta[] = escenasRevision.map((e) => ({
        tipo: e.cbd.tipo,
        objetivoNarrativo: e.cbd.objetivoNarrativo,
        duracionEstimada: e.cbd.duracionEstimada,
        emocion: e.cbd.emocion,
        resultadoEsperado: e.cbd.resultadoEsperado,
        personajeIds: e.personajes
          .map((c) => (c.resuelto ? c.id : c.decision))
          .filter((id): id is string => Boolean(id)),
        locacionId: e.locacion ? (e.locacion.resuelto ? e.locacion.id : e.locacion.decision ?? null) : null,
        planoId: e.plano ? (e.plano.resuelto ? e.plano.id : e.plano.decision ?? null) : null,
        movimientoCamara: e.cbd.movimientoCamara,
        textoHablado: e.cbd.textoHablado,
        textoPantalla: e.cbd.textoPantalla,
        recursosNecesarios: e.cbd.recursosNecesarios,
        promptImagen: e.cbd.promptImagen,
        promptVideo: e.cbd.promptVideo,
        musica: e.cbd.musica,
        transicion: e.cbd.transicion,
        notas: e.cbd.notas,
      }));

      const { produccionId } = await onConfirmar(proyectoElegidoId, texto, {
        produccion: analisisBiblioteca.resultado.produccion,
        contexto: analisisBiblioteca.resultado.contexto,
        recursosGlobales: analisisBiblioteca.resultado.recursosGlobales,
        escenas: escenasResueltas,
      });

      const proyectoDestino = proyectoElegidoId;
      cerrar();
      router.push(`/proyectos/${proyectoDestino}/producciones/${produccionId}`);
    } catch (e) {
      setError(explicarError(e));
      setConfirmando(false);
    }
  }

  if (!abierto) {
    if (textoInicial) return null;
    return (
      <Button type="button" variant="secondary" onClick={() => setAbierto(true)}>
        Importar Blueprint
      </Button>
    );
  }

  const resultadoProyecto = analisisProyecto?.resultado ?? null;
  const bloqueanteProyecto = resultadoProyecto !== null && resultadoProyecto.errores.length > 0;
  const proyectoPendiente = analisisProyecto !== null && !bloqueanteProyecto && proyectoElegidoId === null;
  const resultado = analisisBiblioteca?.resultado ?? null;
  const listo = resultado !== null && resultado.errores.length === 0;
  const esDuplicado = analisisBiblioteca?.produccionDuplicada != null;
  const confirmarDeshabilitado =
    !listo || faltanDecisiones(escenasRevision) || (esDuplicado && !aceptarDuplicado) || confirmando;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={cerrar}>
      <div
        className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-bg p-5 shadow-[var(--shadow-card)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="font-display text-lg font-normal tracking-wide">Importar Blueprint</span>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-text-muted hover:bg-surface-2 hover:text-text"
          >
            ✕
          </button>
        </div>

        {!analisisProyecto || bloqueanteProyecto ? (
          <div className="space-y-3">
            <p className="text-[13px] text-text-muted">
              Pegá el Creative Blueprint Document generado por ChatGPT. Todavía no elegiste un Proyecto — se
              analiza primero a qué Proyecto pertenece, sin crear nada.
            </p>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="# Creative Blueprint v1..."
              className="min-h-[320px] font-mono text-[12.5px]"
            />
            {resultadoProyecto && resultadoProyecto.errores.length > 0 ? (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-3">
                <p className="text-[12.5px] font-medium text-danger">
                  Este Blueprint no se puede importar todavía:
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px] text-danger">
                  {resultadoProyecto.errores.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
            <Button type="button" onClick={() => handleAnalizar(texto)} disabled={analizando || !texto.trim()}>
              {analizando ? "Analizando…" : "Analizar"}
            </Button>
          </div>
        ) : proyectoPendiente ? (
          <div className="space-y-4">
            <ResolucionMarca
              nombreDeclarado={analisisProyecto.nombreDeclarado}
              proyectosDisponibles={analisisProyecto.proyectosDisponibles}
              onCrearProyecto={onCrearProyecto}
              onResuelto={resolverProyecto}
            />

            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={volverAPegar}>
                Volver a pegar
              </Button>
            </div>
          </div>
        ) : resultado && analisisBiblioteca ? (
          <div className="space-y-4">
            <p className="text-[12px] text-text-muted">
              Importando a: <span className="font-medium text-text">{proyectoElegidoNombre}</span>
            </p>

            {resultado.advertencias.length > 0 ? (
              <div className="rounded-lg border border-accent/40 bg-accent-soft p-3">
                <p className="text-[12.5px] font-medium text-accent">Advertencias (no bloquean el import):</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px] text-text">
                  {resultado.advertencias.map((adv, i) => (
                    <li key={i}>{adv}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {analisisBiblioteca.produccionDuplicada ? (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-3">
                <p className="text-[12.5px] font-medium text-danger">
                  Ya existe una Producción con este Blueprint exacto:{" "}
                  <Link
                    href={`/proyectos/${proyectoElegidoId}/producciones/${analisisBiblioteca.produccionDuplicada.id}`}
                    className="underline"
                    target="_blank"
                  >
                    {analisisBiblioteca.produccionDuplicada.titulo}
                  </Link>
                  .
                </p>
                <label className="mt-2 flex items-center gap-2 text-[12.5px] text-text">
                  <input
                    type="checkbox"
                    checked={aceptarDuplicado}
                    onChange={(e) => setAceptarDuplicado(e.target.checked)}
                  />
                  Importar de todas formas (esto va a crear una Producción nueva y separada)
                </label>
              </div>
            ) : null}

            <SeccionColapsable titulo="Producción" tieneContenido>
              <p className="text-[14.5px] font-medium text-text">{resultado.produccion?.titulo}</p>
              {resultado.produccion?.formato ? (
                <p className="mt-1 text-[12.5px] text-text-muted">Formato: {resultado.produccion.formato}</p>
              ) : null}
              {resultado.produccion?.ideaCentral ? (
                <p className="mt-1 text-[12.5px] text-text-muted">Idea central: {resultado.produccion.ideaCentral}</p>
              ) : null}
              {resultado.produccion?.objetivoGeneral ? (
                <p className="mt-1 text-[12.5px] text-text-muted">
                  Objetivo general: {resultado.produccion.objetivoGeneral}
                </p>
              ) : null}
              {resultado.produccion && resultado.produccion.objetivoEspectador.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-[12.5px] text-text-muted">
                  {resultado.produccion.objetivoEspectador.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              ) : null}
            </SeccionColapsable>

            {resultado.contexto ? (
              <SeccionColapsable titulo="Contexto" tieneContenido={false}>
                <p className="whitespace-pre-wrap text-[12.5px] text-text-muted">{resultado.contexto}</p>
              </SeccionColapsable>
            ) : null}

            {resultado.recursosGlobales &&
            (resultado.recursosGlobales.musicaPrincipal ||
              resultado.recursosGlobales.intro ||
              resultado.recursosGlobales.outro) ? (
              <SeccionColapsable titulo="Recursos globales" tieneContenido={false}>
                {resultado.recursosGlobales.musicaPrincipal ? (
                  <p className="text-[12.5px] text-text-muted">Música: {resultado.recursosGlobales.musicaPrincipal}</p>
                ) : null}
                {resultado.recursosGlobales.intro ? (
                  <p className="text-[12.5px] text-text-muted">Intro: {resultado.recursosGlobales.intro}</p>
                ) : null}
                {resultado.recursosGlobales.outro ? (
                  <p className="text-[12.5px] text-text-muted">Outro: {resultado.recursosGlobales.outro}</p>
                ) : null}
              </SeccionColapsable>
            ) : null}

            <div>
              <p className="mb-2 text-[13px] font-medium text-text">
                {escenasRevision.length} escena{escenasRevision.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-3">
                {escenasRevision.map((e, i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text-muted">#{i + 1}</span>
                      <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
                        {ETIQUETAS_TIPO_ESCENA[e.cbd.tipo] ?? e.cbd.tipo}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-text">{e.cbd.objetivoNarrativo}</p>

                    {e.plano ? (
                      <div className="mt-2">
                        <span className="text-[11.5px] text-text-muted">Plano: </span>
                        <SelectorResolucion
                          campo={e.plano}
                          disponibles={analisisBiblioteca.planosDisponibles}
                          onDecidir={(v) => decidirCampo(i, "plano", v)}
                        />
                      </div>
                    ) : null}
                    {e.locacion ? (
                      <div className="mt-2">
                        <span className="text-[11.5px] text-text-muted">Locación: </span>
                        <SelectorResolucion
                          campo={e.locacion}
                          disponibles={analisisBiblioteca.locacionesDisponibles}
                          onDecidir={(v) => decidirCampo(i, "locacion", v)}
                        />
                      </div>
                    ) : null}
                    {e.personajes.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        <span className="text-[11.5px] text-text-muted">Personajes:</span>
                        {e.personajes.map((c, j) => (
                          <SelectorResolucion
                            key={j}
                            campo={c}
                            disponibles={analisisBiblioteca.personajesDisponibles}
                            onDecidir={(v) => decidirPersonaje(i, j, v)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={volverAPegar}>
                Volver a pegar
              </Button>
              <Button type="button" onClick={handleConfirmar} disabled={confirmarDeshabilitado}>
                {confirmando ? "Creando…" : "Confirmar importación"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
