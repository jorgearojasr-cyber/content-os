import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// DATABASE_URL es la conexión POOLEADA de Neon — la usada para las
// consultas normales de la app. Las migraciones (drizzle.config.ts) usan
// la conexión directa (DATABASE_URL_UNPOOLED) por separado.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Falta configurar DATABASE_URL. Debe apuntar a la conexión pooleada de Neon " +
      "(la agrega automáticamente la integración de Vercel/Neon).",
  );
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
