import Link from "next/link";
import {
  getActivos,
  getBloques,
  getBloquesArchivados,
  getPapelera,
  getPersonajes,
  getPersonajesDelEstudio,
  getProyectos,
} from "@/lib/actions";
import { Empty, SectionTitle } from "@/components/ui";
import { personajesPorId } from "@/lib/types";
import { BibliotecaLista } from "./biblioteca-lista";

type Vista = "activos" | "archivados" | "papelera";

const TABS: { value: Vista; label: string }[] = [
  { value: "activos", label: "Biblioteca" },
  { value: "archivados", label: "Archivados" },
  { value: "papelera", label: "Papelera" },
];

const MENSAJE_VACIO: Record<Vista, { titulo: string; texto: string }> = {
  activos: {
    titulo: "Todavía no hay nada guardado",
    texto: "Ve a la pestaña Crear y guarda tu primera pieza — aparecerá aquí.",
  },
  archivados: {
    titulo: "No hay bloques archivados",
    texto: "Los bloques que archives desde la Biblioteca aparecerán aquí.",
  },
  papelera: {
    titulo: "La papelera está vacía",
    texto: "El contenido que elimines se guarda aquí durante 7 días antes de borrarse para siempre.",
  },
};

export default async function BibliotecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { id: proyectoId } = await params;
  const { vista: vistaParam } = await searchParams;
  const vista: Vista =
    vistaParam === "archivados" || vistaParam === "papelera" ? vistaParam : "activos";

  const [bloques, proyectos, personajes, personajesEstudio, activosDelProyecto] = await Promise.all([
    vista === "activos"
      ? getBloques(proyectoId)
      : vista === "archivados"
        ? getBloquesArchivados(proyectoId)
        : getPapelera(proyectoId),
    getProyectos(),
    getPersonajes(proyectoId),
    getPersonajesDelEstudio(),
    getActivos(proyectoId),
  ]);

  const otrosProyectos = proyectos
    .filter((p) => p.id !== proyectoId)
    .map((p) => ({ id: p.id, nombre: p.nombre }));
  const personajePorId = personajesPorId([...personajes, ...personajesEstudio]);
  // Etiqueta -> URL de cada foto de lugar (Activo tipo "foto") — para que la
  // guía de producción pueda mostrar la foto real cuando una escena la usó
  // como referencia (`escena.activoReferenciado`).
  const activoFotoPorEtiqueta = Object.fromEntries(
    activosDelProyecto.filter((a) => a.tipo === "foto").map((a) => [a.nombre, a.valor]),
  );

  return (
    <div className="space-y-4">
      <SectionTitle subtitle="Todo lo que has guardado para este proyecto.">Biblioteca</SectionTitle>

      <div className="flex gap-1 overflow-x-auto rounded-[10px] border border-border bg-surface p-1">
        {TABS.map((tab) => {
          const href =
            tab.value === "activos"
              ? `/proyectos/${proyectoId}/biblioteca`
              : `/proyectos/${proyectoId}/biblioteca?vista=${tab.value}`;
          const active = vista === tab.value;
          return (
            <Link
              key={tab.value}
              href={href}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-[13px] transition-colors ${
                active
                  ? "bg-surface-2 text-text border border-border"
                  : "border border-transparent text-text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {bloques.length === 0 ? (
        <Empty title={MENSAJE_VACIO[vista].titulo}>{MENSAJE_VACIO[vista].texto}</Empty>
      ) : (
        <BibliotecaLista
          proyectoId={proyectoId}
          vista={vista}
          bloques={bloques}
          otrosProyectos={otrosProyectos}
          personajePorId={personajePorId}
          activoFotoPorEtiqueta={activoFotoPorEtiqueta}
        />
      )}
    </div>
  );
}
