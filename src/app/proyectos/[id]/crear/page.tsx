import Link from "next/link";

// Crear contenido pasó a ser un único flujo desde "Hoy" (UX Migration 1).
// Esta pantalla deja de mostrar su formulario propio — `createBloque` y
// `CrearPiezaForm` siguen existiendo como respaldo, sin UI visible acá.
export default function CrearPage() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-[13px] text-text-muted">
      Crear contenido ahora se hace desde{" "}
      <Link href="/" className="font-semibold text-accent underline">
        Hoy
      </Link>
      , el punto de entrada único de Content OS.
    </div>
  );
}
