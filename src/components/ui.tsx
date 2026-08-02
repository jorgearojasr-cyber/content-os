import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Card({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg sm:text-xl font-normal tracking-wide">{children}</h2>
      {subtitle ? <p className="mt-1 text-sm text-text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 mt-3.5 block text-[12.5px] text-text-muted first:mt-0">
      {children}
    </label>
  );
}

/**
 * `sugerido` — lenguaje visual único para "esto lo propuso el Decision
 * Engine y el usuario todavía no lo tocó" (UX-MIGRATION — Decision Engine
 * Visual Language). Borde + fondo ámbar (mismo tono que ya usa `Chip`
 * para "seleccionado") en vez de una leyenda de texto: el origen del dato
 * se entiende de un vistazo, no leyendo. Vive en el componente, no en
 * clases sueltas por campo, para que sea la única implementación de este
 * estado en toda la app.
 */
export function Input({
  sugerido,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { sugerido?: boolean }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border px-3.5 py-3 text-[14.5px] text-text placeholder:text-text-muted/60 ${
        sugerido ? "border-accent bg-accent-soft" : "border-border bg-surface-2"
      } ${className}`}
    />
  );
}

/** `sugerido` — mismo tratamiento ámbar que `Input` (ver comentario
 * arriba), extendido a Textarea para los prompts de Imagen/Video
 * pre-armados por el compilador determinista de escena. */
export function Textarea({
  sugerido,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { sugerido?: boolean }) {
  return (
    <textarea
      {...props}
      className={`min-h-[84px] w-full rounded-xl border px-3.5 py-3 text-[14.5px] text-text placeholder:text-text-muted/60 ${
        sugerido ? "border-accent bg-accent-soft" : "border-border bg-surface-2"
      } ${className}`}
    />
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-[14px] font-medium transition-opacity disabled:opacity-50";
  const styles = {
    primary: "bg-accent text-text font-semibold hover:bg-accent-hover",
    secondary: "border border-border bg-transparent text-text hover:bg-surface-2",
    danger: "border border-border bg-transparent text-danger hover:bg-surface-2",
  } as const;
  return <button {...props} className={`${base} ${styles[variant]} ${className}`} />;
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-[14px] font-medium transition-colors";
  const styles = {
    primary: "bg-accent text-text font-semibold hover:bg-accent-hover",
    secondary: "border border-border bg-transparent text-text hover:bg-surface-2",
  } as const;
  return (
    <a href={href} className={`${base} ${styles[variant]}`}>
      {children}
    </a>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-7 text-center text-sm text-text-muted">
      <strong className="mb-1.5 block font-display text-base font-normal text-text">{title}</strong>
      {children}
    </div>
  );
}

export function Chip({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "neutral";
}) {
  const styles = {
    default: "bg-accent-soft text-accent",
    neutral: "border border-dashed border-border bg-transparent text-text-muted",
  } as const;
  return (
    <span className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] ${styles[variant]}`}>{children}</span>
  );
}
