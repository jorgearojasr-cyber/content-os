CREATE TABLE "avatares" (
	"id" text PRIMARY KEY NOT NULL,
	"proyecto_id" text NOT NULL,
	"nombre_ficticio" text DEFAULT '' NOT NULL,
	"edad" text DEFAULT '' NOT NULL,
	"profesion" text DEFAULT '' NOT NULL,
	"nivel_conocimiento" text DEFAULT '' NOT NULL,
	"problemas_frecuentes" text DEFAULT '' NOT NULL,
	"objetivos" text DEFAULT '' NOT NULL,
	"miedos" text DEFAULT '' NOT NULL,
	"que_busca_aprender" text DEFAULT '' NOT NULL,
	"como_consume_contenido" text DEFAULT '' NOT NULL,
	"lenguaje" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personajes" (
	"id" text PRIMARY KEY NOT NULL,
	"proyecto_id" text NOT NULL,
	"nombre" text DEFAULT '' NOT NULL,
	"personalidad" text DEFAULT '' NOT NULL,
	"fisica" text DEFAULT '' NOT NULL,
	"vestuario" text DEFAULT '' NOT NULL,
	"voz_descrita" text DEFAULT '' NOT NULL,
	"gestos" text DEFAULT '' NOT NULL,
	"muletillas" text DEFAULT '' NOT NULL,
	"fotos_urls_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bloques" ADD COLUMN "personaje_id" text;--> statement-breakpoint
ALTER TABLE "avatares" ADD CONSTRAINT "avatares_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personajes" ADD CONSTRAINT "personajes_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloques" ADD CONSTRAINT "bloques_personaje_id_personajes_id_fk" FOREIGN KEY ("personaje_id") REFERENCES "public"."personajes"("id") ON DELETE set null ON UPDATE no action;