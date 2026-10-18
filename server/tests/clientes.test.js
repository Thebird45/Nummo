import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { resetDb, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

describe("clientes", () => {
  let clienteId;

  beforeAll(resetDb);

  it("lista vacia al inicio", async () => {
    const res = await request(app).get("/api/clientes").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("crea un cliente", async () => {
    const res = await request(app)
      .post("/api/clientes")
      .set(auth)
      .send({ nombre: "  Ana Gomez ", documento: "1020304050" });
    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Ana Gomez");
    clienteId = res.body.id;
  });

  it("exige nombre", async () => {
    const res = await request(app).post("/api/clientes").set(auth).send({ nombre: "  " });
    expect(res.status).toBe(400);
  });

  it("obtiene y actualiza el cliente", async () => {
    const get = await request(app).get(`/api/clientes/${clienteId}`).set(auth);
    expect(get.status).toBe(200);

    const put = await request(app)
      .put(`/api/clientes/${clienteId}`)
      .set(auth)
      .send({ nombre: "Ana Maria Gomez", telefono: "3001112233" });
    expect(put.status).toBe(200);
    expect(put.body.telefono).toBe("3001112233");
  });

  it("otro negocio no ve los clientes", async () => {
    const otro = { Authorization: `Bearer ${tokenFor({ businessId: "99999999-9999-9999-9999-999999999999" })}` };
    const res = await request(app).get("/api/clientes").set(otro);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("elimina el cliente", async () => {
    const del = await request(app).delete(`/api/clientes/${clienteId}`).set(auth);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/clientes/${clienteId}`).set(auth);
    expect(get.status).toBe(404);
  });
});
