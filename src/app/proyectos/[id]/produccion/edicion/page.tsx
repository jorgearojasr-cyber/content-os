import { getBloques } from "@/lib/actions";
import { Card, Empty, SectionTitle } from "@/components/ui";

/** No reconstruye el Plan de Edición — enlaza directo a la página de cada
 * pieza en Biblioteca, donde `PlanEdicionPanel` ya vive tal cual. */
export default async function EdicionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = await params;
  const bloques = await getBloques(proyectoId);

  return (
    <Card>
      <SectionTitle subtitle="El Plan de Edición de cada pieza vive en su página de Biblioteca — elige una para abrirlo.">
        Edición
      </SectionTitle>
      {bloques.length === 0 ? (
        <Empty title="Todavía no hay piezas guardadas">
          Guarda una pieza en Biblioteca para poder generar su Plan de Edición.
        </Empty>
      ) : (
        <ul className="space-y-1.5">
          {bloques.map((b) => (
            <li key={b.id}>
              <a
                href={`/proyectos/${proyectoId}/biblioteca/${b.id}/editar`}
                className="block rounded-lg border border-border px-3 py-2.5 text-[13.5px] text-text transition-colors hover:bg-surface-2"
              >
                {b.titulo || "Pieza sin título"}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
