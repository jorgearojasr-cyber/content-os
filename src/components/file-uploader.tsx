"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "./ui";
import { explicarError } from "@/lib/errores";

const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024;

export function FileUploader({
  name,
  defaultValue = "",
  onUpload,
  label = "Arrastra una imagen, pégala (Ctrl+V) o haz clic para elegir un archivo",
}: {
  name: string;
  defaultValue?: string;
  onUpload: (formData: FormData) => Promise<string>;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function subir(file: File) {
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Solo se pueden subir imágenes.");
      return;
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
      setError("El archivo supera los 15 MB permitidos.");
      return;
    }

    const fd = new FormData();
    fd.set("foto", file);
    startTransition(async () => {
      try {
        const url = await onUpload(fd);
        setValue(url);
      } catch (e) {
        setError(explicarError(e));
      }
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) subir(file);
        }}
        onPaste={(e) => {
          const file = e.clipboardData.files[0];
          if (file) subir(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-5 text-center text-[13px] text-text-muted transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
          dragOver ? "border-accent bg-accent-soft" : "border-border hover:border-accent/50"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Vista previa" className="h-24 w-24 rounded-lg object-cover" />
        ) : null}
        <span>{pending ? "Subiendo…" : label}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) subir(file);
            e.target.value = "";
          }}
        />
      </div>
      {error ? <p className="mt-1.5 text-[12.5px] text-danger">{error}</p> : null}
      <Input
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="O pega el enlace público a una foto"
        className="mt-2"
      />
    </div>
  );
}
