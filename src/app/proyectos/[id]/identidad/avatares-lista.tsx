"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { BotonGuardar } from "@/components/boton-guardar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FieldWithHelp } from "@/components/field-with-help";
import { extraerFragmento } from "@/lib/reutilizacion";
import type { Avatar } from "@/lib/types";
import { EJEMPLOS_AVATAR } from "@/lib/identidad-ejemplos";

const LARGO_RESUMEN = 80;

function resumenAvatar(a: Avatar): string {
  const primero = [a.profesion, a.problemasFrecuentes, a.objetivos].find((v) => v.trim().length > 0);
  return extraerFragmento(primero ?? "", LARGO_RESUMEN);
}

/**
 * Avatares del cliente ideal de este proyecto — lista de tarjetas, mismo
 * patrón que Personajes pero sin fotos. `nombreFicticio` hace doble uso:
 * dato de la ficha y título de la tarjeta.
 */
export function AvataresLista({
  avatares,
  onCreate,
  onUpdate,
  onDelete,
}: {
  avatares: Avatar[];
  onCreate: (formData: FormData) => Promise<{ id: string }>;
  onUpdate: (avatarId: string, formData: FormData) => Promise<void>;
  onDelete: (avatarId: string) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState<"nuevo" | string | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-text-muted">Quién recibe tu contenido.</p>
        <Button
          type="button"
          className="px-3 py-1.5 text-[12.5px]"
          onClick={() => setAbierto(abierto === "nuevo" ? null : "nuevo")}
        >
          + Nuevo avatar
        </Button>
      </div>

      {abierto === "nuevo" ? (
        <AvatarForm
          key="nuevo"
          titulo="Nuevo avatar"
          avatar={null}
          onSubmit={async (fd) => {
            await onCreate(fd);
            setAbierto(null);
          }}
          onCancelar={() => setAbierto(null)}
        />
      ) : null}

      {avatares.length === 0 && abierto !== "nuevo" ? (
        <p className="text-[13px] text-text-muted">Todavía no hay avatares en este proyecto.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {avatares.map((a) =>
            abierto === a.id ? (
              <div key={a.id} className="sm:col-span-2">
                <AvatarForm
                  titulo={a.nombreFicticio || "Editar avatar"}
                  avatar={a}
                  onSubmit={async (fd) => {
                    await onUpdate(a.id, fd);
                    setAbierto(null);
                  }}
                  onCancelar={() => setAbierto(null)}
                />
              </div>
            ) : (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-[15px]">{a.nombreFicticio || "Avatar sin nombre"}</div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2.5 py-1 text-[12.5px]"
                      onClick={() => setAbierto(a.id)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2.5 py-1 text-[12.5px]"
                      onClick={() => setConfirmEliminar(a.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
                {resumenAvatar(a) ? <p className="mt-1.5 text-[13px] text-text-muted">{resumenAvatar(a)}</p> : null}
              </Card>
            ),
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmEliminar !== null}
        onOpenChange={(open) => !open && setConfirmEliminar(null)}
        title="¿Eliminar este avatar?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => confirmEliminar && onDelete(confirmEliminar)}
      />
    </div>
  );
}

function AvatarForm({
  titulo,
  avatar,
  onSubmit,
  onCancelar,
}: {
  titulo: string;
  avatar: Avatar | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancelar: () => void;
}) {
  return (
    <Card className="border border-accent/30 bg-accent-soft/20">
      <p className="mb-3 font-display text-[15px]">{titulo}</p>
      <form action={onSubmit}>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FieldWithHelp
            label="Nombre ficticio"
            name="nombreFicticio"
            defaultValue={avatar?.nombreFicticio}
            multiline={false}
            {...EJEMPLOS_AVATAR.nombreFicticio}
          />
          <FieldWithHelp
            label="Edad"
            name="edad"
            defaultValue={avatar?.edad}
            multiline={false}
            {...EJEMPLOS_AVATAR.edad}
          />
          <FieldWithHelp
            label="Profesión"
            name="profesion"
            defaultValue={avatar?.profesion}
            multiline={false}
            {...EJEMPLOS_AVATAR.profesion}
          />
          <FieldWithHelp
            label="Nivel de conocimientos"
            name="nivelConocimiento"
            defaultValue={avatar?.nivelConocimiento}
            multiline={false}
            {...EJEMPLOS_AVATAR.nivelConocimiento}
          />
        </div>
        <FieldWithHelp
          label="Problemas frecuentes"
          name="problemasFrecuentes"
          defaultValue={avatar?.problemasFrecuentes}
          {...EJEMPLOS_AVATAR.problemasFrecuentes}
        />
        <FieldWithHelp
          label="Objetivos"
          name="objetivos"
          defaultValue={avatar?.objetivos}
          {...EJEMPLOS_AVATAR.objetivos}
        />
        <FieldWithHelp label="Qué teme" name="miedos" defaultValue={avatar?.miedos} {...EJEMPLOS_AVATAR.miedos} />
        <FieldWithHelp
          label="Qué busca aprender"
          name="queBuscaAprender"
          defaultValue={avatar?.queBuscaAprender}
          {...EJEMPLOS_AVATAR.queBuscaAprender}
        />
        <FieldWithHelp
          label="Cómo consume contenido"
          name="comoConsumeContenido"
          defaultValue={avatar?.comoConsumeContenido}
          {...EJEMPLOS_AVATAR.comoConsumeContenido}
        />
        <FieldWithHelp
          label="Qué lenguaje entiende mejor"
          name="lenguaje"
          defaultValue={avatar?.lenguaje}
          multiline={false}
          {...EJEMPLOS_AVATAR.lenguaje}
        />
        <div className="mt-4 flex gap-2">
          <BotonGuardar texto={avatar ? "Guardar cambios" : "Crear avatar"} />
          <Button type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
