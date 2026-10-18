import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { BUSINESS_ID, db, resetDb, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

async function producto(nombre) {
  const { rows } = await db.query(
    "SELECT id, stock FROM productos WHERE business_id = $1 AND nombre = $2",
    [BUSINESS_ID, nombre]
  );
  return rows[0];
}

describe("ventas y reportes", () => {
  let clienteId;
  let pan;

  beforeAll(async () => {
    await resetDb();
    const res = await request(app).post("/api/clientes").set(auth).send({ nombre: "Carlos Ruiz" });
    clienteId = res.body.id;
    pan = await producto("Pan Frances");
  });

  it("registra una venta con cliente y descuenta stock", async () => {
    const res = await request(app)
      .post("/api/ventas")
      .set(auth)
      .send({
        cliente_id: clienteId,
        payment_method: "efectivo",
        items: [{ producto_id: pan.id, cantidad: 3 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket.cliente_id).toBe(clienteId);
    expect(Number(res.body.ticket.total)).toBe(3600);
    expect((await producto("Pan Frances")).stock).toBe(pan.stock - 3);
  });

  it("rechaza venta sin stock suficiente", async () => {
    const res = await request(app)
      .post("/api/ventas")
      .set(auth)
      .send({ payment_method: "efectivo", items: [{ producto_id: pan.id, cantidad: 9999 }] });
    expect(res.status).toBe(400);
  });

  it("reportes incluye el nombre del cliente", async () => {
    const res = await request(app).get("/api/reportes").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.ventas.some((v) => v.cliente_nombre === "Carlos Ruiz")).toBe(true);
  });

  it("historial del cliente muestra la venta", async () => {
    const res = await request(app).get(`/api/clientes/${clienteId}/historial`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
