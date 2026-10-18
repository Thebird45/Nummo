import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { resetDb } from "./helpers/testDb.js";

const nuevoNegocio = {
  businessName: "Tienda Prueba",
  nit: "900111222-1",
  address: "Carrera 10 #20-30",
  phone: "3009998877",
  ownerName: "Dueno Prueba",
  email: "dueno@prueba.co",
  password: "clave12345"
};

describe("auth", () => {
  beforeAll(resetDb);

  it("health responde ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("registra un negocio y devuelve token", async () => {
    const res = await request(app).post("/api/auth/register").send(nuevoNegocio);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  it("rechaza correo duplicado", async () => {
    const res = await request(app).post("/api/auth/register").send(nuevoNegocio);
    expect(res.status).toBe(409);
  });

  it("login con credenciales correctas", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: nuevoNegocio.email, password: nuevoNegocio.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("el usuario demo del seed puede iniciar sesion", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "demo@nummo.co", password: "demo12345" });
    expect(res.status).toBe(200);
  });

  it("login con clave incorrecta da 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: nuevoNegocio.email, password: "otra-clave" });
    expect(res.status).toBe(401);
  });

  it("rutas protegidas exigen token", async () => {
    const res = await request(app).get("/api/clientes");
    expect(res.status).toBe(401);
  });
});
