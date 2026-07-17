import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buscarContenidoRelacionado,
  createBloque,
  generarContenidoAction,
  getActivos,
  getAvatares,
  getBloques,
  getIdentidad,
  getPersonajes,
  getPersonajesDelEstudio,
  inferirConfiguracionAction,
} from "@/lib/actions";
import { identityHasContent } from "@/lib/identity-compiler";
import { Card, SectionTitle } from "@/components/ui";
import { IdentidadChecklist } from "@/components/identidad-checklist";
import { formatearFechaChile } from "@/lib/fecha";
import { urlImagenVisible } from "@/lib/imagen-url";
import { extraerFragmento } from "@/lib/reutilizacion";
import { iconoFormato, parseFotosPersonaje } from "@/lib/types";
import { CrearModos } from "./crear-modos";

export default async function CrearPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: proyectoId } = await params;
  const identidad = await getIdentidad(proyectoId);
  if (!identidad) notFound();

  const activos = await getActivos(proyectoId);
  const personajes = await getPersonajes(proyectoId);
  const personajesEstudio = await getPersonajesDelEstudio();
  const avatares = await getAvatares(proyectoId);
  const bloquesRecientes = (await getBloques(proyectoId)).slice(0, 3);
  const boundInferir = inferirConfiguracionAction.bind(null, proyectoId);
  const boundGenerar = generarContenidoAction.bind(null, proyectoId);
  const boundCreate = createBloque.bind(null, proyectoId);
  const tieneIdentidad = identityHasContent(identidad, {
    tienePersonaje: personajes.length > 0,
    tieneAvatar: avatares.length > 0,
  });

  // "El" Personaje del proyecto para mostrar en Identidad activa — no
  // existe un concepto de "predeterminado" en el modelo, así que se usa el
  // mismo criterio que el resto de la app: el más reciente. Solo se
  // muestra con foto real si tiene al menos una cargada.
  const personajeDestacado = personajes[0] ?? null;
  const fotoPersonajeDestacado = personajeDestacado
    ? (parseFotosPersonaje(personajeDestacado.fotosUrlsJson)[0] ?? null)
    : null;

  return (
    <div className="space-y-5">
      {!tieneIdentidad ? (
        <p className="rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-3 text-[13px] text-text">
          Sin Identidad completa, el contenido será más genérico —{" "}
          <Link href={`/proyectos/${proyectoId}/identidad`} className="font-semibold text-accent underline">
            Completar Identidad
          </Link>
        </p>
      ) : null}

      <CrearModos
        proyectoId={proyectoId}
        identidad={identidad}
        personajes={personajes}
        personajesEstudio={personajesEstudio}
        avatares={avatares}
        onInferir={boundInferir}
        onGenerar={boundGenerar}
        onGuardar={boundCreate}
        onBuscarRelacionado={buscarContenidoRelacionado}
      />

      <Card>
        <SectionTitle subtitle="Lo que el Compilador de Identidad tiene guardado para este proyecto ahora mismo — esto es lo que la IA usa automáticamente, sin que tengas que volver a seleccionarlo.">
          Identidad activa
        </SectionTitle>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {personajeDestacado && fotoPersonajeDestacado ? (
            <div className="flex items-start gap-3 sm:w-[45%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlImagenVisible(fotoPersonajeDestacado)}
                alt={personajeDestacado.nombre || "Personaje"}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="font-display text-[15px]">
                  {personajeDestacado.nombre || "Personaje sin nombre"}
                </p>
                {personajeDestacado.personalidad ? (
                  <p className="mt-0.5 text-[12.5px] text-text-muted">
                    {extraerFragmento(personajeDestacado.personalidad, 90)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex-1">
            <IdentidadChecklist
              identidad={identidad}
              activosCount={activos.length}
              tienePersonaje={personajes.length > 0}
              tieneAvatar={avatares.length > 0}
              personaje={personajes[0] ?? null}
              avatar={avatares[0] ?? null}
            />
          </div>
        </div>
      </Card>

      {bloquesRecientes.length > 0 ? (
        <Card>
          <SectionTitle>Contenido reciente de este proyecto</SectionTitle>
          <div className="space-y-1.5">
            {bloquesRecientes.map((bloque) => (
              <Link
                key={bloque.id}
                href={`/proyectos/${proyectoId}/biblioteca/${bloque.id}/editar`}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-accent/50"
              >
                <span className="text-[18px] leading-none">{iconoFormato(bloque.formato)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-text">{bloque.titulo}</p>
                  <p className="mt-0.5 text-[11.5px] text-text-muted">
                    {formatearFechaChile(bloque.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
