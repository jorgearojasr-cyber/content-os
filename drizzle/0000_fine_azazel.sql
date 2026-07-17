CREATE TABLE "activos" (
	"id" text PRIMARY KEY NOT NULL,
	"proyecto_id" text NOT NULL,
	"tipo" text NOT NULL,
	"nombre" text NOT NULL,
	"valor" text DEFAULT '' NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bloques" (
	"id" text PRIMARY KEY NOT NULL,
	"proyecto_id" text NOT NULL,
	"titulo" text NOT NULL,
	"formato" text DEFAULT 'manual' NOT NULL,
	"texto" text NOT NULL,
	"identidad_compilada" text DEFAULT '' NOT NULL,
	"estado" text DEFAULT 'activo' NOT NULL,
	"eliminado_at" text DEFAULT '' NOT NULL,
	"escenas_json" jsonb,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conocimiento" (
	"id" text PRIMARY KEY NOT NULL,
	"proyecto_id" text NOT NULL,
	"titulo" text NOT NULL,
	"contenido" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identidades" (
	"id" text PRIMARY KEY NOT NULL,
	"proyecto_id" text NOT NULL,
	"voz" text DEFAULT '' NOT NULL,
	"reglas" text DEFAULT '' NOT NULL,
	"objetivo" text DEFAULT '' NOT NULL,
	"avatar_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"personaje_nombre" text DEFAULT '' NOT NULL,
	"personaje_personalidad" text DEFAULT '' NOT NULL,
	"fisica" text DEFAULT '' NOT NULL,
	"vestuario" text DEFAULT '' NOT NULL,
	"voz_descrita" text DEFAULT '' NOT NULL,
	"gestos" text DEFAULT '' NOT NULL,
	"muletillas" text DEFAULT '' NOT NULL,
	"foto_url" text DEFAULT '' NOT NULL,
	"paleta" text DEFAULT '' NOT NULL,
	"tipografia" text DEFAULT '' NOT NULL,
	"look" text DEFAULT '' NOT NULL,
	"camara" text DEFAULT '' NOT NULL,
	"ritmo" text DEFAULT '' NOT NULL,
	"estructura_cta" text DEFAULT '' NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "identidades_proyecto_id_unique" UNIQUE("proyecto_id")
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"id" text PRIMARY KEY NOT NULL,
	"texto" text NOT NULL,
	"proyecto_id" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proyectos" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activos" ADD CONSTRAINT "activos_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloques" ADD CONSTRAINT "bloques_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conocimiento" ADD CONSTRAINT "conocimiento_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identidades" ADD CONSTRAINT "identidades_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE set null ON UPDATE no action;