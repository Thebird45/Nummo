import { vi } from "vitest";

// Reemplaza el pool de pg por PGlite (Postgres en memoria)
vi.mock("../src/db/pool.js", async () => {
  const { pool } = await import("./helpers/testDb.js");
  return { pool };
});
