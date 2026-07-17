import Link from "next/link";
import { getTodosLosPersonajes } from "@/lib/actions";
import { Card, Chip, Empty } from "@/components/ui";
import { extraerFragmento } from "@/lib/reutilizacion";
import { urlImagenVisible } from "@/lib/imagen-url";
import { parseFotosPersonaje } from "@/lib/types";

// Lee personajes reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

const LARGO_RESUMEN = 90;

function resumenPersonaje(p: { personalidad: string; fisica: string; vestuario: string; vozDescrita: string }): string {
  const primero = [p.personalidad, p.fisica, p.vestuario, p.vozDescrita].find((v) => v.trim().length > 0);
  return extraerFragmento(primero ?? "", LARGO_RESUMEN);
}

export default async function PersonajesPage() {
  const personajes = await getTodosLosPersonajes();

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Estudio Creativo JR
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Personajes</h1>
        <p className="mt-1 text-sm text-text-muted">
          Todos los personajes de todos tus proyectos, en un solo lugar.
        </p>
      </header>

      {personajes.length === 0 ? (
        <Empty title="Todavía no hay personajes">
          Crea el primero desde la Identidad de un proyecto — aparecerá aquí automáticamente.
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personajes.map((p) => {
            const foto = parseFotosPersonaje(p.fotosUrlsJson).at(0);
            const resumen = resumenPersonaje(p);
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Chip>{p.proyectoNombre}</Chip>
                    <div className="mt-1.5 font-display text-[16px]">
                      {p.nombre || "Personaje sin nombre"}
                    </div>
                  </div>
                  <Link
                    href={`/proyectos/${p.proyectoId}/identidad`}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-transparent px-2.5 py-1 text-[12.5px] text-text transition-opacity hover:bg-surface-2"
                  >
                    Editar
                  </Link>
                </div>
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlImagenVisible(foto)}
                    alt={p.nombre || "Personaje"}
                    className="mt-2 h-32 w-full rounded-lg object-cover"
                  />
                ) : null}
                {resumen ? <p className="mt-2 text-[13px] text-text-muted">{resumen}</p> : null}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
