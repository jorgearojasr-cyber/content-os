import type { Config } from "drizzle-kit";

// DATABASE_URL_UNPOOLED — conexión DIRECTA a Neon, específicamente para
// migraciones. Nunca deben pasar por el pooler (DATABASE_URL, usado en
// src/db/index.ts para las consultas normales de la app).
const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error(
    "Falta configurar DATABASE_URL_UNPOOLED para correr migraciones (drizzle-kit).",
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
} satisfies Config;
