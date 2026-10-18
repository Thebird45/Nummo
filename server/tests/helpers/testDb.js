import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { PGlite } from "@electric-sql/pglite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, "../../src/db");

export const BUSINESS_ID = "11111111-1111-1111-1111-111111111111";
export const USER_ID = "22222222-2222-2222-2222-222222222222";

export const db = new PGlite();

// Misma forma que pg: rows y rowCount
async function query(text, params) {
  const result = await db.query(text, params);
  return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
}

export const pool = {
  query,
  connect: async () => ({ query, release() {} })
};

function readSql(name) {
  // gen_random_uuid() ya es nativo en Postgres 13+
  return fs.readFileSync(path.join(dbDir, `${name}.sql`), "utf8").replace(/CREATE EXTENSION[^;]*;/i, "");
}

export async function resetDb() {
  // Igual que pool.js: la sesion usa la zona del negocio
  await db.exec("SET TIME ZONE 'America/Bogota'; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await db.exec(readSql("schema"));
  await db.exec(readSql("seed"));
}

// Vuelve a correr schema.sql sobre los datos existentes (como en una base ya creada)
export async function resetSchemaOnly() {
  await db.exec(readSql("schema"));
}

export function tokenFor({ sub = USER_ID, businessId = BUSINESS_ID, role = "dueno" } = {}) {
  return jwt.sign({ sub, businessId, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}
