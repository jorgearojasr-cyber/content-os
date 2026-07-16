import { createNota, deleteNota, getNotas, getProyectos, vincularNota } from "@/lib/actions";
import { Button, Card, SectionTitle, Textarea } from "@/components/ui";
import { SegundoCerebroLista } from "./segundo-cerebro-lista";

// Lee notas reales de la base de datos en cada visita.
export const dynamic = "force-dynamic";

export default async function SegundoCerebroPage() {
  const [notas, proyectos] = await Promise.all([getNotas(), getProyectos()]);

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 sm:py-8">
      <header className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">
          Content OS
        </div>
        <h1 className="font-display text-2xl font-normal tracking-wide">Segundo Cerebro</h1>
        <p className="mt-1 text-sm text-text-muted">
          Anota ideas sueltas sin fricción — vincúlalas a un proyecto cuando quieras, o déjalas
          sueltas hasta entonces.
        </p>
      </header>

      <Card className="mb-5">
        <SectionTitle>Nueva idea</SectionTitle>
        <form action={createNota}>
          <Textarea
            name="texto"
            placeholder="Escribe lo que se te ocurra — no hace falta nada más."
            className="min-h-[90px]"
            required
          />
          <Button type="submit" className="mt-3">
            Guardar idea
          </Button>
        </form>
      </Card>

      <SegundoCerebroLista
        notas={notas}
        proyectos={proyectos}
        onVincular={vincularNota}
        onDelete={deleteNota}
      />
    </main>
  );
}
