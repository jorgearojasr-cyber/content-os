import { notFound } from "next/navigation";
import {
  completarProyectoAction,
  createAvatar,
  createPersonaje,
  deleteAvatar,
  deletePersonaje,
  editarEtiquetaFotoContexto,
  eliminarArchivoTemporal,
  eliminarFotoContextoPersonaje,
  eliminarFotoPersonaje,
  generarPersonajeAction,
  getActivos,
  getAvatares,
  getIdentidad,
  getPersonajes,
  subirArchivoTemporal,
  subirFotoContextoPersonaje,
  subirFotoPersonaje,
  subirLogo,
  updateAvatar,
  updateIdentidad,
  updatePersonaje,
} from "@/lib/actions";
import { Card, SectionTitle } from "@/components/ui";
import { BotonGuardar } from "@/components/boton-guardar";
import { CampoChips } from "@/components/campo-chips";
import { FieldWithHelp } from "@/components/field-with-help";
import { FileUploader } from "@/components/file-uploader";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { MadurezBar } from "@/components/madurez-bar";
import { MadurezToast } from "@/components/madurez-toast";
import { PromptMaestro } from "@/components/prompt-maestro";
import { SeccionColapsable } from "@/components/seccion-colapsable";
import { identidadTieneContacto } from "@/lib/identity-compiler";
import {
  estadoSeccion,
  madurezIdentidadCompleta,
  NIVELES_CAMPOS_IDENTIDAD,
  primerCampoConContenido,
  progresoSeccion,
  SECCIONES_IDENTIDAD,
} from "@/lib/identidad-secciones";
import type { EstadoBloque } from "@/lib/madurez";
import { extraerFragmento } from "@/lib/reutilizacion";
import {
  EJEMPLOS_IDENTIDAD,
  OBJETIVO_TIP,
  OBJETIVOS_SUGERIDOS,
} from "@/lib/identidad-ejemplos";
import {
  ARQUETIPOS_MARCA,
  NIVELES_FORMALIDAD,
  NIVELES_TECNICOS,
  TIPOS_HUMOR,
} from "@/lib/types";
import type { Identidad } from "@/lib/types";
import { IdentidadAiTools } from "./ai-tools";
import { PersonajesLista } from "./personajes-lista";
import { AvataresLista } from "./avatares-lista";

const LARGO_RESUMEN = 80;

/** Los campos de cada sección, ya como JSX — la agrupación (qué campo vive
 * en qué sección) es SECCIONES_IDENTIDAD en identidad-secciones.ts; acá
 * solo se decide el input de cada uno (texto, textarea, select, chips,
 * uploader). Ningún campo existente se renombra en la base de datos. */
function camposDeSeccion(id: string, identidad: Identidad, onSubirLogo: (formData: FormData) => Promise<string>) {
  switch (id) {
    case "esencia":
      return (
        <>
          <FieldWithHelp label="Historia de la marca" name="historia" defaultValue={identidad.historia} nivel={NIVELES_CAMPOS_IDENTIDAD.historia} {...EJEMPLOS_IDENTIDAD.historia} />
          <FieldWithHelp label="Valores" name="valores" defaultValue={identidad.valores} nivel={NIVELES_CAMPOS_IDENTIDAD.valores} {...EJEMPLOS_IDENTIDAD.valores} />
          <FieldWithHelp label="Promesa de valor" name="promesa" defaultValue={identidad.promesa} multiline={false} nivel={NIVELES_CAMPOS_IDENTIDAD.promesa} {...EJEMPLOS_IDENTIDAD.promesa} />
          <FieldWithHelp label="Posicionamiento" name="posicionamiento" defaultValue={identidad.posicionamiento} multiline={false} nivel={NIVELES_CAMPOS_IDENTIDAD.posicionamiento} {...EJEMPLOS_IDENTIDAD.posicionamiento} />
          <FieldWithHelp label="Arquetipo de marca" name="arquetipo" defaultValue={identidad.arquetipo} opciones={ARQUETIPOS_MARCA} nivel={NIVELES_CAMPOS_IDENTIDAD.arquetipo} tip="El marco clásico de personalidad que cualquier IA reconoce sin explicación — elige el que más se parezca." />
          <FieldWithHelp label="Manifiesto de marca" name="manifiesto" defaultValue={identidad.manifiesto} nivel={NIVELES_CAMPOS_IDENTIDAD.manifiesto} {...EJEMPLOS_IDENTIDAD.manifiesto} />
          <FieldWithHelp
            label="Objetivo del proyecto"
            name="objetivo"
            defaultValue={identidad.objetivo}
            tip={OBJETIVO_TIP}
            placeholder="Ej: educar a mi audiencia sobre construcción"
            ejemplos={OBJETIVOS_SUGERIDOS}
            multiline={false}
            nivel={NIVELES_CAMPOS_IDENTIDAD.objetivo}
          />
          <FieldWithHelp label="Manual de marca" name="manualMarca" defaultValue={identidad.manualMarca} nivel={NIVELES_CAMPOS_IDENTIDAD.manualMarca} {...EJEMPLOS_IDENTIDAD.manualMarca} />
        </>
      );
    case "audiencia":
      return (
        <>
          <FieldWithHelp label="Audiencia (resumen general)" name="audiencia" defaultValue={identidad.audiencia} nivel={NIVELES_CAMPOS_IDENTIDAD.audiencia} {...EJEMPLOS_IDENTIDAD.audiencia} />
          <FieldWithHelp label="Emociones a transmitir" name="emociones" defaultValue={identidad.emociones} multiline={false} nivel={NIVELES_CAMPOS_IDENTIDAD.emociones} {...EJEMPLOS_IDENTIDAD.emociones} />
          <FieldWithHelp label="Qué debe pensar la persona después" name="impactoEsperado" defaultValue={identidad.impactoEsperado} nivel={NIVELES_CAMPOS_IDENTIDAD.impactoEsperado} {...EJEMPLOS_IDENTIDAD.impactoEsperado} />
          <FieldWithHelp label="Adaptación según audiencia" name="adaptacionAudiencia" defaultValue={identidad.adaptacionAudiencia} nivel={NIVELES_CAMPOS_IDENTIDAD.adaptacionAudiencia} {...EJEMPLOS_IDENTIDAD.adaptacionAudiencia} />
        </>
      );
    case "voz":
      return (
        <>
          <FieldWithHelp label="Voz y personalidad" name="voz" defaultValue={identidad.voz} nivel={NIVELES_CAMPOS_IDENTIDAD.voz} {...EJEMPLOS_IDENTIDAD.voz} />
          <FieldWithHelp label="Nivel de formalidad" name="formalidad" defaultValue={identidad.formalidad} opciones={NIVELES_FORMALIDAD} nivel={NIVELES_CAMPOS_IDENTIDAD.formalidad} tip={EJEMPLOS_IDENTIDAD.formalidad.tip} />
          <FieldWithHelp label="Tipo de humor permitido" name="humor" defaultValue={identidad.humor} opciones={TIPOS_HUMOR} nivel={NIVELES_CAMPOS_IDENTIDAD.humor} tip={EJEMPLOS_IDENTIDAD.humor.tip} />
          <FieldWithHelp label="Nivel técnico del contenido" name="nivelTecnico" defaultValue={identidad.nivelTecnico} opciones={NIVELES_TECNICOS} nivel={NIVELES_CAMPOS_IDENTIDAD.nivelTecnico} tip={EJEMPLOS_IDENTIDAD.nivelTecnico.tip} />
          <CampoChips label="Palabras y expresiones que siempre usa" name="palabrasSiempre" defaultValue={identidad.palabrasSiempre} nivel={NIVELES_CAMPOS_IDENTIDAD.palabrasSiempre} tip={EJEMPLOS_IDENTIDAD.palabrasSiempre.tip} placeholder={EJEMPLOS_IDENTIDAD.palabrasSiempre.placeholder} />
          <CampoChips label="Palabras que nunca debe usar" name="palabrasNunca" defaultValue={identidad.palabrasNunca} nivel={NIVELES_CAMPOS_IDENTIDAD.palabrasNunca} tip={EJEMPLOS_IDENTIDAD.palabrasNunca.tip} placeholder={EJEMPLOS_IDENTIDAD.palabrasNunca.placeholder} />
          <FieldWithHelp label="Frases características" name="frasesCaracteristicas" defaultValue={identidad.frasesCaracteristicas} nivel={NIVELES_CAMPOS_IDENTIDAD.frasesCaracteristicas} {...EJEMPLOS_IDENTIDAD.frasesCaracteristicas} />
        </>
      );
    case "contenido":
      return (
        <>
          <FieldWithHelp label="Estructura habitual de los contenidos" name="estructuraContenidos" defaultValue={identidad.estructuraContenidos} nivel={NIVELES_CAMPOS_IDENTIDAD.estructuraContenidos} {...EJEMPLOS_IDENTIDAD.estructuraContenidos} />
          <FieldWithHelp label="Reglas de escritura (principios editoriales)" name="reglas" defaultValue={identidad.reglas} nivel={NIVELES_CAMPOS_IDENTIDAD.reglas} {...EJEMPLOS_IDENTIDAD.reglas} />
          <FieldWithHelp label="Estructura de CTA" name="estructuraCta" defaultValue={identidad.estructuraCta} multiline={false} nivel={NIVELES_CAMPOS_IDENTIDAD.estructuraCta} {...EJEMPLOS_IDENTIDAD.estructuraCta} />
          <FieldWithHelp label="CTA habituales" name="ctaHabituales" defaultValue={identidad.ctaHabituales} nivel={NIVELES_CAMPOS_IDENTIDAD.ctaHabituales} {...EJEMPLOS_IDENTIDAD.ctaHabituales} />
          <FieldWithHelp label="Hashtags frecuentes" name="hashtagsFrecuentes" defaultValue={identidad.hashtagsFrecuentes} nivel={NIVELES_CAMPOS_IDENTIDAD.hashtagsFrecuentes} {...EJEMPLOS_IDENTIDAD.hashtagsFrecuentes} />
          <FieldWithHelp label="Cómo responder críticas y comentarios" name="respuestaCriticas" defaultValue={identidad.respuestaCriticas} nivel={NIVELES_CAMPOS_IDENTIDAD.respuestaCriticas} {...EJEMPLOS_IDENTIDAD.respuestaCriticas} />
        </>
      );
    case "visual":
      return (
        <>
          <FieldWithHelp label="Paleta de colores" name="paleta" defaultValue={identidad.paleta} multiline={false} nivel={NIVELES_CAMPOS_IDENTIDAD.paleta} {...EJEMPLOS_IDENTIDAD.paleta} />
          <FieldWithHelp label="Tipografía" name="tipografia" defaultValue={identidad.tipografia} multiline={false} nivel={NIVELES_CAMPOS_IDENTIDAD.tipografia} {...EJEMPLOS_IDENTIDAD.tipografia} />
          <FieldWithHelp label="Look visual (identidad visual resumida)" name="look" defaultValue={identidad.look} nivel={NIVELES_CAMPOS_IDENTIDAD.look} {...EJEMPLOS_IDENTIDAD.look} />
          <FieldWithHelp label="Cámara" name="camara" defaultValue={identidad.camara} multiline={false} nivel={NIVELES_CAMPOS_IDENTIDAD.camara} {...EJEMPLOS_IDENTIDAD.camara} />
          <FieldWithHelp label="Ritmo" name="ritmo" defaultValue={identidad.ritmo} multiline={false} nivel={NIVELES_CAMPOS_IDENTIDAD.ritmo} {...EJEMPLOS_IDENTIDAD.ritmo} />
          <div className="mt-3.5">
            <label className="mb-1 block text-[12.5px] text-text-muted">
              Logo
              <span className="ml-1.5 text-[10px] opacity-70" aria-hidden>
                🔵
              </span>
            </label>
            <p className="mb-1.5 text-[12px] leading-snug text-text-muted/80">
              Sube una imagen desde tu computador, arrástrala, pégala con Ctrl+V, o usa un enlace
              público.
            </p>
            <FileUploader name="logoUrl" defaultValue={identidad.logoUrl} onUpload={onSubirLogo} />
          </div>
        </>
      );
    case "limites":
      return (
        <>
          <FieldWithHelp label="Restricciones (qué jamás haría la marca)" name="restricciones" defaultValue={identidad.restricciones} nivel={NIVELES_CAMPOS_IDENTIDAD.restricciones} {...EJEMPLOS_IDENTIDAD.restricciones} />
          <FieldWithHelp label="Competidores" name="competidores" defaultValue={identidad.competidores} nivel={NIVELES_CAMPOS_IDENTIDAD.competidores} {...EJEMPLOS_IDENTIDAD.competidores} />
          <FieldWithHelp label="Diferenciadores frente a la competencia" name="diferenciadores" defaultValue={identidad.diferenciadores} nivel={NIVELES_CAMPOS_IDENTIDAD.diferenciadores} {...EJEMPLOS_IDENTIDAD.diferenciadores} />
        </>
      );
    default:
      return null;
  }
}

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
  const tieneContacto = identidadTieneContacto(identidad);
  const activosVisuales = activos
    .filter((a) => a.tipo === "foto")
    .map((a) => ({ etiqueta: a.nombre, url: a.valor }));
  const resumenPersonajes = tienePersonaje
    ? `${personajes.length} personaje${personajes.length === 1 ? "" : "s"}`
    : "";
  const resumenAvatares = tieneAvatar
    ? `${avatares.length} avatar${avatares.length === 1 ? "" : "es"}`
    : "";

  const madurez = madurezIdentidadCompleta(identidad);
  const estadoPorSeccion: Record<string, EstadoBloque> = Object.fromEntries(
    SECCIONES_IDENTIDAD.map((seccion) => [seccion.id, estadoSeccion(identidad, seccion)]),
  );
  // Solo las secciones con al menos un campo 🟢 Esencial disparan el toast
  // de refuerzo — "Visual" no tiene ninguno, así que completarla no cuenta.
  const seccionesConEsencial = SECCIONES_IDENTIDAD.filter((s) =>
    s.campos.some((c) => NIVELES_CAMPOS_IDENTIDAD[c] === "esencial"),
  ).map((s) => s.id);

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">
        Piensa en esto como entrenar a un nuevo integrante de tu equipo creativo: entre
        más detalle le des acá, mejor va a representar tu proyecto cada pieza que crees —
        de una vez, y para siempre.
      </p>

      <MadurezBar resultado={madurez} titulo="Madurez de marca" />
      <MadurezToast
        storageKey={`identidad-completos-${proyectoId}`}
        estadoPorSeccion={estadoPorSeccion}
        seccionesConEsencial={seccionesConEsencial}
        mensaje="Perfecto, ahora la IA entiende mejor cómo habla tu marca."
      />

      <IdentidadAiTools
        onCompletarProyecto={completarProyectoAction}
        onCreatePersonaje={boundCreatePersonaje}
        onCreateAvatar={boundCreateAvatar}
      />

      <form action={boundUpdate} className="space-y-5">
        {SECCIONES_IDENTIDAD.map((seccion) => {
          const { completados, total } = progresoSeccion(identidad, seccion);
          return (
            <SeccionColapsable
              key={seccion.id}
              titulo={seccion.titulo}
              subtitulo={seccion.subtitulo}
              tieneContenido={completados > 0}
              progreso={`${completados}/${total}`}
              estado={estadoPorSeccion[seccion.id]}
              resumen={extraerFragmento(primerCampoConContenido(identidad, seccion), LARGO_RESUMEN)}
            >
              {camposDeSeccion(seccion.id, identidad, boundSubirLogo)}
            </SeccionColapsable>
          );
        })}

        <SeccionColapsable
          titulo="Contacto (opcional)"
          subtitulo="Estos datos solo se incluyen en el contenido cuando tú lo actives al crear."
          tieneContenido={tieneContacto}
          resumen={extraerFragmento(
            identidad.sitioWeb || identidad.telefono || identidad.direccion,
            LARGO_RESUMEN,
          )}
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
          identidad={identidad}
          onCreate={boundCreatePersonaje}
          onUpdate={updatePersonaje}
          onDelete={deletePersonaje}
          onSubirFoto={subirFotoPersonaje}
          onEliminarFoto={eliminarFotoPersonaje}
          onSubirTemporal={subirArchivoTemporal}
          onEliminarTemporal={eliminarArchivoTemporal}
          onGenerarPersonaje={generarPersonajeAction}
          onSubirFotoContexto={subirFotoContextoPersonaje}
          onEditarEtiquetaFotoContexto={editarEtiquetaFotoContexto}
          onEliminarFotoContexto={eliminarFotoContextoPersonaje}
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
        <SectionTitle subtitle="El documento completo de tu marca, siempre actualizado — cópialo para trabajar con cualquier IA externa sin pasar por Crear.">
          Prompt Maestro de Identidad
        </SectionTitle>
        <PromptMaestro
          identidad={identidad}
          personajes={personajes}
          avatar={avatares[0] ?? null}
          activosVisuales={activosVisuales}
        />
      </Card>

      <Card>
        <SectionTitle subtitle="Estado de entrenamiento por sección del Compilador — lo mismo que ve Crear al armar el contexto.">
          Estado del Compilador
        </SectionTitle>
        <IdentidadChecklist
          identidad={identidad}
          activosCount={activosVisuales.length}
          tienePersonaje={tienePersonaje}
          tieneAvatar={tieneAvatar}
          personaje={personajes[0] ?? null}
          avatar={avatares[0] ?? null}
        />
      </Card>
    </div>
  );
}
