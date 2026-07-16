import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}>
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

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text placeholder:text-text-muted/60 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[84px] w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text placeholder:text-text-muted/60 ${props.className ?? ""}`}
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
    primary: "bg-accent text-white font-semibold hover:opacity-90",
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
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-[14px] font-medium transition-opacity hover:opacity-90";
  const styles = {
    primary: "bg-accent text-white font-semibold",
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

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10.5px] text-accent">
      {children}
    </span>
  );
}
