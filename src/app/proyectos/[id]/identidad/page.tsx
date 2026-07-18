import { notFound } from "next/navigation";
import {
  completarProyectoAction,
  createAvatar,
  createPersonaje,
  deleteAvatar,
  deletePersonaje,
  eliminarArchivoTemporal,
  eliminarFotoPersonaje,
  generarPersonajeAction,
  getActivos,
  getAvatares,
  getIdentidad,
  getPersonajes,
  subirArchivoTemporal,
  subirFotoPersonaje,
  subirLogo,
  updateAvatar,
  updateIdentidad,
  updatePersonaje,
} from "@/lib/actions";
import { Card, SectionTitle } from "@/components/ui";
import { BotonGuardar } from "@/components/boton-guardar";
import { FieldWithHelp } from "@/components/field-with-help";
import { FileUploader } from "@/components/file-uploader";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { SeccionColapsable } from "@/components/seccion-colapsable";
import { identidadPorSeccion, resumenPorSeccion } from "@/lib/identity-compiler";
import { extraerFragmento } from "@/lib/reutilizacion";
import {
  EJEMPLOS_IDENTIDAD,
  OBJETIVO_TIP,
  OBJETIVOS_SUGERIDOS,
} from "@/lib/identidad-ejemplos";
import { IdentidadAiTools } from "./ai-tools";
import { PersonajesLista } from "./personajes-lista";
import { AvataresLista } from "./avatares-lista";

const LARGO_RESUMEN = 80;

export default async function IdentidadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;
  const identidad = await getIdentidad(proyectoId);
  if (!identidad) notFound();

  const activos = await getActivos(proyectoId);
  const personajes = await getPersonajes(proyectoId);
  const avatares = await getAvatares(proyectoId);
  const boundUpdate = updateIdentidad.bind(null, proyectoId);
  const boundSubirLogo = subirLogo.bind(null, proyectoId);
  // Un Personaje creado desde la Identidad de un proyecto siempre es DE ESE
  // proyecto (nunca del estudio) — updatePersonaje/deletePersonaje/subirFoto/
  // eliminarFoto ya no necesitan proyectoId (personajeId es suficiente y
  // único), así que se pasan tal cual, sin bind.
  const boundCreatePersonaje = createPersonaje.bind(null, proyectoId);
  const boundCreateAvatar = createAvatar.bind(null, proyectoId);
  const boundUpdateAvatar = updateAvatar.bind(null, proyectoId);
  const boundDeleteAvatar = deleteAvatar.bind(null, proyectoId);

  const tienePersonaje = personajes.length > 0;
  const tieneAvatar = avatares.length > 0;
  const porSeccion = identidadPorSeccion(identidad, { tienePersonaje, tieneAvatar });
  const resumen = resumenPorSeccion(identidad);
  const resumenPersonajes = tienePersonaje
    ? `${personajes.length} personaje${personajes.length === 1 ? "" : "s"}`
    : "";
  const resumenAvatares = tieneAvatar
    ? `${avatares.length} avatar${avatares.length === 1 ? "" : "es"}`
    : "";

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">
        Piensa en esto como entrenar a un nuevo integrante de tu equipo creativo: entre
        más detalle le des acá, mejor va a representar tu proyecto cada pieza que crees —
        de una vez, y para siempre.
      </p>

      <IdentidadAiTools
        onCompletarProyecto={completarProyectoAction}
        onCreatePersonaje={boundCreatePersonaje}
        onCreateAvatar={boundCreateAvatar}
      />

      <form action={boundUpdate} className="space-y-5">
        <SeccionColapsable
          titulo="Marca"
          subtitulo="La voz, las reglas y el rumbo del proyecto."
          tieneContenido={porSeccion.marca}
          resumen={extraerFragmento(resumen.marca, LARGO_RESUMEN)}
        >
          <FieldWithHelp
            label="Voz y personalidad"
            name="voz"
            defaultValue={identidad.voz}
            {...EJEMPLOS_IDENTIDAD.voz}
          />
          <FieldWithHelp
            label="Reglas de escritura"
            name="reglas"
            defaultValue={identidad.reglas}
            {...EJEMPLOS_IDENTIDAD.reglas}
          />
          <FieldWithHelp
            label="Objetivo del proyecto"
            name="objetivo"
            defaultValue={identidad.objetivo}
            tip={OBJETIVO_TIP}
            placeholder="Ej: educar a mi audiencia sobre construcción"
            ejemplos={OBJETIVOS_SUGERIDOS}
            multiline={false}
          />
          <FieldWithHelp
            label="Historia de la marca"
            name="historia"
            defaultValue={identidad.historia}
            {...EJEMPLOS_IDENTIDAD.historia}
          />
          <FieldWithHelp
            label="Valores"
            name="valores"
            defaultValue={identidad.valores}
            {...EJEMPLOS_IDENTIDAD.valores}
          />
          <FieldWithHelp
            label="Audiencia (resumen general)"
            name="audiencia"
            defaultValue={identidad.audiencia}
            {...EJEMPLOS_IDENTIDAD.audiencia}
          />
          <FieldWithHelp
            label="Competidores"
            name="competidores"
            defaultValue={identidad.competidores}
            {...EJEMPLOS_IDENTIDAD.competidores}
          />
          <FieldWithHelp
            label="Manual de marca"
            name="manualMarca"
            defaultValue={identidad.manualMarca}
            {...EJEMPLOS_IDENTIDAD.manualMarca}
          />
        </SeccionColapsable>

        <SeccionColapsable
          titulo="Lineamientos de contenido"
          subtitulo="Qué decir siempre y qué evitar siempre — CTA, hashtags y restricciones."
          tieneContenido={porSeccion.lineamientos}
          resumen={extraerFragmento(resumen.lineamientos, LARGO_RESUMEN)}
        >
          <FieldWithHelp
            label="CTA habituales"
            name="ctaHabituales"
            defaultValue={identidad.ctaHabituales}
            {...EJEMPLOS_IDENTIDAD.ctaHabituales}
          />
          <FieldWithHelp
            label="Hashtags frecuentes"
            name="hashtagsFrecuentes"
            defaultValue={identidad.hashtagsFrecuentes}
            {...EJEMPLOS_IDENTIDAD.hashtagsFrecuentes}
          />
          <FieldWithHelp
            label="Restricciones (qué evitar siempre)"
            name="restricciones"
            defaultValue={identidad.restricciones}
            {...EJEMPLOS_IDENTIDAD.restricciones}
          />
        </SeccionColapsable>

        <SeccionColapsable
          titulo="Estilo"
          subtitulo="Cómo se ve y se siente cada pieza."
          tieneContenido={porSeccion.estilo}
          resumen={extraerFragmento(resumen.estilo, LARGO_RESUMEN)}
        >
          <FieldWithHelp
            label="Paleta de colores"
            name="paleta"
            defaultValue={identidad.paleta}
            multiline={false}
            {...EJEMPLOS_IDENTIDAD.paleta}
          />
          <FieldWithHelp
            label="Tipografía"
            name="tipografia"
            defaultValue={identidad.tipografia}
            multiline={false}
            {...EJEMPLOS_IDENTIDAD.tipografia}
          />
          <FieldWithHelp
            label="Look visual"
            name="look"
            defaultValue={identidad.look}
            {...EJEMPLOS_IDENTIDAD.look}
          />
          <FieldWithHelp
            label="Cámara"
            name="camara"
            defaultValue={identidad.camara}
            multiline={false}
            {...EJEMPLOS_IDENTIDAD.camara}
          />
          <FieldWithHelp
            label="Ritmo"
            name="ritmo"
            defaultValue={identidad.ritmo}
            multiline={false}
            {...EJEMPLOS_IDENTIDAD.ritmo}
          />
          <FieldWithHelp
            label="Estructura de CTA"
            name="estructuraCta"
            defaultValue={identidad.estructuraCta}
            multiline={false}
            {...EJEMPLOS_IDENTIDAD.estructuraCta}
          />
          <div className="mt-3.5">
            <label className="mb-1 block text-[12.5px] text-text-muted">Logo</label>
            <p className="mb-1.5 text-[12px] leading-snug text-text-muted/80">
              Sube una imagen desde tu computador, arrástrala, pégala con Ctrl+V, o usa un
              enlace público.
            </p>
            <FileUploader name="logoUrl" defaultValue={identidad.logoUrl} onUpload={boundSubirLogo} />
          </div>
        </SeccionColapsable>

        <SeccionColapsable
          titulo="Contacto (opcional)"
          subtitulo="Estos datos solo se incluyen en el contenido cuando tú lo actives al crear."
          tieneContenido={porSeccion.contacto}
          resumen={extraerFragmento(resumen.contacto, LARGO_RESUMEN)}
        >
          <FieldWithHelp
            label="Sitio web"
            name="sitioWeb"
            defaultValue={identidad.sitioWeb}
            placeholder="Ej: www.obrabien.cl"
            multiline={false}
          />
          <FieldWithHelp
            label="Teléfono"
            name="telefono"
            defaultValue={identidad.telefono}
            placeholder="Ej: +56 9 1234 5678"
            multiline={false}
          />
          <FieldWithHelp
            label="Dirección"
            name="direccion"
            defaultValue={identidad.direccion}
            placeholder="Ej: Av. Siempre Viva 123, Santiago"
            multiline={false}
          />
        </SeccionColapsable>

        <div className="sticky bottom-4 z-10 flex justify-center sm:justify-start">
          <div className="rounded-xl bg-surface p-1.5 shadow-[var(--shadow-card)]">
            <BotonGuardar texto="Guardar identidad" />
          </div>
        </div>
      </form>

      <SeccionColapsable
        titulo="Personajes"
        subtitulo="Quién aparece, si aplica. Un proyecto puede tener varios — eliges cuál usar al crear."
        tieneContenido={tienePersonaje}
        resumen={resumenPersonajes}
      >
        <PersonajesLista
          personajes={personajes}
          onCreate={boundCreatePersonaje}
          onUpdate={updatePersonaje}
          onDelete={deletePersonaje}
          onSubirFoto={subirFotoPersonaje}
          onEliminarFoto={eliminarFotoPersonaje}
          onSubirTemporal={subirArchivoTemporal}
          onEliminarTemporal={eliminarArchivoTemporal}
          onGenerarPersonaje={generarPersonajeAction}
        />
      </SeccionColapsable>

      <SeccionColapsable
        titulo="Avatares del cliente ideal"
        subtitulo="Quién recibe tu contenido. Un proyecto puede tener varios — eliges cuál usar al crear."
        tieneContenido={tieneAvatar}
        resumen={resumenAvatares}
      >
        <AvataresLista
          avatares={avatares}
          onCreate={boundCreateAvatar}
          onUpdate={boundUpdateAvatar}
          onDelete={boundDeleteAvatar}
        />
      </SeccionColapsable>

      <Card>
        <SectionTitle subtitle="Esto es exactamente lo que el Compilador de Identidad produce ahora mismo — lo que se usará en cada generación futura, sin resumir.">
          Vista previa del Compilador
        </SectionTitle>
        <IdentidadChecklist
          identidad={identidad}
          activosCount={activos.filter((a) => a.tipo === "foto").length}
          tienePersonaje={tienePersonaje}
          tieneAvatar={tieneAvatar}
          personaje={personajes[0] ?? null}
          avatar={avatares[0] ?? null}
        />
      </Card>
    </div>
  );
}
