import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { BUSINESS_ID, db, resetDb, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

describe("corregir y reenviar facturas rechazadas", () => {
  let clienteId;
  let rechazada;

  beforeAll(async () => {
    await resetDb();
    // Cliente guardado antes de validar el NIT (DV equivocado)
    const { rows } = await db.query(
      "INSERT INTO clientes (business_id, nombre, documento, correo) VALUES ($1, 'Hotel Laureles', '800197268-5', 'conta@hotel.co') RETURNING id",
      [BUSINESS_ID]
    );
    clienteId = rows[0].id;
    const producto = (await db.query("SELECT id FROM productos WHERE business_id = $1 LIMIT 1", [BUSINESS_ID])).rows[0].id;
    const venta = await request(app)
      .post("/api/ventas")
      .set(auth)
      .send({ cliente_id: clienteId, payment_method: "transferencia", items: [{ producto_id: producto, cantidad: 2 }] });
    rechazada = (await request(app).post("/api/facturas").set(auth).send({ sale_id: venta.body.ticket.venta_id })).body.factura;
  });

  it("parte de una factura rechazada por el NIT", () => {
    expect(rechazada.status).toBe("rechazada");
    expect(rechazada.cufe).toBeNull();
  });

  it("si no se corrige nada, sigue rechazada con el mismo numero", async () => {
    const res = await request(app).post(`/api/facturas/${rechazada.id}/reenviar`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.factura.status).toBe("rechazada");
    expect(res.body.factura.numero).toBe(rechazada.numero);
    expect(res.body.message).toContain("Sigue rechazada");
  });

  it("corrigiendo el NIT del cliente se reenvia con el mismo numero y nuevo CUFE", async () => {
    const editar = await request(app)
      .put(`/api/clientes/${clienteId}`)
      .set(auth)
      .send({ nombre: "Hotel Laureles", documento: "800197268-4", correo: "conta@hotel.co" });
    expect(editar.status).toBe(200);

    const res = await request(app).post(`/api/facturas/${rechazada.id}/reenviar`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Factura corregida y reenviada a la DIAN");

    const factura = res.body.factura;
    expect(factura.id).toBe(rechazada.id);
    expect(factura.numero).toBe(rechazada.numero);
    expect(factura.status).toBe("pendiente");
    expect(factura.cufe).toMatch(/^[0-9a-f]{96}$/);
    expect(factura.dian_payload.cliente.documento).toBe("800197268-4");

    // No se crea una factura nueva ni se salta el consecutivo
    const { rows } = await db.query("SELECT COUNT(*)::int AS n FROM invoices WHERE sale_id = $1", [factura.sale_id]);
    expect(rows[0].n).toBe(1);
  });

  it("solo se reenvian facturas rechazadas", async () => {
    const res = await request(app).post(`/api/facturas/${rechazada.id}/reenviar`).set(auth);
    expect(res.status).toBe(409);
  });

  it("no deja reenviar facturas de otro negocio", async () => {
    const otro = { Authorization: `Bearer ${tokenFor({ businessId: "99999999-9999-9999-9999-999999999999" })}` };
    const res = await request(app).post(`/api/facturas/${rechazada.id}/reenviar`).set(otro);
    expect(res.status).toBe(404);
  });
});
