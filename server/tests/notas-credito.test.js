import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { calcularCude, datosCufe } from "../src/services/dian/cufe.js";
import { BUSINESS_ID, db, resetDb, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

async function producto(nombre) {
  const { rows } = await db.query("SELECT id, stock FROM productos WHERE business_id = $1 AND nombre = $2", [BUSINESS_ID, nombre]);
  return { id: rows[0].id, stock: Number(rows[0].stock) };
}

const nota = (facturaId, body) => request(app).post(`/api/facturas/${facturaId}/notas-credito`).set(auth).send(body);

describe("notas credito", () => {
  let factura;
  let croissant;
  let pan;

  beforeAll(async () => {
    await resetDb();
    croissant = await producto("Croissant");
    pan = await producto("Pan Frances");
    const cliente = await request(app).post("/api/clientes").set(auth).send({ nombre: "Hotel Laureles", documento: "800197268-4" });
    const venta = await request(app)
      .post("/api/ventas")
      .set(auth)
      .send({
        cliente_id: cliente.body.id,
        payment_method: "transferencia",
        items: [
          { producto_id: croissant.id, cantidad: 3 },
          { producto_id: pan.id, cantidad: 2 }
        ]
      });
    factura = (await request(app).post("/api/facturas").set(auth).send({ sale_id: venta.body.ticket.venta_id })).body.factura;
  });

  it("solo aplica a facturas validadas por la DIAN", async () => {
    const res = await nota(factura.id, { concepto: 2, motivo: "Factura emitida por error" });
    expect(res.status).toBe(409);
    await request(app).post(`/api/facturas/${factura.id}/consultar-estado`).set(auth);
  });

  it("lista lo que se puede acreditar", async () => {
    const res = await request(app).get(`/api/facturas/${factura.id}/acreditable`).set(auth);
    expect(res.body.items.map((i) => [i.nombre, i.disponible])).toEqual([["Croissant", 3], ["Pan Frances", 2]]);
  });

  it("devolucion parcial: NC-1 con CUDE, IVA desglosado y stock reintegrado", async () => {
    const croissantStock = (await producto("Croissant")).stock;
    const res = await nota(factura.id, {
      concepto: 1,
      motivo: "El cliente devolvio un croissant",
      items: [{ producto_id: croissant.id, cantidad: 1 }]
    });

    expect(res.status).toBe(201);
    const nc = res.body.nota;
    expect(`${nc.prefijo}-${nc.numero}`).toBe("NC-1");
    expect(nc.status).toBe("pendiente");
    expect(Number(nc.total)).toBe(3200);
    expect(nc.dian_payload.factura_referencia).toMatchObject({ codigo: `FE-${factura.numero}`, cufe: factura.cufe });
    expect(nc.dian_payload.impuestos).toEqual([{ tarifa: 19, base: 2689.08, iva: 510.92 }]);
    expect(nc.cude).toBe(
      calcularCude({
        ...datosCufe(nc, { claveTecnica: "", tipoAmbiente: "2", timezone: env.timezone }),
        softwarePin: env.dian.softwarePin
      })
    );

    expect((await producto("Croissant")).stock).toBe(croissantStock + 1);
    const { rows } = await db.query("SELECT motivo FROM movimientos_inventario WHERE producto_id = $1 AND tipo = 'entrada'", [croissant.id]);
    expect(rows.map((r) => r.motivo)).toContain(`Nota credito NC-1 (factura FE-${factura.numero})`);
  });

  it("no deja acreditar mas de lo que queda", async () => {
    const res = await nota(factura.id, {
      concepto: 1,
      motivo: "Devolucion de mas croissants",
      items: [{ producto_id: croissant.id, cantidad: 3 }]
    });
    expect(res.status).toBe(400);
  });

  it("puede no reintegrar inventario (producto danado)", async () => {
    const stockAntes = (await producto("Pan Frances")).stock;
    const res = await nota(factura.id, {
      concepto: 1,
      motivo: "Pan llego aplastado, se descarta",
      items: [{ producto_id: pan.id, cantidad: 1 }],
      reintegrar_inventario: false
    });
    expect(res.status).toBe(201);
    expect((await producto("Pan Frances")).stock).toBe(stockAntes);
  });

  it("anulacion acredita todo lo que queda y deja la factura en cero", async () => {
    const res = await nota(factura.id, { concepto: 2, motivo: "Se anula el resto de la factura" });
    expect(res.status).toBe(201);
    expect(res.body.nota.dian_payload.items.map((i) => [i.nombre, i.cantidad])).toEqual([["Croissant", 2], ["Pan Frances", 1]]);

    const acreditable = await request(app).get(`/api/facturas/${factura.id}/acreditable`).set(auth);
    expect(acreditable.body.items.every((i) => i.disponible === 0)).toBe(true);

    const lista = await request(app).get("/api/facturas").set(auth);
    const enLista = lista.body.facturas.find((f) => f.id === factura.id);
    expect(Number(enLista.total_acreditado)).toBe(Number(factura.total));
    expect(enLista.notas_credito.map((n) => n.codigo)).toEqual(["NC-1", "NC-2", "NC-3"]);

    const otra = await nota(factura.id, { concepto: 2, motivo: "Otra anulacion" });
    expect(otra.status).toBe(409);
  });

  it("valida los datos de la nota", async () => {
    expect((await nota(factura.id, { concepto: 1, motivo: "Sin productos" })).status).toBe(400);
    expect((await nota(factura.id, { concepto: 2, motivo: "no" })).status).toBe(400);
    expect((await nota(factura.id, { concepto: 3, motivo: "Concepto raro" })).status).toBe(400);
  });

  it("se consulta su estado en la DIAN y se descarga su PDF", async () => {
    const { rows } = await db.query("SELECT id FROM notas_credito WHERE numero = 1 AND business_id = $1", [BUSINESS_ID]);
    const consulta = await request(app).post(`/api/notas-credito/${rows[0].id}/consultar-estado`).set(auth);
    expect(consulta.body.nota.status).toBe("validada");

    const pdf = await request(app).get(`/api/notas-credito/${rows[0].id}/pdf`).set(auth);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-disposition"]).toContain("nota-credito-NC-1.pdf");
  });

  it("los reportes incluyen las notas credito del periodo", async () => {
    const res = await request(app).get("/api/reportes").set(auth);
    expect(res.body.notas_credito.map((n) => n.codigo)).toEqual(["NC-1", "NC-2", "NC-3"]);
  });

  it("otro negocio no puede crear notas sobre la factura", async () => {
    const otro = { Authorization: `Bearer ${tokenFor({ businessId: "99999999-9999-9999-9999-999999999999" })}` };
    const res = await request(app)
      .post(`/api/facturas/${factura.id}/notas-credito`)
      .set(otro)
      .send({ concepto: 2, motivo: "Intento ajeno" });
    expect(res.status).toBe(404);
  });
});
