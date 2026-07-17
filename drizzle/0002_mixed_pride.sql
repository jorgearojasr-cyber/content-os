ALTER TABLE "identidades" ADD COLUMN "fotos_urls_json" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "identidades" ADD COLUMN "sitio_web" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "identidades" ADD COLUMN "telefono" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "identidades" ADD COLUMN "direccion" text DEFAULT '' NOT NULL;