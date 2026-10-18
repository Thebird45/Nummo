import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { BUSINESS_ID, db, resetDb, resetSchemaOnly, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

function binaryParser(res, callback) {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

async function vender(body) {
  const { rows } = await db.query(
    "SELECT id FROM productos WHERE business_id = $1 AND nombre = 'Croissant'",
    [BUSINESS_ID]
  );
  const res = await request(app)
    .post("/api/ventas")
    .set(auth)
    .send({ payment_method: "efectivo", items: [{ producto_id: rows[0].id, cantidad: 2 }], ...body });
  return res.body.ticket.venta_id;
}

describe("facturas", () => {
  let ventaConCliente;
  let ventaMostrador;
  let factura;

  beforeAll(async () => {
    await resetDb();
    const cliente = await request(app)
      .post("/api/clientes")
      .set(auth)
      .send({ nombre: "Laura Mejia", documento: "43123456", correo: "laura@correo.co" });
    ventaConCliente = await vender({ cliente_id: cliente.body.id });
    ventaMostrador = await vender({});
  });

  it("genera factura desde una venta con el siguiente consecutivo", async () => {
    const res = await request(app).post("/api/facturas").set(auth).send({ sale_id: ventaConCliente });

    expect(res.status).toBe(201);
    factura = res.body.factura;
    expect(factura.prefijo).toBe("FE");
    expect(factura.numero).toBe(3);
    expect(factura.status).toBe("pendiente");
    expect(Number(factura.total)).toBe(6400);
    expect(factura.customer_email).toBe("laura@correo.co");
    expect(factura.dian_payload.cliente.documento).toBe("43123456");
    expect(factura.dian_payload.items).toEqual([
      { nombre: "Croissant", cantidad: 2, precio_unitario: 3200, subtotal: 6400 }
    ]);
  });

  it("no factura dos veces la misma venta", async () => {
    const res = await request(app).post("/api/facturas").set(auth).send({ sale_id: ventaConCliente });
    expect(res.status).toBe(409);
  });

  it("venta sin cliente sale a consumidor final con el siguiente numero", async () => {
    const res = await request(app).post("/api/facturas").set(auth).send({ sale_id: ventaMostrador });

    expect(res.status).toBe(201);
    expect(res.body.factura.numero).toBe(4);
    expect(res.body.factura.dian_payload.cliente.documento).toBe("222222222222");
  });

  it("rechaza ventas de otro negocio o inexistentes", async () => {
    const otro = { Authorization: `Bearer ${tokenFor({ businessId: "99999999-9999-9999-9999-999999999999" })}` };
    const ajena = await request(app).post("/api/facturas").set(otro).send({ sale_id: ventaMostrador });
    expect(ajena.status).toBe(404);

    const invalida = await request(app).post("/api/facturas").set(auth).send({ sale_id: "abc" });
    expect(invalida.status).toBe(400);
  });

  it("lista las facturas de la mas reciente a la mas antigua", async () => {
    const res = await request(app).get("/api/facturas").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.facturas.map((f) => f.numero)).toEqual([4, 3, 2, 1]);
    expect(res.body.facturas[1].cliente_nombre).toBe("Laura Mejia");
  });

  it("obtiene el detalle y responde 404 si no existe", async () => {
    const ok = await request(app).get(`/api/facturas/${factura.id}`).set(auth);
    expect(ok.status).toBe(200);
    expect(ok.body.factura.numero).toBe(3);

    const noExiste = await request(app).get("/api/facturas/no-es-uuid").set(auth);
    expect(noExiste.status).toBe(404);
  });

  it("descarga el PDF de la factura", async () => {
    const res = await request(app)
      .get(`/api/facturas/${factura.id}/pdf`)
      .set(auth)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain("factura-FE-3.pdf");
    expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("factura antigua sin datos no genera PDF", async () => {
    const { rows } = await db.query("SELECT id FROM invoices WHERE numero = 1 AND business_id = $1", [BUSINESS_ID]);
    const res = await request(app).get(`/api/facturas/${rows[0].id}/pdf`).set(auth);
    expect(res.status).toBe(409);
  });

  it("el schema numera facturas antiguas sin consecutivo", async () => {
    await db.query(
      "INSERT INTO invoices (business_id, status, created_at) VALUES ($1, 'pendiente', NOW() - INTERVAL '1 year')",
      [BUSINESS_ID]
    );
    await resetSchemaOnly();
    const { rows } = await db.query("SELECT numero FROM invoices WHERE business_id = $1 ORDER BY numero", [BUSINESS_ID]);
    expect(rows.map((r) => r.numero)).toEqual([1, 2, 3, 4, 5]);
  });
});
