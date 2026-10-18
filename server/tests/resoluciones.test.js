import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { calcularCufe, datosCufe } from "../src/services/dian/cufe.js";
import { alertasResolucion } from "../src/services/resolucionAlertas.js";
import { BUSINESS_ID, db, resetDb, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

// Fecha de hoy en Colombia +/- dias, como "YYYY-MM-DD"
function dia(offset = 0) {
  const fecha = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(fecha);
}

function resolucion(cambios = {}) {
  return {
    numero_resolucion: "18764000001234",
    fecha_resolucion: dia(-1),
    prefijo: "setp",
    rango_desde: 990000000,
    rango_hasta: 990000002,
    vigencia_desde: dia(-1),
    vigencia_hasta: dia(365),
    clave_tecnica: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
    ...cambios
  };
}

async function venta(headers = auth) {
  const { rows } = await db.query("SELECT id FROM productos WHERE business_id = $1 LIMIT 1", [BUSINESS_ID]);
  const res = await request(app)
    .post("/api/ventas")
    .set(headers)
    .send({ payment_method: "efectivo", items: [{ producto_id: rows[0].id, cantidad: 1 }] });
  return res.body.ticket.venta_id;
}

const facturar = async (headers = auth) =>
  request(app).post("/api/facturas").set(headers).send({ sale_id: await venta(headers) });

describe("resolucion de numeracion", () => {
  beforeAll(resetDb);

  it("el negocio demo trae una resolucion activa y sigue con el numero 3", async () => {
    const res = await request(app).get("/api/resoluciones").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.activa).toMatchObject({ prefijo: "FE", rango_desde: 1, rango_hasta: 5000, siguiente: 3, vigente: true });
    expect(res.body.activa.disponibles).toBe(4998);
    expect(res.body.alertas).toEqual([]);
  });

  it("solo el dueno puede registrar resoluciones y se validan los datos", async () => {
    const empleado = { Authorization: `Bearer ${tokenFor({ role: "empleado" })}` };
    expect((await request(app).post("/api/resoluciones").set(empleado).send(resolucion())).status).toBe(403);

    const invertido = await request(app).post("/api/resoluciones").set(auth).send(resolucion({ rango_hasta: 1 }));
    expect(invertido.status).toBe(400);

    const prefijoLargo = await request(app).post("/api/resoluciones").set(auth).send(resolucion({ prefijo: "ABCDE" }));
    expect(prefijoLargo.status).toBe(400);
  });

  it("factura con el prefijo y rango de la nueva resolucion y su clave tecnica", async () => {
    const nueva = await request(app).post("/api/resoluciones").set(auth).send(resolucion());
    expect(nueva.status).toBe(201);
    expect(nueva.body.activa).toMatchObject({ prefijo: "SETP", siguiente: 990000000, tiene_clave_tecnica: true });

    const historial = (await request(app).get("/api/resoluciones").set(auth)).body.historial;
    expect(historial.map((r) => r.activa)).toEqual([true, false]);

    const res = await facturar();
    expect(res.status).toBe(201);
    const factura = res.body.factura;
    expect(factura.prefijo).toBe("SETP");
    expect(factura.numero).toBe(990000000);
    expect(factura.dian_payload.resolucion).toMatchObject({ numero: "18764000001234", prefijo: "SETP", desde: 990000000, hasta: 990000002 });
    expect(factura.cufe).toBe(
      calcularCufe(
        datosCufe(factura, {
          claveTecnica: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
          tipoAmbiente: "2",
          timezone: "America/Bogota"
        })
      )
    );
  });

  it("bloquea cuando se agota el rango y lo avisa", async () => {
    expect((await facturar()).body.factura.numero).toBe(990000001);
    expect((await facturar()).body.factura.numero).toBe(990000002);

    const agotada = await facturar();
    expect(agotada.status).toBe(409);
    expect(agotada.body.message).toContain("Se agoto el rango");

    const estado = (await request(app).get("/api/resoluciones").set(auth)).body;
    expect(estado.activa.disponibles).toBe(0);
    expect(estado.alertas.map((a) => a.mensaje)).toContain("Se agoto el rango de numeracion autorizado");
  });

  it("bloquea con resolucion vencida", async () => {
    await request(app)
      .post("/api/resoluciones")
      .set(auth)
      .send(resolucion({ prefijo: "FV", rango_desde: 1, rango_hasta: 100, vigencia_desde: dia(-400), vigencia_hasta: dia(-5) }));
    const res = await facturar();
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("no esta vigente");
  });

  it("bloquea a un negocio que no ha configurado resolucion", async () => {
    const registro = await request(app).post("/api/auth/register").send({
      businessName: "Tienda Sin Resolucion",
      nit: "800197268-4",
      address: "Calle 1 #2-3",
      phone: "3001234567",
      ownerName: "Dueno",
      email: "sinres@tienda.co",
      password: "clave12345"
    });
    const otro = { Authorization: `Bearer ${registro.body.token}` };
    const producto = await request(app)
      .post("/api/productos")
      .set(otro)
      .send({ nombre: "Pan", precio: 1000, stock: 5 });
    const ventaOtro = await request(app)
      .post("/api/ventas")
      .set(otro)
      .send({ payment_method: "efectivo", items: [{ producto_id: producto.body.product.id, cantidad: 1 }] });

    const res = await request(app).post("/api/facturas").set(otro).send({ sale_id: ventaOtro.body.ticket.venta_id });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("Configura la resolucion");

    const estado = (await request(app).get("/api/resoluciones").set(otro)).body;
    expect(estado.activa).toBeNull();
    expect(estado.alertas[0].nivel).toBe("error");
  });
});

describe("alertas de resolucion", () => {
  const base = { vigente: true, dias_para_vencer: 200, disponibles: 900, total: 1000, vigencia_hasta: "2027-01-01" };

  it("avisa cuando faltan 30 dias o menos para vencer", () => {
    expect(alertasResolucion({ ...base, dias_para_vencer: 12 })[0]).toEqual({
      nivel: "aviso",
      mensaje: "La resolucion vence en 12 dias (2027-01-01)"
    });
  });

  it("avisa cuando queda el 10% del rango o menos", () => {
    expect(alertasResolucion({ ...base, disponibles: 100 })[0].mensaje).toBe("Quedan 100 numeros del rango autorizado");
    expect(alertasResolucion(base)).toEqual([]);
  });
});
