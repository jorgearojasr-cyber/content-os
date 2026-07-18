"use client";

import { Input, Textarea } from "./ui";

export function FieldWithHelp({
  label,
  name,
  defaultValue,
  tip,
  placeholder,
  ejemplos,
  opciones,
  multiline = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  tip?: string;
  placeholder?: string;
  ejemplos?: readonly string[];
  /** Con opciones, el campo es un <select> de valores fijos (escalas como
   * formalidad/nivel técnico funcionan mejor así que como texto libre) —
   * siempre con "Sin definir" ("") como primera opción. */
  opciones?: readonly string[];
  multiline?: boolean;
}) {
  const id = name;
  const Campo = multiline ? Textarea : Input;

  return (
    <div className="mt-3.5 first:mt-0">
      <label htmlFor={id} className="mb-1 block text-[12.5px] text-text-muted">
        {label}
      </label>
      {tip ? <p className="mb-1.5 text-[12px] leading-snug text-text-muted/80">{tip}</p> : null}
      {opciones ? (
        <select
          id={id}
          name={name}
          defaultValue={defaultValue ?? ""}
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14.5px] text-text"
        >
          <option value="">— Sin definir —</option>
          {opciones.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      ) : (
        <Campo id={id} name={name} defaultValue={defaultValue} placeholder={placeholder} />
      )}
      {ejemplos && ejemplos.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ejemplos.map((ejemplo) => (
            <button
              key={ejemplo}
              type="button"
              onClick={() => {
                const el = document.getElementById(id) as
                  | HTMLInputElement
                  | HTMLTextAreaElement
                  | null;
                if (el) {
                  el.value = ejemplo;
                  el.focus();
                }
              }}
              className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11.5px] text-text-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              + {ejemplo.length > 44 ? `${ejemplo.slice(0, 44)}…` : ejemplo}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
