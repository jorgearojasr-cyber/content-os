// RESET-1 — Vacía las 14 tablas de contenido de usuario, conserva `planos`
// intacta. Corré esto SOLO despues de validar el backup (ver backups/).
// Orden: hijos antes que padres, para no depender de que los ON DELETE
// CASCADE esten bien configurados en cada tabla.
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

const ORDEN = [
  "storyboard_escenas_personajes",
  "storyboard_escenas",
  "producciones",
  "notas",
  "prompts_guardados",
  "documentos",
  "conocimiento",
  "bloques",
  "activos",
  "avatares",
  "personajes",
  "identidades",
  "proyectos",
  "area",
];

(async () => {
  console.log("Borrando contenido de usuario (planos queda intacta)...\n");
  for (const tabla of ORDEN) {
    const [{ count: antes }] = await sql.query(`SELECT COUNT(*)::int AS count FROM "${tabla}"`);
    await sql.query(`DELETE FROM "${tabla}"`);
    const [{ count: despues }] = await sql.query(`SELECT COUNT(*)::int AS count FROM "${tabla}"`);
    console.log(`${tabla}: ${antes} -> ${despues}`);
  }
  const [{ count: planosCount }] = await sql.query(`SELECT COUNT(*)::int AS count FROM "planos"`);
  console.log(`\nplanos (sin tocar): ${planosCount} filas`);
})();
