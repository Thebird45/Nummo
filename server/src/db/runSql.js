import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const target = process.argv[2];
const allowed = new Set(["schema", "seed"]);

if (!allowed.has(target)) {
  console.error("Uso: node src/db/runSql.js <schema|seed>");
  process.exit(1);
}

const sqlPath = path.join(__dirname, `${target}.sql`);
const sql = fs.readFileSync(sqlPath, "utf8");

(async () => {
  try {
    await pool.query(sql);
    console.log(`Archivo ${target}.sql ejecutado con exito`);
    process.exit(0);
  } catch (error) {
    console.error("Error ejecutando SQL:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
