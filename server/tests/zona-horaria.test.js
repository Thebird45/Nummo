import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { BUSINESS_ID, USER_ID, db, resetDb, resetSchemaOnly, tokenFor } from "./helpers/testDb.js";

const auth = { Authorization: `Bearer ${tokenFor()}` };

// 17 oct 2026, 10:30 p. m. en Bogota = 18 oct, 03:30 UTC
const NOCHE_BOGOTA = "2026-10-18T03:30:00.000Z";

async function insertarVenta(createdAt, total = 1000) {
  const { rows } = await db.query(
    `INSERT INTO sales (business_id, seller_id, payment_method, total, created_at)
     VALUES ($1, $2, 'efectivo', $3, $4) RETURNING id`,
    [BUSINESS_ID, USER_ID, total, createdAt]
  );
  return rows[0].id;
}

describe("zona horaria", () => {
  beforeAll(resetDb);

  it("el proceso de pruebas corre en hora de Colombia", () => {
    expect(new Date(2026, 9, 17).getTimezoneOffset()).toBe(300);
  });

  it("las fechas se devuelven con el instante exacto", async () => {
    const id = await insertarVenta(NOCHE_BOGOTA);
    const res = await request(app).get("/api/ventas").set(auth);
    const venta = res.body.sales.find((s) => s.id === id);
    expect(venta.created_at).toBe(NOCHE_BOGOTA);
  });

  it("reportes ubica una venta nocturna en el dia de Colombia", async () => {
    const { rows } = await db.query("SELECT id FROM productos WHERE business_id = $1 LIMIT 1", [BUSINESS_ID]);
    const venta = await request(app)
      .post("/api/ventas")
      .set(auth)
      .send({ payment_method: "efectivo", items: [{ producto_id: rows[0].id, cantidad: 1 }] });
    const id = venta.body.ticket.venta_id;
    await db.query("UPDATE sales SET created_at = $1 WHERE id = $2", [NOCHE_BOGOTA, id]);

    const reporte = (inicio, fin) =>
      request(app).get("/api/reportes").query({ inicio, fin }).set(auth);
    const dia17 = await reporte("2026-10-17T05:00:00.000Z", "2026-10-18T04:59:59.999Z");
    const dia18 = await reporte("2026-10-18T05:00:00.000Z", "2026-10-19T04:59:59.999Z");

    expect(dia17.body.ventas.map((v) => v.id)).toContain(id);
    expect(dia18.body.ventas.map((v) => v.id)).not.toContain(id);
  });

  it("'hoy' en el dashboard empieza a la medianoche de Colombia", async () => {
    const antes = (await request(app).get("/api/dashboard").set(auth)).body.summary.ventasHoy;

    const { rows } = await db.query(
      "SELECT date_trunc('day', NOW() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota' AS medianoche"
    );
    const medianoche = new Date(rows[0].medianoche);
    await insertarVenta(new Date(medianoche.getTime() + 60_000)); // 12:01 a. m. de hoy
    await insertarVenta(new Date(medianoche.getTime() - 60_000)); // 11:59 p. m. de ayer

    const despues = (await request(app).get("/api/dashboard").set(auth)).body.summary.ventasHoy;
    expect(despues).toBe(antes + 1);
  });

  it("el schema convierte columnas TIMESTAMP antiguas sin mover la hora", async () => {
    await db.exec(`
      CREATE TABLE legado (creado TIMESTAMP);
      SET TIME ZONE 'UTC';
      INSERT INTO legado VALUES ('2026-10-18 03:30:00');
      SET TIME ZONE 'America/Bogota';
    `);

    await resetSchemaOnly();
    await resetSchemaOnly(); // correrlo dos veces no debe correr la hora

    const { rows } = await db.query(
      "SELECT creado, data_type FROM legado, information_schema.columns WHERE table_name = 'legado'"
    );
    expect(rows[0].data_type).toBe("timestamp with time zone");
    expect(new Date(rows[0].creado).toISOString()).toBe(NOCHE_BOGOTA);
  });
});
