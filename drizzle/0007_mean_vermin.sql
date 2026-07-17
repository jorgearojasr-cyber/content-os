ALTER TABLE "notas" ADD COLUMN "estado" text DEFAULT 'pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE "notas" ADD COLUMN "bloque_id" text;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_bloque_id_bloques_id_fk" FOREIGN KEY ("bloque_id") REFERENCES "public"."bloques"("id") ON DELETE set null ON UPDATE no action;