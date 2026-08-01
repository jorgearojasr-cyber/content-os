"use client";

import { useEffect, useRef, useState } from "react";

export function ActionMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Más acciones"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        ⋮
      </button>
      {open ? (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 z-20 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border bg-surface-2 py-1 shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ActionMenuItem({
  children,
  onSelect,
  variant = "default",
  href,
  disabled = false,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  variant?: "default" | "danger";
  href?: string;
  disabled?: boolean;
}) {
  const className = `block w-full px-3 py-2 text-left text-[13.5px] transition-colors ${
    disabled ? "cursor-not-allowed text-text-muted/50" : "hover:bg-surface"
  } ${variant === "danger" && !disabled ? "text-danger" : !disabled ? "text-text" : ""}`;
  if (href) {
    return (
      <a href={disabled ? undefined : href} className={className} aria-disabled={disabled}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={disabled ? undefined : onSelect} disabled={disabled} className={className}>
      {children}
    </button>
  );
}
