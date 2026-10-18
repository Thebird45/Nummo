import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { BUSINESS_ID, db, resetDb, tokenFor } from "./helpers/testDb.js";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

const auth = { Authorization: `Bearer ${tokenFor()}` };

async function facturar(clienteBody) {
  const { rows } = await db.query("SELECT id FROM productos WHERE business_id = $1 LIMIT 1", [BUSINESS_ID]);
  let cliente_id = null;
  if (clienteBody) {
    cliente_id = (await request(app).post("/api/clientes").set(auth).send(clienteBody)).body.id;
  }
  const venta = await request(app)
    .post("/api/ventas")
    .set(auth)
    .send({ cliente_id, payment_method: "efectivo", items: [{ producto_id: rows[0].id, cantidad: 1 }] });
  const res = await request(app).post("/api/facturas").set(auth).send({ sale_id: venta.body.ticket.venta_id });
  return res.body.factura;
}

describe("envio de facturas por correo", () => {
  let conCorreo;
  let sinCorreo;

  beforeAll(async () => {
    await resetDb();
    conCorreo = await facturar({ nombre: "Laura Mejia", correo: "laura@correo.co" });
    sinCorreo = await facturar(null);
  });

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({});
  });

  it("envia el PDF al correo del cliente y lo registra", async () => {
    const res = await request(app).post(`/api/facturas/${conCorreo.id}/enviar`).set(auth).send({});

    expect(res.status).toBe(200);
    expect(res.body.simulado).toBe(true);
    expect(res.body.enviada_a).toBe("laura@correo.co");
    expect(res.body.enviada_at).toBeTruthy();

    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe("laura@correo.co");
    expect(mail.subject).toBe(`Factura FE-${conCorreo.numero} de Panaderia La 80`);
    expect(mail.attachments[0].filename).toBe(`factura-FE-${conCorreo.numero}.pdf`);
    expect(mail.attachments[0].content.subarray(0, 4).toString()).toBe("%PDF");

    const lista = await request(app).get("/api/facturas").set(auth);
    expect(lista.body.facturas.find((f) => f.id === conCorreo.id).enviada_a).toBe("laura@correo.co");
  });

  it("permite enviar a otro correo", async () => {
    const res = await request(app)
      .post(`/api/facturas/${conCorreo.id}/enviar`)
      .set(auth)
      .send({ correo: "contabilidad@empresa.co" });
    expect(res.status).toBe(200);
    expect(sendMail.mock.calls[0][0].to).toBe("contabilidad@empresa.co");
  });

  it("pide un correo si la factura no tiene", async () => {
    const res = await request(app).post(`/api/facturas/${sinCorreo.id}/enviar`).set(auth).send({});
    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rechaza correos invalidos y facturas ajenas", async () => {
    const invalido = await request(app)
      .post(`/api/facturas/${conCorreo.id}/enviar`)
      .set(auth)
      .send({ correo: "no-es-correo" });
    expect(invalido.status).toBe(400);

    const otro = { Authorization: `Bearer ${tokenFor({ businessId: "99999999-9999-9999-9999-999999999999" })}` };
    const ajena = await request(app).post(`/api/facturas/${conCorreo.id}/enviar`).set(otro).send({});
    expect(ajena.status).toBe(404);
  });

  it("si el SMTP falla responde 502 y no marca la factura como enviada", async () => {
    sendMail.mockRejectedValue(new Error("Invalid login"));
    const res = await request(app)
      .post(`/api/facturas/${sinCorreo.id}/enviar`)
      .set(auth)
      .send({ correo: "alguien@correo.co" });

    expect(res.status).toBe(502);
    const { rows } = await db.query("SELECT enviada_a FROM invoices WHERE id = $1", [sinCorreo.id]);
    expect(rows[0].enviada_a).toBeNull();
  });
});
