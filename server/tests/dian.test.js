import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { calcularCude, calcularCufe, datosCufe, fechaHoraDian } from "../src/services/dian/cufe.js";
import { digitoVerificacion, nitValido } from "../src/services/dian/nit.js";
import { proveedorSimulado } from "../src/services/dian/simulado.js";
import { validarFactura } from "../src/services/dian/validaciones.js";
import { BUSINESS_ID, db, resetDb, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

describe("CUFE y NIT", () => {
  it("reproduce el ejemplo oficial del Anexo Tecnico 1.9 (seccion 11.2.1)", () => {
    const cufe = calcularCufe({
      numFac: "323200000129",
      fecFac: "2019-01-16",
      horFac: "10:53:10-05:00",
      valFac: 1500000,
      valIva: 285000,
      valTot: 1785000,
      nitOfe: "700085371",
      numAdq: "800199436",
      claveTecnica: "693ff6f2a553c3646a063436fd4dd9ded0311471",
      tipoAmbiente: "1"
    });
    expect(cufe).toBe(
      "8bb918b19ba22a694f1da11c643b5e9de39adf60311cf179179e9b33381030bcd4c3c3f156c506ed5908f9276f5bd9b4"
    );
  });

  it("CUDE reproduce los ejemplos de nota credito y nota debito del anexo", () => {
    expect(
      calcularCude({
        numFac: "8110007871",
        fecFac: "2019-01-12",
        horFac: "07:00:00-05:00",
        valFac: 5000,
        valIva: 950,
        valTot: 5950,
        nitOfe: "900373076",
        numAdq: "8355990",
        softwarePin: "12301",
        tipoAmbiente: "1"
      })
    ).toBe("907e4444decc9e59c160a2fb3b6659b33dc5b632a5008922b9a62f83f757b1c448e47f5867f2b50dbdb96f48c7681168");

    expect(
      calcularCude({
        numFac: "ND1001",
        fecFac: "2019-01-18",
        horFac: "10:58:00-05:00",
        valFac: 30000,
        valIva: 0,
        valInc: 2400,
        valTot: 32400,
        nitOfe: "900197264",
        numAdq: "10254102",
        softwarePin: "10201",
        tipoAmbiente: "2"
      })
    ).toBe("3fa73a86d57d9341c536afde1f85c4efd9d4591c2c22bce4dfb0e6b0d2e83b8f047a8bde7098292e9d2493e60d1c31da");
  });

  it("calcula el digito de verificacion del NIT", () => {
    expect(digitoVerificacion("800197268")).toBe(4); // NIT de la DIAN
    expect(digitoVerificacion("901234567")).toBe(7);
    expect(nitValido("800.197.268-4")).toBe(true);
    expect(nitValido("800197268-5")).toBe(false);
    expect(nitValido("1036123456")).toBe(true); // cedula sin DV
    expect(nitValido("abc")).toBe(false);
  });

  it("usa fecha y hora de Colombia con su offset", () => {
    expect(fechaHoraDian("2026-10-18T03:30:00Z", "America/Bogota")).toEqual({
      fecha: "2026-10-17",
      hora: "22:30:00-05:00"
    });
  });
});

describe("validaciones previas a la DIAN", () => {
  const base = {
    emisor: { nit: "901234567-7" },
    cliente: { documento: "43123456" },
    items: [{ subtotal: 11900 }],
    subtotal: 10000,
    total_iva: 1900,
    total: 11900
  };

  it("una factura correcta no tiene errores", () => {
    expect(validarFactura(base)).toEqual([]);
  });

  it("detecta NIT con DV malo, factura sin productos y totales que no cuadran", () => {
    expect(validarFactura({ ...base, emisor: { nit: "901234567-8" } })[0]).toContain("NIT del emisor invalido");
    expect(validarFactura({ ...base, cliente: { documento: "900111222-3" } })[0]).toContain("NIT del adquirente invalido");
    expect(validarFactura({ ...base, items: [] })).toContain("La factura no tiene productos");
    expect(validarFactura({ ...base, total: 12000 })).toContain("La suma de los productos no coincide con el total");
    expect(validarFactura({ ...base, subtotal: undefined })).toContain("La factura no tiene el desglose de IVA");
  });
});

describe("flujo con la DIAN simulada", () => {
  let producto;

  async function facturarCon(cliente) {
    let c = null;
    if (cliente?.legado) {
      // Cliente guardado antes de validar el NIT
      const { rows } = await db.query(
        "INSERT INTO clientes (business_id, nombre, documento) VALUES ($1, $2, $3) RETURNING id",
        [BUSINESS_ID, cliente.nombre, cliente.documento]
      );
      c = rows[0].id;
    } else if (cliente) {
      c = (await request(app).post("/api/clientes").set(auth).send(cliente)).body.id;
    }
    const venta = await request(app)
      .post("/api/ventas")
      .set(auth)
      .send({ cliente_id: c, payment_method: "efectivo", items: [{ producto_id: producto, cantidad: 1 }] });
    return request(app).post("/api/facturas").set(auth).send({ sale_id: venta.body.ticket.venta_id });
  }

  beforeAll(async () => {
    await resetDb();
    const { rows } = await db.query("SELECT id FROM productos WHERE business_id = $1 LIMIT 1", [BUSINESS_ID]);
    producto = rows[0].id;
  });

  it("emite con CUFE de pruebas, queda pendiente y luego validada", async () => {
    const res = await facturarCon({ nombre: "Hotel Laureles", documento: "800197268-4" });
    expect(res.status).toBe(201);

    const factura = res.body.factura;
    expect(factura.status).toBe("pendiente");
    expect(factura.provider).toBe("simulado");
    expect(factura.dian_ambiente).toBe("2");
    expect(factura.cufe).toMatch(/^[0-9a-f]{96}$/);
    expect(factura.cufe).toBe(
      calcularCufe(datosCufe(factura, { claveTecnica: env.dian.claveTecnica, tipoAmbiente: "2", timezone: env.timezone }))
    );

    const consulta = await request(app).post(`/api/facturas/${factura.id}/consultar-estado`).set(auth);
    expect(consulta.status).toBe(200);
    expect(consulta.body.factura.status).toBe("validada");
    expect(consulta.body.factura.dian_respuesta.validada_at).toBeTruthy();
  });

  it("sigue pendiente mientras la DIAN no ha terminado", async () => {
    const original = env.dian.simSegundos;
    env.dian.simSegundos = 60;
    const enviada = await proveedorSimulado.enviar({
      prefijo: "FE",
      numero: 99,
      created_at: new Date(),
      dian_payload: { emisor: { nit: "901234567-7" }, cliente: { documento: "222222222222" }, items: [{ subtotal: 100 }], subtotal: 100, total_iva: 0, total: 100 }
    });
    const estado = await proveedorSimulado.consultar({ status: "pendiente", dian_respuesta: enviada.respuesta });
    env.dian.simSegundos = original;
    expect(estado.status).toBe("pendiente");
  });

  it("rechaza si el NIT del cliente tiene el DV mal y explica el motivo", async () => {
    const res = await facturarCon({ nombre: "Empresa Mal Digitada", documento: "900111222-3", legado: true });
    expect(res.status).toBe(201);
    expect(res.body.factura.status).toBe("rechazada");
    expect(res.body.factura.cufe).toBeNull();
    expect(res.body.message).toContain("NIT del adquirente invalido");

    const lista = await request(app).get("/api/facturas").set(auth);
    const enLista = lista.body.facturas.find((f) => f.id === res.body.factura.id);
    expect(enLista.dian_mensajes[0]).toContain("NIT del adquirente invalido");

    const consulta = await request(app).post(`/api/facturas/${res.body.factura.id}/consultar-estado`).set(auth);
    expect(consulta.body.factura.status).toBe("rechazada");
  });

  it("no deja enviar por correo una factura rechazada", async () => {
    const res = await facturarCon({ nombre: "Otra Mal Digitada", documento: "900111222-5", legado: true });
    const envio = await request(app)
      .post(`/api/facturas/${res.body.factura.id}/enviar`)
      .set(auth)
      .send({ correo: "alguien@correo.co" });
    expect(envio.status).toBe(409);
  });

  it("el PDF de una factura con CUFE se genera", async () => {
    const res = await facturarCon(null);
    const pdf = await request(app).get(`/api/facturas/${res.body.factura.id}/pdf`).set(auth);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
  });
});

describe("NIT validado en origen", () => {
  beforeAll(resetDb);

  it("no deja crear ni editar clientes con DV equivocado y sugiere el correcto", async () => {
    const malo = await request(app).post("/api/clientes").set(auth).send({ nombre: "X SAS", documento: "800197268-5" });
    expect(malo.status).toBe(400);
    expect(malo.body.error).toBe("NIT invalido: el digito de verificacion de 800197268 es 4");

    const bueno = await request(app).post("/api/clientes").set(auth).send({ nombre: "X SAS", documento: "800197268-4" });
    expect(bueno.status).toBe(201);

    const cedula = await request(app).post("/api/clientes").set(auth).send({ nombre: "Ana", documento: "43123456" });
    expect(cedula.status).toBe(201);

    const editar = await request(app)
      .put(`/api/clientes/${bueno.body.id}`)
      .set(auth)
      .send({ nombre: "X SAS", documento: "800197268-9" });
    expect(editar.status).toBe(400);
  });

  it("no deja registrar un negocio con NIT invalido", async () => {
    const res = await request(app).post("/api/auth/register").send({
      businessName: "Tienda Nueva",
      nit: "900111222-3",
      address: "Calle 1 #2-3",
      phone: "3001234567",
      ownerName: "Dueno",
      email: "nuevo@tienda.co",
      password: "clave12345"
    });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].mensaje).toBe("NIT invalido: el digito de verificacion de 900111222 es 1");
  });
});
