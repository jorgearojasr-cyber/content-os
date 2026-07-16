"use client";

import { useState } from "react";
import { Button } from "./ui";

function Overlay({
  onOpenChange,
  children,
}: {
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-[380px] rounded-[10px] border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  variant = "danger",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <Overlay onOpenChange={onOpenChange}>
      <p className="font-display text-[16px]">{title}</p>
      {description ? <p className="mt-1.5 text-[13.5px] text-text-muted">{description}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Overlay>
  );
}

export function PromptDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
}) {
  // Se monta desde cero cada vez que se abre, para que el valor inicial
  // parta siempre de `defaultValue` sin depender de un useEffect.
  if (!props.open) return null;
  return <PromptDialogContent {...props} />;
}

function PromptDialogContent({
  onOpenChange,
  title,
  defaultValue = "",
  placeholder,
  onSubmit,
}: {
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Overlay onOpenChange={onOpenChange}>
      <p className="font-display text-[16px]">{title}</p>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14px] text-text placeholder:text-text-muted/60"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!value.trim()}
          onClick={() => {
            onSubmit(value.trim());
            onOpenChange(false);
          }}
        >
          Guardar
        </Button>
      </div>
    </Overlay>
  );
}

export function SelectDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: { value: string; label: string }[];
  onSubmit: (value: string) => void;
}) {
  // Se monta desde cero cada vez que se abre, para que la selección
  // inicial parta siempre de la primera opción sin depender de un
  // useEffect.
  if (!props.open) return null;
  return <SelectDialogContent {...props} />;
}

function SelectDialogContent({
  onOpenChange,
  title,
  options,
  onSubmit,
}: {
  onOpenChange: (open: boolean) => void;
  title: string;
  options: { value: string; label: string }[];
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(options[0]?.value ?? "");

  return (
    <Overlay onOpenChange={onOpenChange}>
      <p className="font-display text-[16px]">{title}</p>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[14px] text-text"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!value}
          onClick={() => {
            onSubmit(value);
            onOpenChange(false);
          }}
        >
          Mover
        </Button>
      </div>
    </Overlay>
  );
}
