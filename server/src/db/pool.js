import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.dbUrl,
  options: `-c timezone=${env.timezone}`
});
