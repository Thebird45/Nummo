import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { resetDb, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

async function crearProducto(body) {
  const res = await request(app)
    .post("/api/productos")
    .set(auth)
    .send({ descripcion: "", stock: 20, stock_minimo: 1, ...body });
  return res;
}

describe("IVA en productos, ventas y facturas", () => {
  let arroz;
  let gaseosa;
  let huevos;

  beforeAll(async () => {
    await resetDb();
    arroz = (await crearProducto({ nombre: "Arroz 500g", precio: 2100, iva_tarifa: 5 })).body.product;
    gaseosa = (await crearProducto({ nombre: "Gaseosa", precio: 2380 })).body.product;
    huevos = (await crearProducto({ nombre: "Huevos", precio: 500, iva_tarifa: 0 })).body.product;
  });

  it("guarda la tarifa del producto y usa 19 por defecto", () => {
    expect(Number(arroz.iva_tarifa)).toBe(5);
    expect(Number(gaseosa.iva_tarifa)).toBe(19);
    expect(Number(huevos.iva_tarifa)).toBe(0);
  });

  it("rechaza tarifas que no existen", async () => {
    const res = await crearProducto({ nombre: "Raro", precio: 1000, iva_tarifa: 10 });
    expect(res.status).toBe(400);
  });

  it("editar sin enviar tarifa conserva la actual", async () => {
    const res = await request(app)
      .put(`/api/productos/${arroz.id}`)
      .set(auth)
      .send({ nombre: "Arroz 500g", descripcion: "", precio: 2100, stock: 20, stock_minimo: 1 });
    expect(res.status).toBe(200);
    expect(Number(res.body.product.iva_tarifa)).toBe(5);
  });

  it("factura con varias tarifas desglosa cada una y conserva la tarifa de la venta", async () => {
    const venta = await request(app)
      .post("/api/ventas")
      .set(auth)
      .send({
        payment_method: "efectivo",
        items: [
          { producto_id: arroz.id, cantidad: 1 },
          { producto_id: gaseosa.id, cantidad: 1 },
          { producto_id: huevos.id, cantidad: 2 }
        ]
      });
    expect(venta.status).toBe(201);

    // Cambiar la tarifa despues de vender no debe afectar la factura
    await request(app)
      .put(`/api/productos/${gaseosa.id}`)
      .set(auth)
      .send({ nombre: "Gaseosa", descripcion: "", precio: 2380, stock: 19, stock_minimo: 1, iva_tarifa: 0 });

    const res = await request(app).post("/api/facturas").set(auth).send({ sale_id: venta.body.ticket.venta_id });
    expect(res.status).toBe(201);

    const { impuestos, subtotal, total_iva, total } = res.body.factura.dian_payload;
    expect(impuestos).toEqual([
      { tarifa: 19, base: 2000, iva: 380 },
      { tarifa: 5, base: 2000, iva: 100 },
      { tarifa: 0, base: 1000, iva: 0 }
    ]);
    expect(subtotal).toBe(5000);
    expect(total_iva).toBe(480);
    expect(total).toBe(5480);
  });
});
