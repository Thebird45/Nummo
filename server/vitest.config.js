import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    env: {
      DB_URL: "postgresql://test",
      JWT_SECRET: "secreto_de_pruebas"
    }
  }
});
