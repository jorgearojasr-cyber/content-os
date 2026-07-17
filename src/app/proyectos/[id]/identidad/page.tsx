import { notFound } from "next/navigation";
import {
  completarProyectoAction,
  createAvatar,
  createConocimiento,
  createPersonaje,
  deleteAvatar,
  deleteConocimiento,
  deletePersonaje,
  eliminarArchivoTemporal,
  eliminarFotoPersonaje,
  generarPersonajeAction,
  getActivos,
  getAvatares,
  getConocimiento,
  getIdentidad,
  getPersonajes,
  subirArchivoTemporal,
  subirFotoPersonaje,
  subirLogo,
  updateAvatar,
  updateIdentidad,
  updatePersonaje,
} from "@/lib/actions";
import { Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
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
import { ConocimientoLista } from "./conocimiento-lista";
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
  const conocimiento = await getConocimiento(proyectoId);
  const personajes = await getPersonajes(proyectoId);
  const avatares = await getAvatares(proyectoId);
  const boundUpdate = updateIdentidad.bind(null, proyectoId);
  const boundSubirLogo = subirLogo.bind(null, proyectoId);
  const boundCreateConocimiento = createConocimiento.bind(null, proyectoId);
  const boundDeleteConocimiento = deleteConocimiento.bind(null, proyectoId);
  const boundCreatePersonaje = createPersonaje.bind(null, proyectoId);
  const boundUpdatePersonaje = updatePersonaje.bind(null, proyectoId);
  const boundDeletePersonaje = deletePersonaje.bind(null, proyectoId);
  const boundSubirFotoPersonaje = subirFotoPersonaje.bind(null, proyectoId);
  const boundEliminarFotoPersonaje = eliminarFotoPersonaje.bind(null, proyectoId);
  const boundCreateAvatar = createAvatar.bind(null, proyectoId);
  const boundUpdateAvatar = updateAvatar.bind(null, proyectoId);
  const boundDeleteAvatar = deleteAvatar.bind(null, proyectoId);

  const tienePersonaje = personajes.length > 0;
  const tieneAvatar = avatares.length > 0;
  const porSeccion = identidadPorSeccion(identidad, { tienePersonaje, tieneAvatar });
  const resumen = resumenPorSeccion(identidad);
  const tieneConocimiento = conocimiento.length > 0;
  const resumenConocimiento = tieneConocimiento
    ? `${conocimiento.length} entrada${conocimiento.length === 1 ? "" : "s"}`
    : "";
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
          onUpdate={boundUpdatePersonaje}
          onDelete={boundDeletePersonaje}
          onSubirFoto={boundSubirFotoPersonaje}
          onEliminarFoto={boundEliminarFotoPersonaje}
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

      <SeccionColapsable
        titulo="Conocimiento"
        subtitulo="Material de referencia de este proyecto — la IA lo usa cuando es relevante para el tema que estás creando."
        tieneContenido={tieneConocimiento}
        resumen={resumenConocimiento}
      >
        <form action={boundCreateConocimiento} className="mb-4 border-b border-border pb-4">
          <Label htmlFor="conocimientoTitulo">Título</Label>
          <Input
            id="conocimientoTitulo"
            name="titulo"
            placeholder="Ej: Normativa chilena de radieres"
            required
          />
          <Label htmlFor="conocimientoContenido">Contenido</Label>
          <Textarea
            id="conocimientoContenido"
            name="contenido"
            placeholder="Pega o escribe el contenido de referencia"
            className="min-h-[100px]"
            required
          />
          <BotonGuardar texto="Agregar" textoConfirmado="Agregado ✓" className="mt-3" />
        </form>
        <ConocimientoLista entradas={conocimiento} onDelete={boundDeleteConocimiento} />
      </SeccionColapsable>

      <Card>
        <SectionTitle subtitle="Esto es exactamente lo que el Compilador de Identidad produce ahora mismo — lo que se usará en cada generación futura, sin resumir.">
          Vista previa del Compilador
        </SectionTitle>
        <IdentidadChecklist
          identidad={identidad}
          activosCount={activos.length}
          tienePersonaje={tienePersonaje}
          tieneAvatar={tieneAvatar}
          personaje={personajes[0] ?? null}
          avatar={avatares[0] ?? null}
        />
      </Card>
    </div>
  );
}
