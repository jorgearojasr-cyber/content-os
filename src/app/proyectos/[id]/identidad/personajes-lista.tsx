"use client";

import { useState } from "react";
import {
  eliminarVersionPersonaje,
  guardarVersionPersonaje,
  restaurarVersionPersonaje,
} from "@/lib/actions";
import { Button, Card, Textarea } from "@/components/ui";
import { BotonGuardar } from "@/components/boton-guardar";
import { CampoChips } from "@/components/campo-chips";
import { ConfirmDialog, PromptDialog } from "@/components/confirm-dialog";
import { FieldWithHelp } from "@/components/field-with-help";
import { FotosContextoPersonaje } from "@/components/fotos-contexto-personaje";
import { FotosPersonaje } from "@/components/fotos-personaje";
import { MadurezBar } from "@/components/madurez-bar";
import { PromptsMaestrosPersonaje } from "@/components/prompts-maestros-personaje";
import { SeccionColapsable } from "@/components/seccion-colapsable";
import { explicarError } from "@/lib/errores";
import { formatearFechaChile } from "@/lib/fecha";
import {
  estadoSeccionPersonaje,
  madurezPersonajeCompleta,
  NIVELES_CAMPOS_PERSONAJE,
  progresoSeccionPersonaje,
  SECCIONES_PERSONAJE,
} from "@/lib/personaje-secciones";
import { extraerFragmento } from "@/lib/reutilizacion";
import {
  NIVELES_FORMALIDAD,
  NIVELES_TECNICOS,
  parseFotosContextoPersonaje,
  parseFotosPersonaje,
  parseVersionesPersonaje,
  resolverVozPersonaje,
  ROLES_PERSONAJE,
  TIPOS_HUMOR,
  type CampoHerencia,
} from "@/lib/types";
import type { FotoContextoPersonaje, FotoPersonaje, Identidad, Personaje, TipoFotoPersonaje } from "@/lib/types";
import type { PersonajeSugerido } from "@/lib/ai";

const LARGO_RESUMEN = 80;

function resumenPersonaje(p: Personaje): string {
  const primero = [p.personalidad, p.fisica, p.vestuario, p.vozDescrita].find((v) => v.trim().length > 0);
  return extraerFragmento(primero ?? "", LARGO_RESUMEN);
}

function setCampoEstilo(id: string, valor: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) el.value = valor;
}

/**
 * Personajes de este proyecto — lista de tarjetas (como Activos): cada una
 * con Editar/Eliminar, más "+ Nuevo personaje" que abre el mismo formulario
 * vacío. Un solo formulario abierto a la vez (nuevo o edición de una
 * tarjeta existente) — nunca sobrescribe: crear o editar son siempre
 * acciones explícitas sobre una fila concreta.
 */
export function PersonajesLista({
  personajes,
  identidad = null,
  onCreate,
  onUpdate,
  onDelete,
  onSubirFoto,
  onEliminarFoto,
  onSubirTemporal,
  onEliminarTemporal,
  onGenerarPersonaje,
  onSubirFotoContexto,
  onEditarEtiquetaFotoContexto,
  onEliminarFotoContexto,
}: {
  personajes: Personaje[];
  /** La Identidad del proyecto — de acá heredan formalidad/humor/nivel
   * técnico los Personajes que no definieron un valor propio. `null` en la
   * lista global de Personajes del estudio (no tienen un único proyecto). */
  identidad?: Identidad | null;
  onCreate: (formData: FormData) => Promise<{ id: string }>;
  onUpdate: (personajeId: string, formData: FormData) => Promise<void>;
  onDelete: (personajeId: string) => Promise<void>;
  onSubirFoto: (personajeId: string, tipo: TipoFotoPersonaje, formData: FormData) => Promise<FotoPersonaje[]>;
  onEliminarFoto: (personajeId: string, url: string) => Promise<FotoPersonaje[]>;
  onSubirTemporal: (formData: FormData) => Promise<string>;
  onEliminarTemporal: (url: string) => Promise<void>;
  onGenerarPersonaje: (
    descripcion: string,
    contexto?: Partial<PersonajeSugerido>,
  ) => Promise<PersonajeSugerido>;
  onSubirFotoContexto: (personajeId: string, formData: FormData) => Promise<FotoContextoPersonaje[]>;
  onEditarEtiquetaFotoContexto: (personajeId: string, url: string, etiqueta: string) => Promise<FotoContextoPersonaje[]>;
  onEliminarFotoContexto: (personajeId: string, url: string) => Promise<FotoContextoPersonaje[]>;
}) {
  const [abierto, setAbierto] = useState<"nuevo" | string | null>(null);
  const [modoIA, setModoIA] = useState(false);
  const [descripcionIA, setDescripcionIA] = useState("");
  const [generando, setGenerando] = useState(false);
  const [errorIA, setErrorIA] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null);

  async function generarYAbrir() {
    setGenerando(true);
    setErrorIA("");
    try {
      const sugerido = await onGenerarPersonaje(descripcionIA);
      const fd = new FormData();
      fd.set("nombre", "");
      fd.set("personalidad", sugerido.personajePersonalidad);
      fd.set("fisica", sugerido.fisica);
      fd.set("vestuario", sugerido.vestuario);
      fd.set("vozDescrita", sugerido.vozDescrita);
      fd.set("gestos", sugerido.gestos);
      fd.set("muletillas", sugerido.muletillas);
      const { id } = await onCreate(fd);
      // look/cámara son campos de Estilo (viven en identidades, no en el
      // Personaje) — se sugieren igual, como subproducto de describirlo.
      setCampoEstilo("look", sugerido.look);
      setCampoEstilo("camara", sugerido.camara);
      setModoIA(false);
      setDescripcionIA("");
      setAbierto(id);
    } catch (e) {
      setErrorIA(explicarError(e));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-text-muted">Quién aparece en el contenido, si aplica.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={() => setModoIA((v) => !v)}
          >
            ✨ Generar con IA
          </Button>
          <Button
            type="button"
            className="px-3 py-1.5 text-[12.5px]"
            onClick={() => setAbierto(abierto === "nuevo" ? null : "nuevo")}
          >
            + Nuevo personaje
          </Button>
        </div>
      </div>

      {modoIA ? (
        <div className="mb-4 rounded-xl border border-border bg-surface-2 p-3.5">
          <Textarea
            value={descripcionIA}
            onChange={(e) => setDescripcionIA(e.target.value)}
            placeholder="Ej: Quiero un maestro chileno de aproximadamente 58 años, cercano, con mucha experiencia y que enseñe de forma sencilla."
          />
          {errorIA ? <p className="mt-2 text-[12.5px] text-danger">{errorIA}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-[12.5px]"
              onClick={() => setModoIA(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="px-3 py-1.5 text-[12.5px]"
              disabled={generando || !descripcionIA.trim()}
              onClick={generarYAbrir}
            >
              {generando ? "Generando…" : "Generar"}
            </Button>
          </div>
        </div>
      ) : null}

      {abierto === "nuevo" ? (
        <PersonajeForm
          key="nuevo"
          titulo="Nuevo personaje"
          personaje={null}
          onSubmit={async (fd) => {
            await onCreate(fd);
            setAbierto(null);
          }}
          onCancelar={() => setAbierto(null)}
          onSubirFoto={(_tipo, fd) => onSubirTemporal(fd)}
          onEliminarFoto={(_tipo, url) => onEliminarTemporal(url)}
        />
      ) : null}

      {personajes.length === 0 && abierto !== "nuevo" ? (
        <p className="text-[13px] text-text-muted">Todavía no hay personajes en este proyecto.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personajes.map((p) =>
            abierto === p.id ? (
              <div key={p.id} className="sm:col-span-2">
                <PersonajeForm
                  titulo={p.nombre || "Editar personaje"}
                  personaje={p}
                  identidad={identidad}
                  onSubmit={async (fd) => {
                    await onUpdate(p.id, fd);
                    setAbierto(null);
                  }}
                  onCancelar={() => setAbierto(null)}
                  onSubirFoto={async (tipo, fd) => {
                    const nuevas = await onSubirFoto(p.id, tipo, fd);
                    return nuevas.find((f) => f.tipo === tipo)?.url ?? "";
                  }}
                  onEliminarFoto={async (_tipo, url) => {
                    await onEliminarFoto(p.id, url);
                  }}
                  onSubirFotoContexto={(fd) => onSubirFotoContexto(p.id, fd)}
                  onEditarEtiquetaFotoContexto={(url, etiqueta) =>
                    onEditarEtiquetaFotoContexto(p.id, url, etiqueta)
                  }
                  onEliminarFotoContexto={(url) => onEliminarFotoContexto(p.id, url)}
                />
              </div>
            ) : (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-[15px]">{p.nombre || "Personaje sin nombre"}</div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1 text-[12.5px]"
                      onClick={() => setAbierto(p.id)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2.5 py-1 text-[12.5px]"
                      onClick={() => setConfirmEliminar(p.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
                {resumenPersonaje(p) ? (
                  <p className="mt-1.5 text-[13px] text-text-muted">{resumenPersonaje(p)}</p>
                ) : null}
                {parseFotosPersonaje(p.fotosUrlsJson).length > 0 ? (
                  <p className="mt-1.5 text-[12px] text-text-muted">
                    {parseFotosPersonaje(p.fotosUrlsJson).length} foto
                    {parseFotosPersonaje(p.fotosUrlsJson).length === 1 ? "" : "s"} de referencia
                  </p>
                ) : null}
              </Card>
            ),
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmEliminar !== null}
        onOpenChange={(open) => !open && setConfirmEliminar(null)}
        title="¿Eliminar este personaje?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => confirmEliminar && onDelete(confirmEliminar)}
      />
    </div>
  );
}

/** Tip de un campo con herencia (formalidad/humor/nivelTecnico): explica
 * de dónde sale el valor que se está usando AHORA MISMO — de la marca o
 * propio del Personaje — sin bloquear nada (el select siempre queda en
 * "Sin definir" como opción para volver a heredar). */
function tipHerencia(
  personaje: Personaje | null,
  identidad: Identidad | null,
  campo: CampoHerencia,
  tipBase: string,
): string {
  if (!personaje) return tipBase;
  const r = resolverVozPersonaje(personaje, identidad, campo);
  const origen = r.heredado
    ? r.valor
      ? `Ahora mismo usa el de la marca: "${r.valor}".`
      : "Ahora mismo no hay valor de marca definido tampoco — queda vacío."
    : "Valor propio de este Personaje (no el de la marca).";
  return `${tipBase} ${origen}`;
}

/** Los campos de cada sección nueva, ya como JSX — mismo principio que
 * `camposDeSeccion` en identidad/page.tsx: la agrupación vive en
 * `SECCIONES_PERSONAJE` (personaje-secciones.ts), acá solo se decide el
 * input de cada uno. Ningún campo se renombra en la base de datos. */
function camposDeSeccionPersonaje(seccionId: string, personaje: Personaje | null, identidad: Identidad | null) {
  const N = NIVELES_CAMPOS_PERSONAJE;
  switch (seccionId) {
    case "identidad":
      return (
        <>
          <FieldWithHelp
            label="Rol en el ecosistema"
            name="rolEcosistema"
            defaultValue={personaje?.rolEcosistema}
            opciones={ROLES_PERSONAJE}
            nivel={N.rolEcosistema}
          />
          <FieldWithHelp
            label="Lugar de origen"
            name="lugarOrigen"
            defaultValue={personaje?.lugarOrigen}
            multiline={false}
            placeholder="Ej: nació y creció en Chiloé"
            nivel={N.lugarOrigen}
          />
          <FieldWithHelp
            label="Relación con otros Personajes"
            name="relacionOtrosPersonajes"
            defaultValue={personaje?.relacionOtrosPersonajes}
            placeholder="Ej: es el mentor de Carolina, la nueva del equipo"
            nivel={N.relacionOtrosPersonajes}
          />
          <FieldWithHelp
            label="Contexto habitual"
            name="contexto"
            defaultValue={personaje?.contexto}
            tip="Dónde y en qué situación aparece típicamente."
            placeholder="Ej: siempre en obra, rodeado de materiales"
            multiline={false}
            nivel={N.contexto}
          />
          <FieldWithHelp
            label="Historia"
            name="historia"
            id="personaje-historia"
            defaultValue={personaje?.historia}
            tip="De dónde viene y por qué sabe lo que sabe — el trasfondo que lo hace creíble."
            placeholder="Ej: partió como ayudante a los 15 años en obras del sur..."
            nivel={N.historia}
          />
        </>
      );
    case "personalidad":
      return (
        <>
          <FieldWithHelp
            label="Personalidad (resumen general)"
            name="personalidad"
            defaultValue={personaje?.personalidad}
            nivel={N.personalidad}
          />
          <FieldWithHelp
            label="Temperamento"
            name="temperamento"
            defaultValue={personaje?.temperamento}
            multiline={false}
            placeholder="Ej: paciente, rara vez se altera"
            nivel={N.temperamento}
          />
          <FieldWithHelp
            label="Nivel de energía"
            name="nivelEnergia"
            defaultValue={personaje?.nivelEnergia}
            multiline={false}
            placeholder="Ej: calmado y pausado, no efusivo"
            nivel={N.nivelEnergia}
          />
          <FieldWithHelp
            label="Forma de enseñar/explicar"
            name="formaEnsenar"
            defaultValue={personaje?.formaEnsenar}
            placeholder="Ej: usa ejemplos cotidianos antes que términos técnicos"
            nivel={N.formaEnsenar}
          />
          <FieldWithHelp
            label="Forma de responder preguntas"
            name="formaResponder"
            defaultValue={personaje?.formaResponder}
            placeholder="Ej: nunca dice 'no sé' — reformula con lo que sí sabe"
            nivel={N.formaResponder}
          />
          <FieldWithHelp
            label="Emociones que transmite"
            name="emocionesTransmite"
            defaultValue={personaje?.emocionesTransmite}
            multiline={false}
            placeholder="Ej: confianza, calidez"
            nivel={N.emocionesTransmite}
          />
          <FieldWithHelp
            label="Fortalezas"
            name="fortalezas"
            defaultValue={personaje?.fortalezas}
            multiline={false}
            nivel={N.fortalezas}
          />
          <FieldWithHelp
            label="Defectos"
            name="defectos"
            defaultValue={personaje?.defectos}
            multiline={false}
            tip="Un personaje sin defectos suena falso — dale al menos uno real."
            nivel={N.defectos}
          />
          <FieldWithHelp
            label="Valores"
            name="valores"
            id="personaje-valores"
            defaultValue={personaje?.valores}
            nivel={N.valores}
          />
          <FieldWithHelp
            label="Qué nunca haría (conducta)"
            name="queNuncaHaria"
            defaultValue={personaje?.queNuncaHaria}
            tip="Comportamiento, no apariencia — para lo físico ver Elementos Invariables."
            placeholder="Ej: nunca le hablaría mal a un cliente, ni haría promesas que no puede cumplir"
            nivel={N.queNuncaHaria}
          />
        </>
      );
    case "comunicacion":
      return (
        <>
          <FieldWithHelp
            label="Voz (descripción)"
            name="vozDescrita"
            defaultValue={personaje?.vozDescrita}
            multiline={false}
            nivel={N.vozDescrita}
          />
          <CampoChips
            label="Muletillas / frases frecuentes"
            name="muletillas"
            defaultValue={personaje?.muletillas}
            placeholder="Ej: manito"
            nivel={N.muletillas}
          />
          <FieldWithHelp
            label="Acento"
            name="acento"
            defaultValue={personaje?.acento}
            multiline={false}
            placeholder="Ej: chileno del sur, marcado"
            nivel={N.acento}
          />
          <FieldWithHelp
            label="Velocidad al hablar"
            name="velocidad"
            defaultValue={personaje?.velocidad}
            multiline={false}
            placeholder="Ej: pausada, se toma su tiempo"
            nivel={N.velocidad}
          />
          <FieldWithHelp
            label="Tono"
            name="tono"
            defaultValue={personaje?.tono}
            multiline={false}
            placeholder="Ej: cálido y grave"
            nivel={N.tono}
          />
          <FieldWithHelp
            label="Volumen"
            name="volumen"
            defaultValue={personaje?.volumen}
            multiline={false}
            placeholder="Ej: medio, sin gritar nunca"
            nivel={N.volumen}
          />
          <CampoChips
            label="Palabras favoritas"
            name="palabrasFavoritas"
            defaultValue={personaje?.palabrasFavoritas}
            nivel={N.palabrasFavoritas}
          />
          <CampoChips
            label="Palabras prohibidas (para este Personaje)"
            name="palabrasProhibidas"
            defaultValue={personaje?.palabrasProhibidas}
            nivel={N.palabrasProhibidas}
          />
          <FieldWithHelp
            label="Nivel de formalidad"
            name="formalidad"
            id="personaje-formalidad"
            defaultValue={personaje?.formalidad}
            opciones={NIVELES_FORMALIDAD}
            nivel={N.formalidad}
            tip={tipHerencia(personaje, identidad, "formalidad", "Vacío = hereda el de la marca.")}
          />
          <FieldWithHelp
            label="Tipo de humor"
            name="humor"
            id="personaje-humor"
            defaultValue={personaje?.humor}
            opciones={TIPOS_HUMOR}
            nivel={N.humor}
            tip={tipHerencia(personaje, identidad, "humor", "Vacío = hereda el de la marca.")}
          />
          <FieldWithHelp
            label="Nivel técnico"
            name="nivelTecnico"
            id="personaje-nivelTecnico"
            defaultValue={personaje?.nivelTecnico}
            opciones={NIVELES_TECNICOS}
            nivel={N.nivelTecnico}
            tip={tipHerencia(personaje, identidad, "nivelTecnico", "Vacío = hereda el de la marca.")}
          />
        </>
      );
    case "apariencia":
      return (
        <>
          <FieldWithHelp
            label="Descripción física (general)"
            name="fisica"
            defaultValue={personaje?.fisica}
            nivel={N.fisica}
          />
          <FieldWithHelp
            label="Vestuario característico"
            name="vestuario"
            defaultValue={personaje?.vestuario}
            nivel={N.vestuario}
          />
          <FieldWithHelp
            label="Edad (real)"
            name="edad"
            defaultValue={personaje?.edad}
            placeholder="Ej: 58 años"
            multiline={false}
            nivel={N.edad}
          />
          <FieldWithHelp
            label="Altura"
            name="altura"
            defaultValue={personaje?.altura}
            multiline={false}
            placeholder="Ej: 1.75m"
            nivel={N.altura}
          />
          <FieldWithHelp
            label="Complexión"
            name="complexion"
            defaultValue={personaje?.complexion}
            multiline={false}
            placeholder="Ej: robusto, contextura gruesa"
            nivel={N.complexion}
          />
          <FieldWithHelp
            label="Edad aparente"
            name="edadAparente"
            defaultValue={personaje?.edadAparente}
            multiline={false}
            tip="Para prompts de imagen — puede no coincidir con la edad real."
            placeholder="Ej: aparenta unos 50"
            nivel={N.edadAparente}
          />
          <FieldWithHelp
            label="Color de piel"
            name="colorPiel"
            defaultValue={personaje?.colorPiel}
            multiline={false}
            nivel={N.colorPiel}
          />
          <FieldWithHelp
            label="Cabello"
            name="cabello"
            defaultValue={personaje?.cabello}
            multiline={false}
            placeholder="Ej: canoso, corto"
            nivel={N.cabello}
          />
          <FieldWithHelp
            label="Barba"
            name="barba"
            defaultValue={personaje?.barba}
            multiline={false}
            placeholder="Ej: candado canosa, bien recortada"
            nivel={N.barba}
          />
          <FieldWithHelp
            label="Ojos"
            name="ojos"
            defaultValue={personaje?.ojos}
            multiline={false}
            placeholder="Ej: cafés, expresivos"
            nivel={N.ojos}
          />
          <FieldWithHelp
            label="Expresiones habituales"
            name="expresionesHabituales"
            defaultValue={personaje?.expresionesHabituales}
            placeholder="Ej: sonrisa leve y constante, ceja levantada al explicar algo"
            nivel={N.expresionesHabituales}
          />
          <FieldWithHelp
            label="Postura"
            name="postura"
            defaultValue={personaje?.postura}
            multiline={false}
            placeholder="Ej: erguida, manos en la cintura al hablar"
            nivel={N.postura}
          />
          <FieldWithHelp
            label="Accesorios"
            name="accesorios"
            defaultValue={personaje?.accesorios}
            multiline={false}
            placeholder="Ej: casco amarillo, lentes de seguridad"
            nivel={N.accesorios}
          />
        </>
      );
    case "gestos":
      return (
        <>
          <FieldWithHelp label="Gestos (general)" name="gestos" defaultValue={personaje?.gestos} nivel={N.gestos} />
          <FieldWithHelp
            label="Cómo mueve las manos"
            name="gestoManos"
            defaultValue={personaje?.gestoManos}
            multiline={false}
            placeholder="Ej: gesticula mucho al explicar, palmas abiertas"
            nivel={N.gestoManos}
          />
          <FieldWithHelp
            label="Cómo mira"
            name="gestoMirada"
            defaultValue={personaje?.gestoMirada}
            multiline={false}
            placeholder="Ej: mira directo a cámara al hacer una pregunta"
            nivel={N.gestoMirada}
          />
          <FieldWithHelp
            label="Cómo sonríe"
            name="gestoSonrisa"
            defaultValue={personaje?.gestoSonrisa}
            multiline={false}
            nivel={N.gestoSonrisa}
          />
          <FieldWithHelp
            label="Cómo señala"
            name="gestoSenalar"
            defaultValue={personaje?.gestoSenalar}
            multiline={false}
            nivel={N.gestoSenalar}
          />
          <FieldWithHelp
            label="Cómo camina"
            name="formaCaminar"
            defaultValue={personaje?.formaCaminar}
            multiline={false}
            nivel={N.formaCaminar}
          />
          <FieldWithHelp
            label="Cómo está de pie"
            name="formaPararse"
            defaultValue={personaje?.formaPararse}
            multiline={false}
            nivel={N.formaPararse}
          />
          <FieldWithHelp
            label="Cómo interactúa (con objetos/personas)"
            name="formaInteractuar"
            defaultValue={personaje?.formaInteractuar}
            nivel={N.formaInteractuar}
          />
        </>
      );
    case "contexto-aparicion":
      return (
        <>
          <FieldWithHelp
            label="Herramientas que usa"
            name="herramientasQueUsa"
            defaultValue={personaje?.herramientasQueUsa}
            placeholder="Ej: nivel láser, huincha de medir"
            nivel={N.herramientasQueUsa}
          />
          <FieldWithHelp
            label="Materiales que muestra"
            name="materialesQueMuestra"
            defaultValue={personaje?.materialesQueMuestra}
            placeholder="Ej: ladrillos, cemento, planos"
            nivel={N.materialesQueMuestra}
          />
          <CampoChips
            label="Ambientes que nunca deberían aparecer"
            name="ambientesProhibidos"
            defaultValue={personaje?.ambientesProhibidos}
            placeholder="Ej: oficina corporativa"
            nivel={N.ambientesProhibidos}
          />
        </>
      );
    case "invariables":
      return (
        <CampoChips
          label="Elementos Invariables"
          name="elementosInvariables"
          defaultValue={personaje?.elementosInvariables}
          tip="Vestuario que nunca cambia + lo que jamás haría físicamente — van PRIMERO en cada prompt."
          placeholder="Ej: siempre con casco amarillo"
          nivel={N.elementosInvariables}
        />
      );
    default:
      return null;
  }
}

/** Exportado para reutilizarse tal cual desde la pantalla global
 * /personajes (creación/edición de Personajes del estudio) — no se
 * duplica. */
export function PersonajeForm({
  titulo,
  personaje,
  identidad = null,
  onSubmit,
  onCancelar,
  onSubirFoto,
  onEliminarFoto,
  onSubirFotoContexto,
  onEditarEtiquetaFotoContexto,
  onEliminarFotoContexto,
}: {
  titulo: string;
  personaje: Personaje | null;
  identidad?: Identidad | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancelar: () => void;
  onSubirFoto: (tipo: TipoFotoPersonaje, formData: FormData) => Promise<string>;
  onEliminarFoto: (tipo: TipoFotoPersonaje, url: string) => Promise<void>;
  onSubirFotoContexto?: (formData: FormData) => Promise<FotoContextoPersonaje[]>;
  onEditarEtiquetaFotoContexto?: (url: string, etiqueta: string) => Promise<FotoContextoPersonaje[]>;
  onEliminarFotoContexto?: (url: string) => Promise<FotoContextoPersonaje[]>;
}) {
  const fotosIniciales = parseFotosPersonaje(personaje?.fotosUrlsJson);
  const fotosContextoIniciales = parseFotosContextoPersonaje(personaje?.fotosContextoJson);

  return (
    <Card className="border border-accent/30 bg-accent-soft/20">
      <p className="mb-3 font-display text-[15px]">{titulo}</p>

      {personaje ? (
        <div className="mb-4">
          <MadurezBar resultado={madurezPersonajeCompleta(personaje)} titulo="Nivel de entrenamiento" />
        </div>
      ) : null}

      <form action={onSubmit}>
        <FieldWithHelp label="Nombre" name="nombre" defaultValue={personaje?.nombre} multiline={false} />

        <div className="mt-4 space-y-3">
          {SECCIONES_PERSONAJE.map((seccion) => {
            // Sin Personaje todavía (formulario de "nuevo"), completados/total
            // no se usan abajo (tieneContenido/progreso/estado ya caen a sus
            // defaults) — evita construir un Personaje falso con `as` que
            // rompería progresoSeccionPersonaje al no tener campos reales.
            const { completados, total } = personaje
              ? progresoSeccionPersonaje(personaje, seccion)
              : { completados: 0, total: seccion.campos.length };
            return (
              <SeccionColapsable
                key={seccion.id}
                titulo={seccion.titulo}
                subtitulo={seccion.subtitulo}
                tieneContenido={personaje ? completados > 0 : false}
                progreso={personaje ? `${completados}/${total}` : undefined}
                estado={personaje ? estadoSeccionPersonaje(personaje, seccion) : undefined}
              >
                {camposDeSeccionPersonaje(seccion.id, personaje, identidad)}
              </SeccionColapsable>
            );
          })}
        </div>

        <p className="mt-5 border-t border-border pt-4 text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          Prompts maestros (override manual — opcional)
        </p>
        <p className="mb-2 text-[12px] leading-snug text-text-muted/80">
          Si llenas esto a mano, se usa TAL CUAL en el contexto exportado. Si lo dejas vacío, el
          Personaje ya guardado genera uno automáticamente desde la ficha de arriba — ver
          &ldquo;Prompts Maestros Vivos&rdquo; más abajo.
        </p>
        <FieldWithHelp
          label="Prompt maestro"
          name="promptMaestro"
          defaultValue={personaje?.promptMaestro}
          placeholder="Ej: Eres Don José, maestro chileno de 58 años que explica construcción con ejemplos simples..."
        />
        <FieldWithHelp
          label="Prompt para imagen"
          name="promptImagen"
          defaultValue={personaje?.promptImagen}
          placeholder="Ej: usa las fotos de referencia; luz natural, encuadre a la altura de los ojos"
        />
        <FieldWithHelp
          label="Prompt para video"
          name="promptVideo"
          defaultValue={personaje?.promptVideo}
          placeholder="Ej: movimientos calmados, gesticula con las manos al explicar"
        />
        <FieldWithHelp
          label="Prompt para voz"
          name="promptVoz"
          defaultValue={personaje?.promptVoz}
          placeholder="Ej: voz grave, pausada, acento chileno marcado"
        />
        <FieldWithHelp
          label="Notas internas"
          name="notas"
          defaultValue={personaje?.notas}
          tip="Apuntes de trabajo — nunca se incluyen en el contexto exportado."
        />

        <div className="mt-3.5">
          <label className="mb-1 block text-[12.5px] text-text-muted">
            Fotos de referencia para IA de video (Kling/Runway/Veo — máx. 4)
          </label>
          <FotosPersonaje fotosIniciales={fotosIniciales} onSubir={onSubirFoto} onEliminar={onEliminarFoto} />
        </div>

        {personaje && onSubirFotoContexto && onEditarEtiquetaFotoContexto && onEliminarFotoContexto ? (
          <div className="mt-3.5">
            <label className="mb-1 block text-[12.5px] text-text-muted">Galería de fotos de contexto</label>
            <FotosContextoPersonaje
              fotosIniciales={fotosContextoIniciales}
              onSubir={onSubirFotoContexto}
              onEditarEtiqueta={onEditarEtiquetaFotoContexto}
              onEliminar={onEliminarFotoContexto}
            />
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <BotonGuardar texto={personaje ? "Guardar cambios" : "Crear personaje"} />
          <Button type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </form>

      {personaje ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Prompts Maestros Vivos
          </p>
          <PromptsMaestrosPersonaje personaje={personaje} identidad={identidad} />
        </div>
      ) : null}

      {personaje ? <VersionesPersonaje personaje={personaje} /> : null}
    </Card>
  );
}

/** Versiones guardadas de la ficha (solo para Personajes ya guardados) —
 * snapshots manuales de los campos de texto, restaurables. Vive FUERA del
 * <form> de edición: guardar/restaurar/eliminar versiones son acciones
 * inmediatas contra el servidor, no parte del submit del formulario. */
function VersionesPersonaje({ personaje }: { personaje: Personaje }) {
  const versiones = parseVersionesPersonaje(personaje.versionesJson);
  const [guardandoVersion, setGuardandoVersion] = useState(false);
  const [restaurar, setRestaurar] = useState<number | null>(null);
  const [eliminar, setEliminar] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function correr(accion: () => Promise<void>) {
    setError("");
    try {
      await accion();
    } catch (e) {
      setError(explicarError(e));
    }
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          Versiones guardadas
        </p>
        <Button
          type="button"
          variant="secondary"
          className="px-2.5 py-1 text-[12.5px]"
          onClick={() => setGuardandoVersion(true)}
        >
          Guardar versión actual
        </Button>
      </div>
      <p className="mt-1 text-[11.5px] text-text-muted">
        Un snapshot de la ficha de texto tal como está guardada ahora (las fotos no se versionan).
        Guarda una versión antes de un cambio grande para poder volver atrás.
      </p>

      {versiones.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5">
          {versiones.map((v, i) => (
            <li
              key={`${v.fecha}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <span className="text-[12.5px] text-text">
                {v.nombre || `Versión ${i + 1}`}
                <span className="ml-1.5 text-[11.5px] text-text-muted">
                  {formatearFechaChile(v.fecha)}
                </span>
              </span>
              <span className="flex gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-2.5 py-1 text-[12px]"
                  onClick={() => setRestaurar(i)}
                >
                  Restaurar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="px-2.5 py-1 text-[12px]"
                  onClick={() => setEliminar(i)}
                >
                  Eliminar
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}

      <PromptDialog
        open={guardandoVersion}
        onOpenChange={setGuardandoVersion}
        title="Nombre de esta versión"
        placeholder="Ej: antes del cambio de vestuario"
        onSubmit={(nombre) => correr(() => guardarVersionPersonaje(personaje.id, nombre))}
      />
      <ConfirmDialog
        open={restaurar !== null}
        onOpenChange={(open) => !open && setRestaurar(null)}
        title="¿Restaurar esta versión?"
        description="La ficha de texto vuelve a ese snapshot (las fotos no cambian). La ficha actual se pierde salvo que ya la hayas guardado como versión."
        confirmLabel="Restaurar"
        variant="primary"
        onConfirm={() => restaurar !== null && correr(() => restaurarVersionPersonaje(personaje.id, restaurar))}
      />
      <ConfirmDialog
        open={eliminar !== null}
        onOpenChange={(open) => !open && setEliminar(null)}
        title="¿Eliminar esta versión?"
        description="Solo se borra el snapshot — la ficha actual no cambia."
        confirmLabel="Eliminar"
        onConfirm={() => eliminar !== null && correr(() => eliminarVersionPersonaje(personaje.id, eliminar))}
      />
    </div>
  );
}
