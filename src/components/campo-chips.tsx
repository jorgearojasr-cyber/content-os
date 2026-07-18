"use client";

import { useState } from "react";

/**
 * Editor de lista corta como chips (palabras que siempre usa / palabras
 * prohibidas) — el valor se guarda como texto separado por coma en el
 * mismo <form> de siempre, vía un input oculto con el `name` del campo.
 * Enter o "+ Agregar" suman un chip; la × lo quita. Sin librerías nuevas.
 */
export function CampoChips({
  label,
  name,
  defaultValue = "",
  tip,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  tip?: string;
  placeholder?: string;
}) {
  const [chips, setChips] = useState<string[]>(
    defaultValue
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0),
  );
  const [borrador, setBorrador] = useState("");

  function agregar() {
    const nuevo = borrador.trim().replace(/,+$/, "");
    if (!nuevo) return;
    if (!chips.some((c) => c.toLowerCase() === nuevo.toLowerCase())) {
      setChips([...chips, nuevo]);
    }
    setBorrador("");
  }

  return (
    <div className="mt-3.5 first:mt-0">
      <label htmlFor={`chips-${name}`} className="mb-1 block text-[12.5px] text-text-muted">
        {label}
      </label>
      {tip ? <p className="mb-1.5 text-[12px] leading-snug text-text-muted/80">{tip}</p> : null}

      <input type="hidden" name={name} value={chips.join(", ")} />

      {chips.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] text-accent"
            >
              {chip}
              <button
                type="button"
                aria-label={`Quitar ${chip}`}
                onClick={() => setChips(chips.filter((c) => c !== chip))}
                className="text-[13px] leading-none hover:opacity-70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          id={`chips-${name}`}
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={(e) => {
            // Enter agrega el chip, nunca envía el formulario completo.
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder={placeholder}
          className="w-full flex-1 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[14px] text-text placeholder:text-text-muted/60"
        />
        <button
          type="button"
          onClick={agregar}
          disabled={!borrador.trim()}
          className="shrink-0 rounded-xl border border-border bg-transparent px-3 py-2 text-[13px] text-text transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}
