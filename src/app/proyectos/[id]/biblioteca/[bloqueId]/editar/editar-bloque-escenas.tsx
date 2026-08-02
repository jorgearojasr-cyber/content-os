"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { EscenasEditor } from "@/components/escenas-editor";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { PlanEdicionPanel } from "@/components/plan-edicion-panel";
import { QueIncluir } from "@/components/que-incluir";
import { ValidadorConsistencia } from "@/components/validador-consistencia";
import { identidadTieneContacto } from "@/lib/identity-compiler";
import type { PosicionLogo } from "@/lib/identity-compiler";
import { explicarError } from "@/lib/errores";
import {
  esConversionAVideo,
  parsePlanEdicion,
  reemplazarSeccionEscenas,
  type Avatar,
  type Bloque,
  type CalidadImagen,
  type Escena,
  type Identidad,
  type Personaje,
} from "@/lib/types";
import type { EscenaRevisada } from "@/lib/ai";
import type { ResultadoPlanEdicion } from "@/lib/actions";

const DURACION_CONFIRMACION_MS = 2000;
const POSICION_LOGO_DEFAULT: PosicionLogo = "inferior-derecha";

/**
 * Ver/editar un bloque ya guardado cuyo `escenasJson` no es null: reutiliza
 * el mismo EscenasEditor de la pantalla Crear. Al guardar, `texto` se
 * sincroniza reemplazando solo su sección "## Escenas" — el resto (Copy,
 * Hashtags, CTA, etc., si el usuario los edita a mano abajo) queda intacto.
 * Los toggles de "Qué incluir en esta pieza" (mismo QueIncluir de Crear
 * Paso 4) se precargan con lo que el bloque ya tenía guardado, y viajan en
 * vivo a "Regenerar prompts" para esa escena — ver `revisarEscena` abajo.
 */
export function EditarBloqueConEscenas({
  bloque,
  escenasIniciales,
  onUpdate,
  onGenerarImagen,
  onGenerarPlanEdicion,
  onRevisarEscena,
  identidad,
  activosCount,
  tienePersonaje,
  tieneAvatar,
  personajesUsados,
  personajes,
  avatares,
  personajeIdsIniciales,
}: {
  bloque: Bloque;
  escenasIniciales: Escena[];
  onUpdate: (formData: FormData) => Promise<void>;
  onGenerarImagen: (numeroEscena: number, calidad: CalidadImagen) => Promise<string>;
  onGenerarPlanEdicion: (regenerar: boolean) => Promise<ResultadoPlanEdicion>;
  /** Sin `contexto` pre-aplicado (a diferencia de antes) — se arma acá con
   * los toggles EN VIVO y se pasa en cada llamada, igual que ya hace Crear
   * (ver revisarEscena() abajo y ResultadoTabs). */
  onRevisarEscena: (
    contexto: {
      tema: string;
      tipoContenido: string;
      tipoProduccion: string;
      personajeIds?: string[];
      incluirMarca?: boolean;
      incluirLogo?: boolean;
      posicionLogo?: PosicionLogo | null;
      incluirContacto?: boolean;
      avatarId?: string;
    },
    input: {
      escena: { numero: number; descripcion: string; textoEnPantalla: string };
      otrasEscenas: { numero: number; descripcion: string; textoEnPantalla: string }[];
    },
  ) => Promise<EscenaRevisada>;
  identidad: Identidad | null;
  activosCount: number;
  tienePersonaje: boolean;
  tieneAvatar: boolean;
  personajesUsados: Personaje[];
  personajes: Personaje[];
  avatares: Avatar[];
  /** Personajes que esta pieza ya tenía seleccionados al guardarse (ver
   * `personajeIdsJson`/`personajeId` del bloque) — precarga el toggle
   * "Usar Personaje" y su selector, no arranca vacío. */
  personajeIdsIniciales: string[];
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(bloque.titulo);
  const [texto, setTexto] = useState(bloque.texto);
  const [escenas, setEscenas] = useState<Escena[]>(escenasIniciales);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  // "Qué incluir en esta pieza" — precargado con lo que el bloque ya tenía
  // guardado (no vacío), mismo componente y misma forma de estado que Crear
  // Paso 4 (ver QueIncluir en que-incluir.tsx).
  const [personajeSeleccion, setPersonajeSeleccion] = useState<{ ids: string[]; incluir: boolean }>({
    ids: personajeIdsIniciales,
    incluir: personajeIdsIniciales.length > 0,
  });
  const incluirPersonaje = personajeSeleccion.incluir;
  const [incluirMarca, setIncluirMarca] = useState(bloque.incluirMarca);
  const [avatarId, setAvatarId] = useState(avatares[0]?.id ?? "");
  const [incluirContacto, setIncluirContacto] = useState(bloque.incluirContacto);
  const [incluirLogo, setIncluirLogo] = useState(bloque.incluirLogo);
  const [posicionLogo, setPosicionLogo] = useState<PosicionLogo>(
    (bloque.posicionLogo as PosicionLogo | null) ?? POSICION_LOGO_DEFAULT,
  );

  const hayPersonajeDisponible = personajes.length > 0;
  const mostrarContacto = identidad ? identidadTieneContacto(identidad) : false;

  function alternarPersonajeSeleccionado(id: string) {
    setPersonajeSeleccion((prev) => ({
      ...prev,
      ids: prev.ids.includes(id) ? prev.ids.filter((x) => x !== id) : [...prev.ids, id],
    }));
  }

  function elegirPersonajeAutomatico() {
    setPersonajeSeleccion((prev) => ({ ...prev, ids: [] }));
  }

  // "✨ Automático" (selección vacía con "Usar Personaje" marcado) toma el
  // primero disponible, para que el comportamiento sea idéntico al de la
  // pieza cuando se creó.
  const personajeIdsParaRevisar = !incluirPersonaje
    ? []
    : personajeSeleccion.ids.length > 0
      ? personajeSeleccion.ids
      : personajes.slice(0, 1).map((p) => p.id);

  function revisarEscena(escena: Escena, otrasEscenas: Escena[]) {
    return onRevisarEscena(
      {
        tema: bloque.titulo,
        tipoContenido: bloque.formato,
        tipoProduccion: bloque.formato,
        personajeIds: personajeIdsParaRevisar,
        incluirMarca,
        incluirLogo,
        posicionLogo: incluirLogo ? posicionLogo : null,
        incluirContacto,
        avatarId: incluirMarca ? avatarId : undefined,
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
    if (!titulo.trim()) return;
    setGuardando(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("titulo", titulo.trim());
      fd.set("formato", bloque.formato);
      fd.set("texto", reemplazarSeccionEscenas(texto, escenas) || "(sin contenido)");
      fd.set("escenasJson", JSON.stringify(escenas));
      fd.set("incluirMarca", String(incluirMarca));
      fd.set("incluirLogo", String(incluirLogo));
      if (incluirLogo) fd.set("posicionLogo", posicionLogo);
      fd.set("incluirContacto", String(incluirContacto));
      await onUpdate(fd);
      router.refresh();
      setGuardado(true);
      setTimeout(() => setGuardado(false), DURACION_CONFIRMACION_MS);
    } catch (e) {
      setError(explicarError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle subtitle="Ver y editar esta pieza guardada.">{bloque.titulo}</SectionTitle>

        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />

        <QueIncluir
          mostrarPersonaje={hayPersonajeDisponible}
          incluirPersonaje={incluirPersonaje}
          setIncluirPersonaje={(v) => setPersonajeSeleccion((prev) => ({ ...prev, incluir: v }))}
          personajes={personajes}
          personajeIds={personajeSeleccion.ids}
          onTogglePersonaje={alternarPersonajeSeleccionado}
          onElegirAutomatico={elegirPersonajeAutomatico}
          incluirMarca={incluirMarca}
          setIncluirMarca={setIncluirMarca}
          avatares={avatares}
          avatarId={avatarId}
          setAvatarId={setAvatarId}
          mostrarContacto={mostrarContacto}
          incluirContacto={incluirContacto}
          setIncluirContacto={setIncluirContacto}
          logoUrl={identidad?.logoUrl ?? ""}
          incluirLogo={incluirLogo}
          setIncluirLogo={setIncluirLogo}
          posicionLogo={posicionLogo}
          setPosicionLogo={setPosicionLogo}
        />

        <Label>Escenas</Label>
        <p className="mb-2 text-[12.5px] text-text-muted">
          Edita cada escena — al guardar, el contenido de abajo se actualiza automáticamente para
          que quede sincronizado.
        </p>
        <EscenasEditor
          escenas={escenas}
          onChange={setEscenas}
          onGenerarImagen={onGenerarImagen}
          onRevisarEscena={revisarEscena}
        />

        <Label htmlFor="texto">Contenido completo</Label>
        <Textarea
          id="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-h-[160px]"
        />

        {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
        <Button type="button" className="mt-4" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar cambios"}
        </Button>
      </Card>

      <PlanEdicionPanel
        tituloBloque={bloque.titulo}
        planInicial={parsePlanEdicion(bloque.planEdicionJson)}
        puedeGenerar={escenasIniciales.length > 0}
        esConversion={esConversionAVideo(escenasIniciales)}
        onGenerar={onGenerarPlanEdicion}
      />

      {bloque.identidadCompilada && identidad ? (
        <Card>
          <SectionTitle subtitle="La identidad que se usó cuando se creó esta pieza — no cambia al editar el texto.">
            Identidad usada en la creación
          </SectionTitle>
          <IdentidadChecklist
            identidad={identidad}
            activosCount={activosCount}
            tienePersonaje={tienePersonaje}
            tieneAvatar={tieneAvatar}
            textoDetalle={bloque.identidadCompilada}
          />
        </Card>
      ) : null}

      {personajesUsados.length > 0 ? (
        <Card>
          <SectionTitle subtitle="Chequeos estructurales, sin IA de visión — ver el alcance en el componente.">
            Validador de consistencia
          </SectionTitle>
          <div className="space-y-2">
            {personajesUsados.map((p) => (
              <div key={p.id}>
                <p className="mb-1 text-[12.5px] font-medium text-text">{p.nombre || "Personaje sin nombre"}</p>
                <ValidadorConsistencia bloque={bloque} personaje={p} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
