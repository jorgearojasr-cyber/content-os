// Respaldo completo de la base de datos de produccion (Neon) a JSON.
// Se corre a mano antes de cualquier migracion de schema. El archivo queda
// en backups/ (gitignoreado - son datos reales de produccion).
const { neon } = require("@neondatabase/serverless");
const fs = require("node:fs");
const path = require("node:path");

const sql = neon(process.env.DATABASE_URL);

(async () => {
  const tablas = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const respaldo = { fecha: new Date().toISOString(), tablas: {} };
  for (const { table_name } of tablas) {
    const filas = await sql.query(`SELECT * FROM "${table_name}"`);
    respaldo.tablas[table_name] = filas;
    console.log(`${table_name}: ${filas.length} filas`);
  }
  const nombre = `backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  // El script vive en scripts/ — los respaldos van a backups/ en la raíz
  // del proyecto (gitignoreado).
  const destino = path.join(__dirname, "..", "backups", nombre);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(respaldo, null, 1));
  console.log(`\nRespaldo guardado en: ${destino}`);
  console.log(`Tamaño: ${(fs.statSync(destino).size / 1024).toFixed(1)} KB`);
})();
