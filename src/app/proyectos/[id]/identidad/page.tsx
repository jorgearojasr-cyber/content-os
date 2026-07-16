import { notFound } from "next/navigation";
import {
  completarProyectoAction,
  createConocimiento,
  deleteConocimiento,
  generarPersonajeAction,
  getActivos,
  getConocimiento,
  getIdentidad,
  subirFotoPersonaje,
  updateIdentidad,
} from "@/lib/actions";
import { Button, Card, Input, Label, SectionTitle, Textarea } from "@/components/ui";
import { FieldWithHelp } from "@/components/field-with-help";
import { FileUploader } from "@/components/file-uploader";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { parseAvatar } from "@/lib/types";
import {
  EJEMPLOS_AVATAR,
  EJEMPLOS_IDENTIDAD,
  OBJETIVO_TIP,
  OBJETIVOS_SUGERIDOS,
} from "@/lib/identidad-ejemplos";
import { IdentidadAiTools } from "./ai-tools";
import { ConocimientoLista } from "./conocimiento-lista";

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
  const boundUpdate = updateIdentidad.bind(null, proyectoId);
  const boundSubirFoto = subirFotoPersonaje.bind(null, proyectoId);
  const boundCreateConocimiento = createConocimiento.bind(null, proyectoId);
  const boundDeleteConocimiento = deleteConocimiento.bind(null, proyectoId);
  const avatar = parseAvatar(identidad.avatarJson);

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">
        Piensa en esto como entrenar a un nuevo integrante de tu equipo creativo: entre
        más detalle le des acá, mejor va a representar tu proyecto cada pieza que crees —
        de una vez, y para siempre.
      </p>

      <IdentidadAiTools
        onGenerarPersonaje={generarPersonajeAction}
        onCompletarProyecto={completarProyectoAction}
      />

      <form action={boundUpdate} className="space-y-5">
        <Card>
          <SectionTitle subtitle="La voz, las reglas y el rumbo del proyecto.">Marca</SectionTitle>
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
        </Card>

        <Card>
          <SectionTitle subtitle="Quién recibe tu contenido — mientras más real lo imagines, más preciso será cada texto.">
            Avatar del cliente ideal
          </SectionTitle>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FieldWithHelp
              label="Nombre ficticio"
              name="avatarNombreFicticio"
              defaultValue={avatar.nombreFicticio}
              multiline={false}
              {...EJEMPLOS_AVATAR.nombreFicticio}
            />
            <FieldWithHelp
              label="Edad"
              name="avatarEdad"
              defaultValue={avatar.edad}
              multiline={false}
              {...EJEMPLOS_AVATAR.edad}
            />
            <FieldWithHelp
              label="Profesión"
              name="avatarProfesion"
              defaultValue={avatar.profesion}
              multiline={false}
              {...EJEMPLOS_AVATAR.profesion}
            />
            <FieldWithHelp
              label="Nivel de conocimientos"
              name="avatarNivelConocimiento"
              defaultValue={avatar.nivelConocimiento}
              multiline={false}
              {...EJEMPLOS_AVATAR.nivelConocimiento}
            />
          </div>
          <FieldWithHelp
            label="Problemas frecuentes"
            name="avatarProblemasFrecuentes"
            defaultValue={avatar.problemasFrecuentes}
            {...EJEMPLOS_AVATAR.problemasFrecuentes}
          />
          <FieldWithHelp
            label="Objetivos"
            name="avatarObjetivos"
            defaultValue={avatar.objetivos}
            {...EJEMPLOS_AVATAR.objetivos}
          />
          <FieldWithHelp
            label="Qué teme"
            name="avatarMiedos"
            defaultValue={avatar.miedos}
            {...EJEMPLOS_AVATAR.miedos}
          />
          <FieldWithHelp
            label="Qué busca aprender"
            name="avatarQueBuscaAprender"
            defaultValue={avatar.queBuscaAprender}
            {...EJEMPLOS_AVATAR.queBuscaAprender}
          />
          <FieldWithHelp
            label="Cómo consume contenido"
            name="avatarComoConsumeContenido"
            defaultValue={avatar.comoConsumeContenido}
            {...EJEMPLOS_AVATAR.comoConsumeContenido}
          />
          <FieldWithHelp
            label="Qué lenguaje entiende mejor"
            name="avatarLenguaje"
            defaultValue={avatar.lenguaje}
            multiline={false}
            {...EJEMPLOS_AVATAR.lenguaje}
          />
        </Card>

        <Card>
          <SectionTitle subtitle="Quién aparece, si aplica. Se repite igual en cada pieza.">
            Personaje
          </SectionTitle>
          <FieldWithHelp
            label="Nombre"
            name="personajeNombre"
            defaultValue={identidad.personajeNombre}
            multiline={false}
            {...EJEMPLOS_IDENTIDAD.personajeNombre}
          />
          <FieldWithHelp
            label="Personalidad"
            name="personajePersonalidad"
            defaultValue={identidad.personajePersonalidad}
            {...EJEMPLOS_IDENTIDAD.personajePersonalidad}
          />
          <FieldWithHelp
            label="Descripción física exacta"
            name="fisica"
            defaultValue={identidad.fisica}
            {...EJEMPLOS_IDENTIDAD.fisica}
          />
          <FieldWithHelp
            label="Vestuario característico"
            name="vestuario"
            defaultValue={identidad.vestuario}
            {...EJEMPLOS_IDENTIDAD.vestuario}
          />
          <FieldWithHelp
            label="Voz (descripción)"
            name="vozDescrita"
            defaultValue={identidad.vozDescrita}
            multiline={false}
            {...EJEMPLOS_IDENTIDAD.vozDescrita}
          />
          <FieldWithHelp
            label="Gestos"
            name="gestos"
            defaultValue={identidad.gestos}
            {...EJEMPLOS_IDENTIDAD.gestos}
          />
          <FieldWithHelp
            label="Muletillas"
            name="muletillas"
            defaultValue={identidad.muletillas}
            multiline={false}
            {...EJEMPLOS_IDENTIDAD.muletillas}
          />
          <div className="mt-3.5">
            <label className="mb-1 block text-[12.5px] text-text-muted">Foto de referencia</label>
            <p className="mb-1.5 text-[12px] leading-snug text-text-muted/80">
              Sube una imagen desde tu computador, arrástrala, pégala con Ctrl+V, o usa un
              enlace público.
            </p>
            <FileUploader
              name="fotoUrl"
              defaultValue={identidad.fotoUrl}
              onUpload={boundSubirFoto}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle subtitle="Cómo se ve y se siente cada pieza.">Estilo</SectionTitle>
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
        </Card>

        <Button type="submit">Guardar identidad</Button>
      </form>

      <Card>
        <SectionTitle subtitle="Material de referencia de este proyecto — la IA lo usa cuando es relevante para el tema que estás creando.">
          Conocimiento
        </SectionTitle>
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
          <Button type="submit" className="mt-3">
            Agregar
          </Button>
        </form>
        <ConocimientoLista entradas={conocimiento} onDelete={boundDeleteConocimiento} />
      </Card>

      <Card>
        <SectionTitle subtitle="Esto es exactamente lo que el Compilador de Identidad produce ahora mismo — lo que se usará en cada generación futura, sin resumir.">
          Vista previa del Compilador
        </SectionTitle>
        <IdentidadChecklist identidad={identidad} activosCount={activos.length} />
      </Card>
    </div>
  );
}
