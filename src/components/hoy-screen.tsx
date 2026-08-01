"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Textarea } from "@/components/ui";
import { ResolucionMarca } from "@/components/resolucion-marca";
import { ContextoParaChatGPT } from "@/components/contexto-para-chatgpt";
import { ImportarBlueprintGlobalModal } from "@/app/proyectos/importar-blueprint-global-modal";
import { tieneEstructuraDeBlueprint } from "@/lib/blueprint-parser";
import { explicarError } from "@/lib/errores";
import type {
  AnalisisBlueprint,
  AnalisisProyectoBlueprint,
  DatosImportacionBlueprint,
  EntidadBiblioteca,
  ProduccionEnCurso,
} from "@/lib/actions";

type Modo = "campo" | "resolucion-marca" | "contexto-chatgpt";

/**
 * Pantalla "Hoy" (UX Migration 1) — entrada única a Content OS, reemplaza
 * al Dashboard. Un solo campo, una sola pregunta ("¿qué video querés hacer
 * hoy?"). Al confirmar, `tieneEstructuraDeBlueprint()` decide el camino:
 * con estructura de CBD → Mecanismo B (el importador ya existente, en su
 * modo controlado); sin estructura → "Contexto para ChatGPT", construido
 * sobre la Marca activa. Si no hay Marca resuelta todavía (cero o
 * ambigüedad), se resuelve en el lugar con `ResolucionMarca` antes de
 * seguir — nunca una sustitución automática.
 */
export function HoyScreen({
  proyectos,
  produccionesEnCurso,
  onAnalizarProyecto,
  onCrearProyecto,
  onAnalizarBiblioteca,
  onConfirmar,
  onGenerarContexto,
}: {
  proyectos: EntidadBiblioteca[];
  produccionesEnCurso: ProduccionEnCurso[];
  onAnalizarProyecto: (textoCrudo: string) => Promise<AnalisisProyectoBlueprint>;
  onCrearProyecto: (nombre: string) => Promise<{ proyectoId: string }>;
  onAnalizarBiblioteca: (proyectoId: string, textoCrudo: string) => Promise<AnalisisBlueprint>;
  onConfirmar: (
    proyectoId: string,
    textoCrudo: string,
    datos: DatosImportacionBlueprint,
  ) => Promise<{ produccionId: string }>;
  onGenerarContexto: (proyectoId: string) => Promise<string>;
}) {
  const [texto, setTexto] = useState("");
  const [marcaActivaId, setMarcaActivaId] = useState<string | null>(
    proyectos.length > 0 ? proyectos[proyectos.length - 1].id : null,
  );
  const [modo, setModo] = useState<Modo>("campo");
  const [textoParaImportar, setTextoParaImportar] = useState<string | null>(null);
  const [contextoGenerado, setContextoGenerado] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  async function generarContexto(proyectoId: string) {
    setGenerando(true);
    setError("");
    try {
      const contexto = await onGenerarContexto(proyectoId);
      setContextoGenerado(contexto);
      setModo("contexto-chatgpt");
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setGenerando(false);
    }
  }

  async function handleContinuar() {
    if (!texto.trim()) return;
    setError("");
    if (tieneEstructuraDeBlueprint(texto)) {
      setTextoParaImportar(texto);
      return;
    }
    if (!marcaActivaId) {
      setModo("resolucion-marca");
      return;
    }
    await generarContexto(marcaActivaId);
  }

  async function handleMarcaResuelta(proyectoId: string, _nombre: string) {
    setMarcaActivaId(proyectoId);
    await generarContexto(proyectoId);
  }

  function volverAlCampo() {
    setModo("campo");
    setTexto("");
    setContextoGenerado("");
    setError("");
  }

  return (
    <main className="mx-auto flex min-h-full max-w-[640px] flex-col justify-center px-4 py-10 sm:px-8">
      {proyectos.length > 1 && modo === "campo" ? (
        <div className="mb-6 flex justify-center">
          <select
            value={marcaActivaId ?? ""}
            onChange={(e) => setMarcaActivaId(e.target.value || null)}
            className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12.5px] text-text"
          >
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {modo === "campo" ? (
        <div className="space-y-3">
          <div className="text-center">
            <h1 className="font-display text-[26px] font-normal tracking-wide text-text sm:text-[30px]">
              ¿Qué video querés hacer hoy?
            </h1>
            <p className="mt-2 text-[14px] text-text-muted">
              Contame la idea, o pegá el guion si ya lo armaste con ChatGPT.
            </p>
          </div>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí tu idea, o pegá acá tu Creative Blueprint..."
            className="min-h-[160px] text-[14.5px]"
          />
          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
          <div className="flex justify-center">
            <Button type="button" onClick={handleContinuar} disabled={generando || !texto.trim()}>
              {generando ? "Un momento…" : "Continuar"}
            </Button>
          </div>
        </div>
      ) : modo === "resolucion-marca" ? (
        <div className="space-y-4">
          <ResolucionMarca
            nombreDeclarado=""
            proyectosDisponibles={proyectos}
            onCrearProyecto={onCrearProyecto}
            onResuelto={handleMarcaResuelta}
          />
          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}
          <div className="flex justify-center">
            <Button type="button" variant="secondary" onClick={volverAlCampo}>
              Volver a pegar
            </Button>
          </div>
        </div>
      ) : (
        <ContextoParaChatGPT idea={texto.trim()} contexto={contextoGenerado} onVolver={volverAlCampo} />
      )}

      {modo === "campo" && produccionesEnCurso.length > 0 ? (
        <div className="mt-10">
          <p className="mb-2.5 text-[12px] font-medium uppercase tracking-wide text-text-muted">Videos en curso</p>
          <div className="space-y-2">
            {produccionesEnCurso.map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.proyectoId}/producciones/${p.id}`}
                className="hover-lift block rounded-xl border border-border bg-surface p-3"
              >
                <p className="text-[13.5px] font-medium text-text">{p.titulo}</p>
                <p className="mt-0.5 text-[12px] text-text-muted">
                  {p.proyectoNombre} · {p.totalEscenas} escena{p.totalEscenas === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {textoParaImportar ? (
        <ImportarBlueprintGlobalModal
          textoInicial={textoParaImportar}
          onCerrarControlado={() => setTextoParaImportar(null)}
          onAnalizarProyecto={onAnalizarProyecto}
          onCrearProyecto={onCrearProyecto}
          onAnalizarBiblioteca={onAnalizarBiblioteca}
          onConfirmar={onConfirmar}
        />
      ) : null}
    </main>
  );
}
